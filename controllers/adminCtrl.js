const Admin = require("../models/Admin")
const Driver = require("../models/Driver")


const approveDriver = async (req, res) => {
    const {id:driverId} = req.params
    const adminId = req.user?.id

    if (!adminId) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    const {is_approved} = req.body

    if(is_approved == undefined){
        res.status(400).json({message:"Missing required field: is_approved"})
    }
    
    const admin = await Admin.findById(adminId)

    if (!admin){
        return res.status(404).json({message: "Admin not Found"})
    }

    const newDriver = await Driver.findByIdAndUpdate(driverId, {is_approved}, {
        new: true,
        runValidators: true
    })
    
    if (!newDriver){
        return res.status(404).json({message: "Driver not Found"})
    }

    res.status(200).json({message:"Driver approved!", newDriver});

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
    // getDriverByLocation
}