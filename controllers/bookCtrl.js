const { Model } = require('mongoose')
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
            return res.status(400).json({ error: "Child not found or does not belong to this user" });
        }

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
            child: childId
        });

        await booking.save();

        // to add payment here (payment before being booked successfully)

        res.status(201).json({
            message: 'Ride booked successfully.',
            booking,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while booking the ride.', error: error.message });
    }
};


// find all rides created by the user
const getRidesByUser = async (req, res) => {
    const userId = req.user.userId

    try {
        const rides = await Book.find({ user: userId }).populate('child')
        res.status(200).json({ rides })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// get all rides by children 
const getRideByChild = async (req, res) => { 
    const {childId} = req.params

    try{
        const booking = await Book.findOne({child: childId}).populate('child');

        if (!booking || booking.user.toString() !== req.user.userId.toString()) {
            return res.status(404).json({ error: "Ride not found for this child or unauthorized" });
        }
        res.status(200).json(booking)
    }catch(err){
        res.status(500).json({ error: err.message })
    }
}

// get all rides
const getAllRides = async (req, res) => {
    const rides = await Book.find({})
    res.status(200).json({rides})
}

// get recent rides
const getRecentRides = async (req, res) => {
    try {
        const {userId} = req.params

        if (!userId) {
            return res.status(400).json({ message: 'User not found' })
        }


        const bookings = await Book.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('user', 'fullname email phone_number address')
            .populate('child', 'fullname school address grade age');

        if (!bookings.length) {
            return res.status(404).json({ message: 'No bookings found for this user' })
        }
    
        res.status(200).json({ bookings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bookings', error: error.message })
    }
};

// get rides by status
const getRidesByStatus = async (req, res) => {
    try {
        const { userId, status } = req.params

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' })
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' })
        }

        const query = { user: userId, status: { $regex: new RegExp(`^${status}$`, 'i') } }

        // Fetch rides
        const rides = await Book.find(query).sort({ createdAt: -1 })

        if (!rides.length) {
            return res.status(404).json({ message: 'No rides found for this user with the specified status' })
        }

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
    getRidesByUser,
    getRideByChild,
    getAllRides,
    getRecentRides,
    getRidesByStatus,
    updateRideStatus
}