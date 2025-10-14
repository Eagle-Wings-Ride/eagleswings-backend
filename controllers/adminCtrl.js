const Admin = require('../models/Admin')
const Driver = require('../models/Driver')
const Book = require('../models/Book')
const Assignment = require('../models/Assignment')
const { sendToTokens } = require('../utils/pushNotifications')

// Approve Drivevr after Vetting
const approveDriver = async (req, res) => {
    const { id: driverId } = req.params
    const { is_approved } = req.body
    const adminId = req.user.adminId
    const role = req.user?.role;

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" })
    }

    if (!['admin', 'superadmin'].includes(role)) {
        return res.status(403).json({ message: "Forbidden: Only admin or superadmin can approve drivers" });
    }

    if (typeof is_approved !== 'boolean') {
        return res.status(400).json({ message: "Missing or invalid field: is_approved must be boolean" })
    }

    const admin = await Admin.findById(adminId)
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" })
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
        driverId,
        { isDriverApproved: is_approved },
        { new: true, runValidators: true }
    );

    if (!updatedDriver) {
        return res.status(404).json({ message: "Driver not found" })
    }

    res.status(200).json({
        message: `Driver has been ${is_approved ? 'approved' : 'disapproved'} !`,
        driver: updatedDriver
    })
}

// Assign driver to the ride (booking)
const assignDriverToRide = async (req, res) => {
    const { driverId, shift } = req.body;
    const { bookingId } = req.params;
    const adminId = req.user?.adminId;

    try {
        // 🔒 Auth check
        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
        }
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // 🔎 Booking check
        const booking = await Book.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (booking.status !== "paid") {
            return res.status(400).json({ message: "Booking must be paid before assigning a driver" });
        }

        // 🔎 Driver check
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }
        if (!driver.isDriverApproved) {
            return res.status(400).json({ message: "Driver has not been approved yet" });
        }

        // ⏰ Shift validation
        const validShifts = ["morning", "afternoon"];
        if (shift && !validShifts.includes(shift)) {
            return res.status(400).json({ message: "Invalid shift. Use 'morning' or 'afternoon'" });
        }
        // 🚫 Prevent duplicate driver assignment
        const existingAssignment = await Assignment.findOne({ booking: bookingId, driver: driverId });
        if (existingAssignment) {
            return res.status(400).json({ message: "Driver already assigned to this ride" });
        }
        // 🚫 Prevent duplicate shift assignment
        if (shift) {
            const shiftTaken = await Assignment.findOne({ booking: bookingId, shift });
            if (shiftTaken) {
            return res.status(400).json({ message: `A driver is already assigned for ${shift} shift` });
            }
        }

        // 🆕 Create new assignment
        const assignment = await Assignment.create({
            booking: bookingId,
            driver: driverId,
            assignedBy: adminId,
            shift: shift || null,
            status: "pending", // driver must accept
        });

        // 📲 Notify driver
        if (driver.fcmTokens?.length > 0) {
            await sendToTokens(
            driver.fcmTokens,
            "New Ride Assigned",
            "You have a new ride request. Please accept it.",
            { bookingId, driverId }
            );
        }

        return res.status(200).json({
            message: "Driver assignment created (pending driver response)",
            assignment,
        });

    } catch (error) {
        console.error("Error assigning driver:", error);
        return res.status(500).json({
            message: "Error assigning driver",
            error: error.message,
        });
    }
};


// Unassign Driver from ride
const UnassignDriverFromRide = async (req, res) => {
    const { driverId } = req.body;
    const { bookingId } = req.params;
    const adminId = req.user.adminId;

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
    }

    try {
      // Find assignment
        const assignment = await Assignment.findOneAndDelete({ booking: bookingId, driver: driverId })

        if (!assignment) {
            return res.status(404).json({ message: "No assignment found for this driver and booking" })
        }

      // Notify driver that they were unassigned
        const driver = await Driver.findById(driverId);
        if (driver?.fcmTokens?.length > 0) {
            await sendToTokens(
            driver.fcmTokens,
            "Ride Unassigned",
            "You have been unassigned from a ride by the admin.",
            { bookingId, driverId }
            )
        }

        res.status(200).json({
            message: "Driver unassigned successfully",
            removedAssignment: assignment,
        })
    } catch (error) {
        res.status(500).json({
            message: "Error unassigning driver",
            error: error.message,
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
    assignDriverToRide,
    UnassignDriverFromRide
    // getDriverByLocation
}