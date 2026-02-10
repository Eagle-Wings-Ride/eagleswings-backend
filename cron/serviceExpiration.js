const Book = require("../models/Book");
const Admin = require("../models/Admin");
const { sendToTokens } = require("../utils/pushNotifications");
const sendReminderEmail = require("../utils/sendReminderEmail");
const { BookingStatus } = require("../utils/bookingEnum");

const DAY = 1000 * 60 * 60 * 24;

const checkExpirations = async () => {
  const now = new Date();
  console.log("[CRON] Running service expiration check:", now.toISOString());

  // Only fetch relevant bookings
  const bookings = await Book.find({
    status: BookingStatus.PAID,
    serviceEndDate: { $exists: true },
  }).populate("user");

  const admins = await Admin.find({
    fcmTokens: { $exists: true, $ne: [] },
  }).select("fcmTokens");

  const tokens = admins.flatMap(a => a.fcmTokens);

  for (const booking of bookings) {
    if (!booking.user) continue;

    const daysLeft = Math.ceil(
      (booking.serviceEndDate.getTime() - now.getTime()) / DAY
    );

    console.log(
      `[CRON] Booking ${booking._id} | daysLeft=${daysLeft} | reminderSent=${booking.reminderSent}`
    );

    // 🔔 Send reminder (atomic)
    if (daysLeft <= 3 && daysLeft > 0) {
      const result = await Book.updateOne(
        { _id: booking._id, reminderSent: false },
        { $set: { reminderSent: true } }
      );

      if (result.modifiedCount === 1) {
        try {
          await sendReminderEmail({
            name: booking.user.fullname,
            email: booking.user.email,
          });

          if (tokens.length) {
            await sendToTokens(
              tokens,
              "Service Expiration Reminder",
              `Booking expires in ${daysLeft} day(s).`,
              { bookingId: booking._id.toString() }
            );
          }

          console.log(`[CRON] Reminder sent for booking ${booking._id}`);
        } catch (err) {
          console.error(
            `[CRON] Reminder failed for booking ${booking._id}`,
            err
          );

          // rollback reminderSent on failure
          await Book.updateOne(
            { _id: booking._id },
            { $set: { reminderSent: false } }
          );
        }
      }
    }

    // ⛔ Expire booking (atomic)
    if (daysLeft <= 0) {
      const result = await Book.updateOne(
        { _id: booking._id, status: BookingStatus.PAID },
        { $set: { status: BookingStatus.EXPIRED } }
      );

      if (result.modifiedCount === 1) {
        console.log(`[CRON] Booking expired ${booking._id}`);
      }
    }
  }

  console.log("[CRON] Service expiration check complete");
};

module.exports = checkExpirations;