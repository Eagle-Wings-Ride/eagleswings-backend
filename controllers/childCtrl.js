const { Model } = require('mongoose')
const Child = require('../models/Child')
const Admin = require('../models/Admin')
const uploadToCloudinary = require('../cloudinary/uploadCloudinary')

// Add/Register a Child

const addChild = async (req, res) => {
    const { fullname, age, grade,relationship, school, home_address, school_address, daycare_address} = req.body;
    
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (!fullname || !age) {
        return res.status(400).json({ message: 'Required fields missing: fullname or age' });
    }

    const userId = req.user.userId;
    
    try {
        let imageUrl = null

        if(req.file){
            console.log("File details before Cloudinary upload:");
            console.log({
              fieldName: req.file.fieldname,
              originalName: req.file.originalname,
              mimetype: req.file.mimetype,
              hasBuffer: !!req.file.buffer,
              bufferLength: req.file.buffer ? req.file.buffer.length : 0
            });
          
            if (!req.file.buffer || req.file.buffer.length === 0) {
              throw new Error("Empty file buffer before upload");
            }
            const uploadedFile = await uploadToCloudinary(req.file, 'children');
            imageUrl = uploadedFile.url;
        }

        const child = new Child({
            fullname,
            image: imageUrl,
            age,
            grade,
            relationship,
            school,
            home_address,
            school_address,
            daycare_address: daycare_address?.trim() || undefined,
            user: userId
        });

        await child.save();
        res.status(201).json(child);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get a specific child
const getChild = async (req, res) => {
    try {
        const child = await Child.findById(req.params.id)
        
        if (!child) return res.status(404).json({ message: 'Child not found' })
        // if (!child.user.equals(req.user.userId)) return res.status(403).json({ message: 'Forbidden' })

        const isAdmin = await Admin.findById(req.user.adminId);

        if (!isAdmin && !child.user.equals(req.user.userId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.status(200).json(child);
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get all children for a specific user by user ID (for admins or specific requests)
const getChildrenByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User not Found' });
        }

        // Fetch all children associated with the specified user
        const children = await Child.find({ user: userId });

        if (children.length === 0) {
            return res.status(404).json({ message: 'No children found for this user' });
        }

        res.status(200).json(children);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Update a child's information
const updateChild = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const child = await Child.findById(id);

        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        if (!child.user.includes(req.user.userId)) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to update this child' });
        }

        const updatedChild = await Child.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ message: 'Child updated successfully', updatedChild });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a child's information
const deleteChild = async (req, res) => {
    try {
        const { id } = req.params;
        const child = await Child.findById(id);

        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        if (!child.user.includes(req.user.userId)) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this child' });
        }
        await Child.findByIdAndDelete(id);

        res.status(200).json({ message: 'Child deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}


module.exports = {
    addChild,
    getChild,
    getChildrenByUserId,
    updateChild,
    deleteChild
};