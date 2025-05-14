const uploadToCloudinary = require('../cloudinary/uploadCloudinary')
const Driver = require('../models/Driver')


const getAllDrivers = async (req, res) =>{
    const drivers = await Driver.find({})
    res.status(200).json(drivers)
}

const getDriver = async (req,res) => {
    const {id:driverId} = req.params
    const driver = await Driver.findById(driverId)

    if(!driver) res.status(404).json("Driver not Found")

    res.status(200).json({driver})
}

const viewRides = async(req,res) =>{
    const {id:driverId} = req.params
    const driver = await Driver.findById(driverId).populate('assignedBookings', 'id child pick_up_location drop_off_location ride_type trip_type pick_up_time')
    if(!driver) res.status(404).json("Driver not Found")

    res.status(200).json({driver})
}

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
    updateDriver,
    deleteDriver,
    viewRides,
    uploadDriverDetails
}