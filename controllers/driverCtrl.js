const uploadToCloudinary = require('../cloudinary/uploadCloudinary')
const Driver = require('../models/Driver')
const Book = require('../models/Book')
const Admin = require('../models/Admin')
const Assignment = require('../models/Assignment');
const {sendToTokens } = require('../utils/pushNotifications');


const getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find({}, '-password -fcmTokens');
        res.status(200).json(drivers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching drivers", error: error.message });
    }
};


const getDriver = async (req, res) => {
    try {
        const { id: driverId } = req.params;
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        res.status(200).json({
            driver:{
                id: driver._id,
                fullname: driver.fullname,
                email: driver.email,
                phone_number: driver.phone_number,
                residential_address: driver.aresidential_ddress,
                isEmailVerified: driver.isEmailVerified,
                isDriverApproved: driver.isDriverApproved,
                status: driver.status,
                image: driver.image,
                car_insurance: driver.car_insurance,
                child_intervention_rec: driver.child_intervention_rec,
                criminal_check_rec: driver.criminal_check_rec,
                driver_abstract: driver.driver_abstract,
                createdAt: driver.createdAt
          } 
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching driver", error: error.message });
    }
};


const viewRides = async (req, res) => {
    try {
        const driverId = req.user.driverId;
    
        // Ensure driver exists
        const driver = await Driver.findById(driverId)
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" })
        }
    
         // Fetch rides linked to this driver
        const assignments = await Assignment.find({ driver: driverId })
            .populate({
            path: "booking",
            populate: { path: "child", select: "fullname image grade age" },
            select: "pick_up_location drop_off_location ride_type trip_type pick_up_time status"
            })
            .select("status createdAt updatedAt");

        res.status(200).json({
                driver: {
                id: driver._id,
                fullname: driver.fullname,
                email: driver.email,
                phone: driver.phone_number,
                status: driver.status
                },
                rides: assignments.map(a => ({
                assignmentId: a._id,
                assignmentStatus: a.status,
                booking: a.booking
            }))
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching rides", error: error.message })
    }
};

//Accept Ride request

const driverAcceptRide = async (req, res) => {
    const { assignmentId } = req.params;
    const driverId = req.user.driverId;

    try {
        // Get assignment first
        const assignment = await Assignment.findById(assignmentId)
            .populate('booking')
            .populate('driver');

        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (assignment.driver._id.toString() !== driverId) return res.status(403).json({ message: 'Unauthorized' });

        const booking = assignment.booking;

        // Duplicate check only if shift is null
        if (!assignment.shift) {
            const alreadyAccepted = await Assignment.findOne({
                booking: booking._id,
                status: 'accepted',
                shift: null
            });
            if (alreadyAccepted) {
                return res.status(400).json({ message: 'This ride has already been accepted by a driver.' });
            }
        }

        // Now safe to mark assignment as accepted
        assignment.status = 'accepted';
        await assignment.save();

        // Booking status update
        if (booking.status === 'paid') {
            booking.status = 'assigned';
            await booking.save();
        }

        // Populate user & child AFTER assignment is saved
        await booking.populate([
            { path: 'user', select: 'fullname email phone_number' },
            { path: 'child', select: 'fullname age grade image' }
        ]);

        // Notifications code here...
        const driver = assignment.driver;
        const user = booking.user;

        // Respond with simplified JSON
        res.status(200).json({
            message: 'Ride accepted',
            assignment: {
                id: assignment._id,
                status: assignment.status,
                shift: assignment.shift || null
            },
            booking: {
                id: booking._id,
                rideType: booking.ride_type,
                tripType: booking.trip_type,
                scheduleType: booking.schedule_type,
                numberOfDays: booking.number_of_days,
                startDate: booking.start_date,
                status: booking.status,
                child: {
                    id: booking.child._id,
                    name: booking.child.fullname,
                    age: booking.child.age,
                    grade: booking.child.grade,
                    image: booking.child.image
                },
                user: {
                    id: user._id,
                    name: user.fullname,
                    email: user.email,
                    phone: user.phone_number
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error accepting ride', error: error.message });
    }
};

//Reject ride request
const driverRejectRide = async (req, res) => {
    const { assignmentId } = req.params;
    const driverId = req.user.driverId;

    try {
        const assignment = await Assignment.findById(assignmentId)
            .populate('booking')
            .populate('driver')
            .populate({ path: 'booking', populate: { path: 'user child' } });

        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (assignment.driver._id.toString() !== driverId) return res.status(403).json({ message: 'Unauthorized' });

        // Update assignment status
        assignment.status = 'rejected';
        await assignment.save();

        // 🔹 Reset booking status to 'paid' if no other assignment is accepted
        const booking = assignment.booking;
        const otherAccepted = await Assignment.findOne({
            booking: booking._id,
            status: 'accepted'
        });

        if (!otherAccepted) {
            booking.status = 'paid';
            await booking.save();
        }

        // 🔔 Notify admins so they can assign another driver
        const admins = await Admin.find({ role: 'admin', fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
        const adminTokens = admins.flatMap(a => a.fcmTokens);
        if (adminTokens.length) {
            await sendToTokens(
                adminTokens,
                'Ride Rejected',
                `${assignment.driver.fullname} rejected the ride for ${assignment.booking.child.fullname}`,
                { bookingId: assignment.booking._id.toString() }
            );
        }

        res.status(200).json({
            message: 'Ride rejected',
            assignment: {
                id: assignment._id,
                status: assignment.status,
                shift: assignment.shift || null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error rejecting ride', error: error.message });
    }
};

const uploadDriverDetails = async (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { id:driverId } = req.params;
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        let updatedFields = {};

        for (const key in req.files) {
            const file = req.files[key][0];
            const uploadedFile = await uploadToCloudinary(file, 'drivers');
            updatedFields[key] = uploadedFile.url;
        }

        // Update the driver document
        const updatedDriver = await Driver.findByIdAndUpdate(driverId, updatedFields, { 
            new: true, 
            runValidators: true 
        });

        res.status(200).json({ success: true, message: "Driver details updated", updatedDriver });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const updateDriver = async (req, res) => {
    try {
        const {id} = req.params
        const updates = req.body

        if (id !== req.driver_id.toString()){
            return res.status(403).json({ message: "Forbidden, cannot update another Driver details"})
        }

        const driver = await findByIdAndUpdate(id, updates,{
            new: true,
            runValidators: true
        })

        if (!driver) res.status(404).json({message: "Driver not found"})

        res.json({message: "Driver details updated successfully"})

    } catch (error) {
        res.status(400).json({message : error.message})
    }
}

const deleteDriver = async (req, res) =>{
    try {
        const {id} = req.params

        const driver = await Driver.findByIdAndDelete(id)

        if (!driver) res.status(404).json({message: 'Driver not Found'})

        res.status(200).json({message: "Driver deleted"})
    } catch (error) {
        res.status(400).json({message : error.message})
    }
}

module.exports = {
    getAllDrivers,
    getDriver,
    driverAcceptRide,
    driverRejectRide,
    updateDriver,
    deleteDriver,
    viewRides,
    uploadDriverDetails
}