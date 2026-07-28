const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { sendToTokens } = require("./pushNotifications");
const sendRideRegistrationEmail = require("./sendRegistrationEmail");
const sendRenewalEmail = require("./sendRenewalEmail");

const Book = require("../models/Bookings");
const Admin = require("../models/Admin");
const BookingRenewalHistory = require("../models/bookingHistory");
const StripeEvent = require("../models/stripeEvent");

const { BookingStatus } = require("../utils/bookingEnum");
const { calculateBookingAmount } = require("../utils/helpers/book.helpers");
const { calculateServiceDates } = require("../utils/helpers/schedule.helpers");

const endpointSecret = process.env.ENDPOINT_SECRET_PROD;

const DAY = 24 * 60 * 60 * 1000;

// STRIPE WEBHOOK CONTROLLER

const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  // 1️⃣ Verify Stripe signature
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send("Invalid webhook signature");
  }

  // 2️⃣ Idempotency protection (atomic lock)
  try {
    const existingEvent = await StripeEvent.findOneAndUpdate(
      { eventId: event.id },
      { eventId: event.id },
      { upsert: true, new: false },
    );

    if (existingEvent) {
      return res.json({ received: true });
    }
  } catch (err) {
    console.error("❌ Idempotency lock failed:", err);
    return res.status(500).json({ error: "Webhook idempotency failure" });
  }

  // 3️⃣ Respond to Stripe immediately (PREVENT TIMEOUT)
  res.json({ received: true });

  // 4️⃣ Process event asynchronously
  processStripeEvent(event).catch((err) => {
    console.error("❌ Async webhook processing error:", err);
  });
};

//STRIPE EVENT PROCESSOR

const processStripeEvent = async (event) => {
  switch (event.type) {
    // PAYMENT SUCCESS
    case "checkout.session.completed": {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      const paymentType = session.metadata?.type || "new";

      if (!bookingId) return;
      if (session.payment_status !== "paid") return;

      const booking = await Book.findById(bookingId).populate("user child");
      if (!booking) return;

      // 🔎 Verify amount
      const expectedAmount = await calculateBookingAmount(booking);
      const paidAmount = session.amount_total / 100;

      if (paidAmount !== expectedAmount) {
        console.error(
          `❌ Amount mismatch for booking ${bookingId}. Expected ${expectedAmount}, Paid ${paidAmount}`,
        );
        return;
      }

      if (paymentType === "new" && booking.status === BookingStatus.PAID)
        return;

      booking.status = BookingStatus.PAID;
      booking.reminderSent = false;

      // ---------------- SERVICE DATES ----------------

      // New booking uses the parent's chosen start date.
      // Renewal starts the day after the previous service ends.

      let calculatedStartDate;

      if (paymentType === "renewal") {
        calculatedStartDate =
          booking.serviceEndDate && booking.serviceEndDate > new Date()
            ? new Date(booking.serviceEndDate.getTime() + DAY)
            : new Date();
      } else {
        calculatedStartDate = booking.start_date;
      }

      const { serviceStartDate, serviceEndDate } = calculateServiceDates(
        booking,
        calculatedStartDate,
      );

      const previousStartDate = booking.start_date;
      const previousEndDate = booking.serviceEndDate;

      
      booking.serviceStartDate = serviceStartDate;
      booking.serviceEndDate = serviceEndDate;
      booking.reminderSent = false;

      // Renewal History
      if (paymentType === "renewal") {
        await BookingRenewalHistory.create({
          booking: booking._id,
          user: booking.user._id,
          child: booking.child._id,
          previousStartDate,
          previousEndDate,
          newStartDate: serviceStartDate,
          newEndDate: serviceEndDate,
          paymentId: session.id,
          amount: paidAmount,
        });
      }

      await booking.save();

      // User Notifications
      if (booking.user?.fcmTokens?.length) {
        try {
          await sendToTokens(
            booking.user.fcmTokens,
            paymentType === "renewal"
              ? "Booking Renewed"
              : "Payment Successful",
            paymentType === "renewal"
              ? `Your booking for ${booking.child.fullname} has been successfully renewed.`
              : `Your payment for ${booking.child.fullname}'s ride was successful.`,
            { bookingId: booking._id.toString() },
          );
        } catch (err) {
          console.error("User push failed:", err.message);
        }
      }

      // Emails
      try {
        if (paymentType === "renewal") {
          await sendRenewalEmail({
            name: booking.user.fullname,
            email: booking.user.email,
            newEndDate: serviceEndDate.toDateString(),
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

      // Admin Notifications
      const admins = await Admin.find({
        role: "admin",
        fcmTokens: { $exists: true, $ne: [] },
      }).select("fcmTokens");

      const adminTokens = admins.flatMap((a) => a.fcmTokens);

      if (adminTokens.length) {
        try {
          await sendToTokens(
            adminTokens,
            paymentType === "renewal" ? "Booking Renewed" : "Payment Received",
            paymentType === "renewal"
              ? `Booking ${booking._id} for ${booking.child.fullname} has been renewed.`
              : `Payment received for booking ${booking._id} (${booking.child.fullname}).`,
            { bookingId: booking._id.toString() },
          );
        } catch (err) {
          console.error("Admin push failed:", err.message);
        }
      }

      break;
    }

    // PAYMENT FAILED
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) return;

      const booking = await Book.findByIdAndUpdate(
        bookingId,
        { status: BookingStatus.FAILED },
        { new: true },
      ).populate("user child");

      if (!booking) return;

      if (booking.user?.fcmTokens?.length) {
        try {
          await sendToTokens(
            booking.user.fcmTokens,
            "Payment Failed",
            `Your payment for ${booking.child.fullname}'s ride failed. Please retry.`,
            { bookingId: booking._id.toString() },
          );
        } catch (err) {
          console.error("User failure push failed:", err.message);
        }
      }

      const admins = await Admin.find({
        role: "admin",
        fcmTokens: { $exists: true, $ne: [] },
      }).select("fcmTokens");

      const adminTokens = admins.flatMap((a) => a.fcmTokens);

      if (adminTokens.length) {
        try {
          await sendToTokens(
            adminTokens,
            "Payment Failed",
            `Payment failed for booking ${booking._id} (${booking.child.fullname}).`,
            { bookingId: booking._id.toString() },
          );
        } catch (err) {
          console.error("Admin failure push failed:", err.message);
        }
      }

      break;
    }

    default:
      console.log("Unhandled Stripe event:", event.type);
  }
};

module.exports = stripeWebhook;
