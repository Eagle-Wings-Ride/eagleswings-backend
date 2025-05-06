const Admin = require('../models/Admin')
const Driver = require('../models/Driver')
const Book = require('../models/Book')

const approveDriver = async (req, res) => {
    const { id: driverId } = req.params;
    const { is_approved } = req.body;
    const adminId = req.user?.adminId;

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    if (typeof is_approved !== 'boolean') {
        return res.status(400).json({ message: "Missing or invalid field: is_approved must be boolean" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
        driverId,
        { isDriverApproved: is_approved },
        { new: true, runValidators: true }
    );

    if (!updatedDriver) {
        return res.status(404).json({ message: "Driver not found" });
    }

    res.status(200).json({
        message: `Driver has been ${is_approved ? 'approved' : 'disapproved'} !`,
        driver: updatedDriver
    })
}


// Assign driver to the ride (booking)
const assignDriverToRide = async (req, res) => {
    const { driverId } = req.body
    const { bookingId } = req.params
    const adminId = req.user.adminId

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" })
    }

    const admin = await Admin.findById(adminId)
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" })
    }

    try {
        // Ensure booking exists
        const booking = await Book.findById(bookingId)
        if (!booking) return res.status(404).json({ message: "Booking not found" })

        // Ensure driver exists
        const driver = await Driver.findById(driverId)
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" })
        } else if (!driver.isDriverApproved){
            return res.status(404).json({ message: "Driver hasn't been approved yet" })
        }


        // Update booking with driver and status
        const updatedBooking = await Book.findByIdAndUpdate(
            bookingId,
            { driver: driverId, status: 'assigned' },
            { new: true, runValidators: true }
        )

        // Update driver status
        await Driver.findByIdAndUpdate(
            driverId,
            { status: 'assigned' },
            { new: true, runValidators: true }
        )

        res.status(200).json({
            message: 'Driver assigned successfully',
            booking: updatedBooking
        })

    } catch (error) {
        res.status(500).json({
            message: "Error assigning driver",
            error: error.message
        })
    }
}

// get driver by location (in progress)
const getDriverByLocation = async (req, res) => {
    try {
        const {location} = req.params
        // const authenticatedUserId = req.user.userId

        if (!location) {
            return res.status(400).json({ message: 'Location is required' })
        }

        const query = { 
            location: { $regex: new RegExp(`^${location}$`, 'i') }
        }

        // Fetch drivers
        const driver = await Driver.find(query).sort({ createdAt: -1 })

        res.status(200).json({ driver })
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch drivers', error: error.message })
    }
}


module.exports = {
    approveDriver,
    assignDriverToRide
    // getDriverByLocation
}