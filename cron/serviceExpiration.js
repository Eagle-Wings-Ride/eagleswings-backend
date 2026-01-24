const Book = require("../models/Book");
const Admin = require("../models/Admin");
const { sendToTokens } = require("../utils/pushNotifications");
const sendReminderEmail = require("../utils/sendReminderEmail");

const DAY = 1000 * 60 * 60 * 24;

const checkExpirations = async () => {
  const now = new Date();
  console.log("[CRON] Checking service expirations at", now.toISOString());

  try {
    const bookings = await Book.find({ status: "paid" }).populate("user");
    const admins = await Admin.find({ fcmTokens: { $exists: true, $ne: [] } }).select("fcmTokens");
    const tokens = admins.flatMap(a => a.fcmTokens);

    for (const booking of bookings) {
      if (!booking.serviceEndDate || !booking.user) continue;

      const daysLeft = Math.ceil((booking.serviceEndDate - now) / DAY);

      // Production-safe logging
      console.log(`[CRON] Booking ${booking._id} | daysLeft: ${daysLeft} | reminderSent: ${booking.reminderSent}`);

      // Dev-only logging (uncomment if needed locally)
      /*
      if (process.env.NODE_ENV !== "production") {
        console.log(`[CRON-DEV] Booking ${booking._id} | User: ${booking.user.fullname} | daysLeft: ${daysLeft} | reminderSent: ${booking.reminderSent}`);
      }*/
      

      let modified = false;

      // 🔔 Send reminder
      if (daysLeft <= 3 && daysLeft > 0 && !booking.reminderSent) {
        try {
          await sendReminderEmail({ name: booking.user.fullname, email: booking.user.email });

          if (tokens.length) {
            await sendToTokens(tokens, "Service Expiration Reminder", 
              `Booking expires in ${daysLeft} day(s).`, 
              { bookingId: booking._id.toString() }
            );
          }

          booking.reminderSent = true;
          modified = true;

          console.log(`[CRON] Reminder sent for booking ${booking._id}`);
        } catch (err) {
          console.error(`[CRON] Failed sending reminder for booking ${booking._id}`, err);
        }
      }

      // ⛔ Expire service
      if (daysLeft <= 0 && booking.status !== "expired") {
        booking.status = "expired";
        modified = true;
        console.log(`[CRON] Booking expired ${booking._id}`);
      }

      if (modified) await booking.save();
    }
  } catch (err) {
    console.error("[CRON] Fatal error:", err);
    throw err;
  }
};

module.exports = checkExpirations;
