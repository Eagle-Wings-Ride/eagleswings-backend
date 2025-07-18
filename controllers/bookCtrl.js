const { Model } = require('mongoose')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Book = require('../models/Book')
const Child = require('../models/Child')
// Enums
const { RideType, TripType, ScheduleType, BookingStatus, DaysOfWeek} = require('../utils/bookingEnum')


// Book ride
const bookRide = async (req, res) => {
    const {id: childId} = req.params

    const {
        ride_type,
        trip_type,
        schedule_type,
        number_of_days,
        pickup_days,
        start_date,
        morning_from,
        morning_to,
        morning_time,
        afternoon_from,
        afternoon_to,
        afternoon_time,
        start_latitude,
        start_longitude,
        end_latitude,
        end_longitude
    } = req.body;

    try {
        // Validate enums
        if (!Object.values(RideType).includes(ride_type)) {
            return res.status(400).json({ message: 'Invalid ride type. Valid values are: freelance, inhouse.' });
        }
        if (!Object.values(TripType).includes(trip_type)) {
            return res.status(400).json({ message: 'Invalid trip type. Valid values are: return, one-way.' });
        }
        if (!Object.values(ScheduleType).includes(schedule_type)) {
            return res.status(400).json({ message: 'Invalid schedule type. Valid values are: 2 weeks, 1 month, custom.' });
        }

        // Check to make sure only when schedule is custom can number of days be entered

        if (schedule_type === 'custom') {
            if (!number_of_days || number_of_days <= 0) {
                return res.status(400).json({
                message: 'number_of_days is required and must be greater than 0 when schedule_type is custom.',
                });
            }
        } else {
            if (number_of_days !== undefined) {
                return res.status(400).json({
                message: 'number_of_days should only be provided when schedule_type is custom.',
                });
            }
        }

        const isValidDays = Array.isArray(pickup_days) && pickup_days.every(day => 
            Object.values(DaysOfWeek).includes(day))

        if (!isValidDays) {
            return res.status(400).json({ message: 'Invalid pickup days. Valid values are: Sunday to Saturday.' });
        }

        // Check if the child belongs to the user
        const childRecord = await Child.findById(childId);
        if (!childRecord || childRecord.user.toString() !== req.user.userId.toString()) {
            return res.status(400).json({ message: "Child not found or does not belong to this user" });
        }

         // Prevent duplicate unpaid bookings for the same child
        const existing = await Book.findOne({ child: childId, status: BookingStatus.BOOKED });
        if (existing) return res.status(400).json({ message: "A pending booking already exists for this child" });

        // Get mapped addresses from child based on selections
        const getAddress = (label) => {
            if (label === 'home') return childRecord.home_address;
            if (label === 'school') return childRecord.school_address;
            if (label === 'daycare') return childRecord.daycare_address;
            return null;
        }

        // Create booking
        const booking = new Book({
            ride_type,
            trip_type,
            schedule_type,
            number_of_days,
            pickup_days,
            start_date,

            morning_from,
            morning_to,
            morning_time,
            morning_from_address: getAddress(morning_from),
            morning_to_address: getAddress(morning_to),

            afternoon_from,
            afternoon_to,
            afternoon_time,
            afternoon_from_address: getAddress(afternoon_from),
            afternoon_to_address: getAddress(afternoon_to),
            
            start_latitude,
            start_longitude,
            end_latitude,
            end_longitude,

            user: req.user.userId,
            child: childId,
            status: BookingStatus.BOOKED
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

// Make Payment (still in works)
const makePayment = async (req, res) => {
    const { bookingId, paymentMethodId, currency } = req.body;

    if (!['usd', 'cad'].includes(currency)) {
        return res.status(400).json({ message: 'Invalid currency. Only USD and CAD are supported.' });
    }

    try {
        const booking = await Book.findById(bookingId);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user.toString() !== req.user.userId)
            return res.status(403).json({ message: 'Unauthorized access' });

        if (![BookingStatus.BOOKED, BookingStatus.FAILED].includes(booking.status))
            return res.status(400).json({ message: 'Booking is not eligible for payment' });

        // Rates
        const DAILY_RATE = process.env.DAILY_RATE;
        const BI_WEEKLY_RATE = process.env.BI_WEEKLY_RATE;
        const MONTHLY_RATE = process.env.MONTHLY_RATE;

        let calculatedAmount = 0;

        switch (booking.schedule_type) {
            case 'custom':
                if (!booking.number_of_days || booking.number_of_days <= 0) {
                    return res.status(400).json({ message: 'Invalid number of days for custom schedule' });
                }
                calculatedAmount = DAILY_RATE * booking.number_of_days;
                break;

            case '2 weeks':
                calculatedAmount = BI_WEEKLY_RATE;
                break;

            case '1 month':
                calculatedAmount = MONTHLY_RATE;
                break;

            default:
                return res.status(400).json({ message: 'Invalid schedule type' });
        }

        const amountInCents = Math.round(calculatedAmount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            payment_method: paymentMethodId,
            confirm: true,
            metadata: {
                bookingId: bookingId,
                userId: req.user.userId,
            },
        });

        res.status(200).json({
            message: 'Payment processing started.',
            client_secret: paymentIntent.client_secret,
        });

    } catch (error) {
        await Book.findByIdAndUpdate(bookingId, { status: BookingStatus.FAILED });
        res.status(500).json({
            message: 'Payment failed. Please try again later.',
            error: error.message,
        });
    }
};



// find all rides created by the user
const getRidesByUser = async (req, res) => {
    const userId = req.user.userId

    try {
        const rides = await Book.find({ user: userId })
            .populate('child', 'fullname image grade age trip_type school')
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
            .populate('child', 'fullname image grade age trip_type school') // Fetch specific fields from child
            .populate('drivers', 'fullname image status') // Fetch specific fields from drivers


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
            .populate('child', 'fullname image grade age trip_type school')
            .populate('drivers', 'fullname image status ')
    
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