const { Model } = require('mongoose')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Book = require('../models/Book')
const Child = require('../models/Child')

// Enums

const RideType = {
    FREELANCE: 'freelance',
    INHOUSE: 'inhouse',
};

const TripType = {
    RETURN: 'return',
    ONE_WAY: 'one-way',
};

const ScheduleType = {
    TWO_WEEKS: '2 weeks',
    ONE_MONTH: '1 month',
};

const BookingStatus = {
    BOOKED: 'booked',
    ONGOING: 'ongoing',
    PAID:'paid',
    ASSIGNED: 'assigned',
    FAILED: 'payment_failed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Book ride
const bookRide = async (req, res) => {
    const {id: childId} = req.params

    const {
        pick_up_location,
        drop_off_location,
        ride_type,
        trip_type,
        schedule,
        start_date,
        pick_up_time,
        drop_off_time,
        start_latitude,
        start_longitude,
        end_latitude,
        end_longitude,
        
    } = req.body;

    try {
        // Validate enums
        if (!Object.values(RideType).includes(ride_type)) {
            return res.status(400).json({ message: 'Invalid ride type. Valid values are: freelance, inhouse.' });
        }
        if (!Object.values(TripType).includes(trip_type)) {
            return res.status(400).json({ message: 'Invalid trip type. Valid values are: return, one-way.' });
        }
        if (!Object.values(ScheduleType).includes(schedule)) {
            return res.status(400).json({ message: 'Invalid schedule type. Valid values are: 2 weeks, 1 month.' });
        }

        // Check if the child belongs to the user
        const childRecord = await Child.findById(childId);
        if (!childRecord || childRecord.user.toString() !== req.user.userId.toString()) {
            return res.status(400).json({ message: "Child not found or does not belong to this user" });
        }

         // Prevent duplicate unpaid bookings for the same child
        const existing = await Book.findOne({ child: childId, status: BookingStatus.BOOKED });
        if (existing) return res.status(400).json({ message: "A pending booking already exists for this child" });

        // Create booking
        const booking = new Book({
            pick_up_location,
            drop_off_location,
            ride_type,
            trip_type,
            schedule,
            start_date,
            pick_up_time,
            drop_off_time,
            status: BookingStatus.BOOKED,
            user: req.user.userId,
            child: childId,
            start_latitude,
            start_longitude,
            end_latitude,
            end_longitude
        });
        
        await booking.save();

        res.status(201).json({
            message: 'Ride booked successfully, proceed to make payment',
            booking,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while booking the ride.', error: error.message });
    }
}

// Make Payment (still in works 80% ready)
const makePayment = async (req, res) => {
    const { bookingId, paymentMethodId, amount, currency } = req.body;
  
    // Validate currency
    if (!['usd', 'cad'].includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency. Only USD and CAD are supported.' });
    }
  
    try {
        const booking = await Book.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
    
        // Check if user is the owner of the booking
        if (booking.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized access to booking' });
        }
    
        // Only allow payment if status is BOOKED or FAILED
        if (![BookingStatus.BOOKED, BookingStatus.FAILED].includes(booking.status)) {
            return res.status(400).json({ message: 'Payment not allowed for this booking status' });
        }
    
        // Convert amount to cents
        const amountInCents = Math.round(amount * 100);
    
        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never',
            },
        })
    
        // Payment succeeded — update booking status
        await Book.findByIdAndUpdate(bookingId, { status: BookingStatus.PAID })
    
        res.status(200).json({
            message: 'Payment successful. A driver will be assigned shortly.',
            client_secret: paymentIntent.client_secret,
        });
    } catch (error) {
        // Payment failed — update status to FAILED
        await Book.findByIdAndUpdate(bookingId, { status: BookingStatus.FAILED });
    
        res.status(500).json({
            message: 'Payment failed. Please try again shortly.',
            error: error.message,
        })
    }
}

// find all rides created by the user
const getRidesByUser = async (req, res) => {
    const userId = req.user.userId

    try {
        const rides = await Book.find({ user: userId }).populate('child')
        res.status(200).json({ rides })
    } catch (err) {
        res.status(500).json({message: 'Error getting Rides', error: err.message })
    }
}

// get all rides by children 
const getRideByChild = async (req, res) => { 
    const {childId} = req.params

    try{
        const booking = await Book.find({child: childId}).populate('child')

        const isChildOwnedByUser = booking.every(booking => booking.user.toString() === req.user.userId.toString())

        if (!isChildOwnedByUser) {
            return res.status(403).json({ message: "Unauthorized: Child does not belong to this user" });
        }
        res.status(200).json(booking)
    }catch(err){
        res.status(500).json({ message: "Failed to get Rides", error: err.message })
    }
}

// get all rides
const getAllRides = async (req, res) => {
    try {
        const rides = await Book.find({})
            .populate('user', 'fullname address phone_number') // Fetch specific fields from users
            .populate('child', 'name image grade school') // Fetch specific fields from child
            .populate('driver', 'fullname image status') // Fetch specific fields from drivers

        res.status(200).json({ rides });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rides', error: error.message });
    }
}

// get recent rides
const getRecentRides = async (req, res) => {
    try {
        const {childId} = req.params
        const authenticatedUserId = req.user.userId

        if (!childId) {
            return res.status(400).json({ message: 'Child not found' })
        }

        const child = await Child.findOne({ _id: childId, user: authenticatedUserId })

        if (!child) {
            return res.status(403).json({ message: 'Child not found or registered under this user' })
        }

        const bookings = await Book.find({ child: childId })
            .sort({ createdAt: -1 })
            .populate('user', 'fullname email phone_number address')
            .populate('child', 'fullname school address grade age')
            .populate('driver', 'fullname image status ')
    
        res.status(200).json({ bookings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bookings', error: error.message })
    }
};


// get rides by status
const getRidesByStatus = async (req, res) => {
    try {
        const { childId, status } = req.params
        const authenticatedUserId = req.user.userId

        if (!childId) {
            return res.status(400).json({ message: 'Child not Found' })
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' })
        }

        const child = await Child.findOne({ _id: childId, user: authenticatedUserId });

        if (!child) {
            return res.status(403).json({ message: 'Child not registered under this user' });
        }

        const query = { 
            child: childId,
            status: { $regex: new RegExp(`^${status}$`, 'i') }
        }

        // Fetch rides
        const rides = await Book.find(query).sort({ createdAt: -1 })

        res.status(200).json({ rides })
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch rides', error: error.message })
    }
};

const updateRideStatus = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { status } = req.body;

        // Validate inputs
        if (!rideId) {
            return res.status(400).json({ message: 'Ride not found' });
        }

        if (!status) {
            return res.status(400).json({ message: 'New status is required' });
        }

        // Validate if the provided status is a valid BookingStatus
        if (!Object.values(BookingStatus).includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Allowed values are: ${Object.values(BookingStatus).join(', ')}`,
            });
        }

        // Find the ride and update its status
        const ride = await Book.findByIdAndUpdate(
            rideId,
            { status },
            { new: true, runValidators: true }
        );

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Respond with the updated ride
        res.status(200).json({
            message: 'Ride status updated successfully',
            ride,
        });
    } catch (error) {
        console.error('Error updating ride status:', error.message);
        res.status(500).json({
            message: 'Failed to update ride status',
            error: error.message,
        });
    }
};


module.exports = {
    bookRide,
    makePayment,
    getRidesByUser,
    getRideByChild,
    getAllRides,
    getRecentRides,
    getRidesByStatus,
    updateRideStatus
}