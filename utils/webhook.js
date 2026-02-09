const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { sendToTokens } = require("./pushNotifications");
const sendRideRegistrationEmail = require("./sendRegistrationEmail");
const sendRenewalEmail = require("./sendRenewalEmail");

const Book = require("../models/Book");
const Admin = require("../models/Admin");
const StripeEvent = require("../models/stripeEvent");

const { BookingStatus } = require("../utils/bookingEnum");

const endpointSecret = process.env.ENDPOINT_SECRET_PROD;

const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  /**
   * 1️⃣ Verify Stripe webhook signature
   * Prevents forged requests
   */
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send("Invalid webhook signature");
  }

  /**
   * 2️⃣ Atomic idempotency lock
   * Guarantees one-time execution per Stripe event
   */
  try {
    const existingEvent = await StripeEvent.findOneAndUpdate(
      { eventId: event.id },
      { eventId: event.id },
      { upsert: true, new: false }
    );

    if (existingEvent) {
      return res.json({ received: true });
    }
  } catch (err) {
    console.error("Idempotency lock failed:", err);
    return res.status(500).json({ error: "Webhook idempotency failure" });
  }

  try {
    switch (event.type) {
      /**
       * ============================
       * PAYMENT SUCCESS
       * ============================
       */
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status !== "paid") break;

        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        const paymentType = session.metadata?.type || "new";

        const booking = await Book.findById(bookingId).populate("user child");
        if (!booking) break;

        // Prevent double payment
        if (booking.status === BookingStatus.PAID) break;

        booking.status = BookingStatus.PAID;
        booking.reminderSent = false;

        /**
         * Service end date calculation
         */
        let newServiceEndDate = booking.serviceEndDate
          ? new Date(booking.serviceEndDate)
          : new Date();

        if (booking.schedule_type === "custom") {
          newServiceEndDate.setDate(
            newServiceEndDate.getDate() + booking.number_of_days
          );
        } else if (booking.schedule_type === "2 weeks") {
          newServiceEndDate.setDate(newServiceEndDate.getDate() + 14);
        } else if (booking.schedule_type === "1 month") {
          newServiceEndDate.setMonth(newServiceEndDate.getMonth() + 1);
        }

        booking.serviceEndDate = newServiceEndDate;
        await booking.save();

        /**
         * User push notification
         */
        if (booking.user?.fcmTokens?.length) {
          await sendToTokens(
            booking.user.fcmTokens,
            paymentType === "renewal"
              ? "Booking Renewed"
              : "Payment Successful",
            paymentType === "renewal"
              ? `Your booking for ${booking.child.fullname} has been successfully renewed.`
              : `Your payment for ${booking.child.fullname}'s ride was successful.`,
            { bookingId: booking._id.toString() }
          );
        }

        /**
         * Email notification
         */
        try {
          if (paymentType === "renewal") {
            await sendRenewalEmail({
              name: booking.user.fullname,
              email: booking.user.email,
              newEndDate: booking.serviceEndDate.toDateString(),
              bookingId: booking._id.toString(),
            });
          } else {
            await sendRideRegistrationEmail({
              name: booking.user.fullname,
              email: booking.user.email,
              childName: booking.child.fullname,
              tripType: booking.trip_type,
              scheduleType: booking.schedule_type,
            });
          }
        } catch (err) {
          console.error("Email sending failed:", err.message);
        }

        /**
         * Admin notifications
         */
        const admins = await Admin.find({
          role: "admin",
          fcmTokens: { $exists: true, $ne: [] },
        }).select("fcmTokens");

        const adminTokens = admins.flatMap((a) => a.fcmTokens);

        if (adminTokens.length) {
          await sendToTokens(
            adminTokens,
            paymentType === "renewal"
              ? "Booking Renewed"
              : "Payment Received",
            paymentType === "renewal"
              ? `Booking ${booking._id} for ${booking.child.fullname} has been renewed.`
              : `Payment received for booking ${booking._id} (${booking.child.fullname}).`,
            { bookingId: booking._id.toString() }
          );
        }

        break;
      }

      /**
       * ============================
       * PAYMENT FAILED / EXPIRED
       * ============================
       */
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        const booking = await Book.findByIdAndUpdate(
          bookingId,
          { status: BookingStatus.FAILED },
          { new: true }
        ).populate("user child");

        if (booking?.user?.fcmTokens?.length) {
          await sendToTokens(
            booking.user.fcmTokens,
            "Payment Failed",
            `Your payment for ${booking.child.fullname}'s ride failed. Please retry.`,
            { bookingId: booking._id.toString() }
          );
        }

        break;
      }

      default:
        console.log("Unhandled Stripe event:", event.type);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook handler error" });
  }
};

module.exports = stripeWebhook;
