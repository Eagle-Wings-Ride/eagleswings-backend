const uploadToCloudinary = require('../cloudinary/uploadCloudinary')
const Driver = require('../models/Driver')
const Book = require('../models/Bookings')
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
                residential_address: driver.residential_ddress,
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
        const driverId = req.user.id;
    
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

            if(!file || file.size == 0) continue;

            // Build a readable but safe filename (e.g., 64a9..._license.jpg)
            const fileExt = path.extname(file.originalname);
            const safeName = `${driver._id}_${key}${fileExt}`;

            const uploadedFile = await uploadToCloudinary(file, 'drivers', safeName);
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

        const driver = await Driver.findByIdAndUpdate(id, updates,{
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
    updateDriver,
    deleteDriver,
    viewRides,
    uploadDriverDetails,
}