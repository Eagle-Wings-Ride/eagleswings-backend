const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`⚠️ Webhook signature verification failed: ${err.message}`);
    }

    try {
        switch (event.type) {
        case 'payment_intent.succeeded': {
            const intent = event.data.object;
            const bookingId = intent.metadata.bookingId;

            await Book.findByIdAndUpdate(bookingId, {
            status: BookingStatus.PAID,
            });

            break;
        }

        case 'payment_intent.payment_failed': {
            const intent = event.data.object;
            const bookingId = intent.metadata.bookingId;

            await Book.findByIdAndUpdate(bookingId, {
            status: BookingStatus.FAILED,
            });

            break;
        }

        case 'payment_intent.canceled': {
            const intent = event.data.object;
            const bookingId = intent.metadata.bookingId;
        
            await Book.findByIdAndUpdate(bookingId, {
                status: BookingStatus.CANCELLED, // make sure you have this status defined
            });
        
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