const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { sendToTokens } = require('./pushNotifications');
const sendRideRegistrationEmail = require('./sendRegistrationEmail');
const sendRenewalEmail = require('./sendRenewalEmail');
const Book = require('../models/Book');
const Admin = require('../models/Admin');
const endpointSecret = process.env.ENDPOINT_SECRET_PROD;

const { RideType, TripType, ScheduleType, BookingStatus, DaysOfWeek} = require('../utils/bookingEnum')


const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // req.rawBody
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`⚠️ Webhook signature verification failed: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const intent = event.data.object;
                const bookingId = intent.metadata.bookingId;
                const paymentType = intent.metadata.type || 'new'; // 'new' or 'renewal'

                const booking = await Book.findById(bookingId).populate('user child');
                if (!booking) break;

                // 🔹 Update booking status and serviceEndDate
                booking.status = BookingStatus.PAID;
                booking.reminderSent = false;

                let newServiceEndDate = booking.serviceEndDate ? new Date(booking.serviceEndDate) : new Date();
                if (booking.schedule_type === 'custom') {
                    newServiceEndDate.setDate(newServiceEndDate.getDate() + booking.number_of_days);
                } else if (booking.schedule_type === '2 weeks') {
                    newServiceEndDate.setDate(newServiceEndDate.getDate() + 14);
                } else if (booking.schedule_type === '1 month') {
                    newServiceEndDate.setMonth(newServiceEndDate.getMonth() + 1);
                }

                booking.serviceEndDate = newServiceEndDate;
                await booking.save();

                // 🔔 Notify user via push
                if (booking.user.fcmTokens?.length) {
                    await sendToTokens(
                        booking.user.fcmTokens,
                        paymentType === 'renewal' ? 'Booking Renewed' : 'Payment Successful',
                        paymentType === 'renewal'
                            ? `Your booking for ${booking.child.fullname} has been successfully renewed.`
                            : `Your payment for ${booking.child.fullname}'s ride was successful.`,
                        { bookingId: booking._id.toString() }
                    );
                }

                // 📧 Send email
                try {
                    if (paymentType === 'renewal') {
                        await sendRenewalEmail({
                            name: booking.user.fullname,
                            email: booking.user.email,
                            newEndDate: booking.serviceEndDate.toDateString(),
                            bookingId: booking._id.toString()
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
                    console.error('Error sending email:', err.message);
                }

                // 🔔 Notify admins
                const admins = await Admin.find({ role: 'admin', fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
                const adminTokens = admins.flatMap(a => a.fcmTokens);
                if (adminTokens.length) {
                    await sendToTokens(
                        adminTokens,
                        paymentType === 'renewal' ? 'Booking Renewed' : 'Payment Received',
                        paymentType === 'renewal'
                            ? `Booking ${booking._id} for ${booking.child.fullname} has been renewed.`
                            : `Payment received for booking ${booking._id} (${booking.child.fullname}).`,
                        { bookingId: booking._id.toString() }
                    );
                }

                break;
            }

            case 'payment_intent.payment_failed': {
                const intent = event.data.object;
                const bookingId = intent.metadata.bookingId;
                const booking = await Book.findByIdAndUpdate(bookingId, { status: BookingStatus.FAILED }).populate('user child');
                
                if (booking?.user?.fcmTokens?.length) {
                    await sendToTokens(
                        booking.user.fcmTokens,
                        'Payment Failed',
                        `Your payment for ${booking.child.fullname}'s ride failed. Please retry.`,
                        { bookingId: booking._id.toString() }
                    );
                }

                const admins = await Admin.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
                const adminTokens = admins.flatMap(a => a.fcmTokens);
                if (adminTokens.length) {
                    await sendToTokens(
                        adminTokens,
                        'Payment Failed',
                        `Payment failed for booking ${booking._id} (${booking.child.fullname}).`,
                        { bookingId: booking._id.toString() }
                    );
                }
                break;
            }

            case 'payment_intent.canceled': {
                const intent = event.data.object;
                const bookingId = intent.metadata.bookingId;
                await Book.findByIdAndUpdate(bookingId, { status: BookingStatus.CANCELLED });
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Webhook Handler Error:', err);
        res.status(500).json({ error: 'Internal webhook error' });
    }
};

module.exports = stripeWebhook;