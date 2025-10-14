const cron = require('node-cron');
const Book = require('../models/Book');
const { sendToTokens } = require('../utils/pushNotifications'); // your Firebase utils
const Admin = require('../models/Admin');
const sendReminderEmail = require('../utils/sendReminderEmail');

// Cron function to check service expirations and send reminders
const checkExpirations = async () => {
    const now = new Date();

    try {
        // Find all paid bookings whose service end date is not yet passed
        const bookings = await Book.find({
            status: 'paid',
            serviceEndDate: { $gte: now }
        }).populate('user');

        for (const booking of bookings) {
            const daysLeft = Math.ceil((booking.serviceEndDate - now) / (1000 * 60 * 60 * 24));

            // 1️⃣ Send reminder 3 days before expiration if not sent already
            if (daysLeft === 3 && !booking.reminderSent) {
                const user = booking.user;
                if (!user) {
                    console.error(`User not found for booking ${booking._id}`);
                    continue;
                }

                // Send email
                await sendReminderEmail({
                    name: user.fullname,
                    email: user.email
                });

                // Notify admins
                const admins = await Admin.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
                const adminTokens = admins.flatMap(a => a.fcmTokens);

                if (adminTokens.length) {
                    await sendToTokens(
                        adminTokens,
                        'Service Expiration Reminder',
                        `Booking for ${user.fullname} expires in 3 days.`,
                        { bookingId: booking._id.toString() }
                    );
                }

                booking.reminderSent = true;
                await booking.save();
            }

            // 2️⃣ Expire service if date passed
            if (now >= booking.serviceEndDate) {
                booking.status = 'expired';
                await booking.save();
            }
        }
    } catch (err) {
        console.error('Error in checkExpirations cron:', err.message);
    }
};

// Example: run every day at 12am
cron.schedule('0 0 * * *', () => {
    console.log('Running service expiration check...');
    checkExpirations();
});

module.exports = checkExpirations;
