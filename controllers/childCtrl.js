const { Model } = require('mongoose')
const Child = require('../models/Child')

// Add/Register a Child

const addChild = async (req, res) => {
    const { fullname, age, grade, school, address, relationship } = req.body;
    
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = req.user.userId;
    
    if (!fullname || !age) {
        return res.status(400).json({ error: 'Required fields missing: fullname or age' });
    }

    try {
        const child = new Child({
            fullname,
            age,
            grade,
            school,
            address,
            relationship,
            user: userId
        });

        await child.save();
        res.status(201).json(child);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get a specific child
const getChild = async (req, res) => {
    try {
        const child = await Child.findById(req.params.id)
        
        if (!child) return res.status(404).json({ error: 'Child not found' })
        if (!child.user.equals(req.user.userId)) return res.status(403).json({ error: 'Forbidden' })

        res.status(200).json(child);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// Get all children a user has (still in works)
const getChildByUser =  async (req, res) => {
    console.log(req.user._id , req.user)
    try {
        const children = await Child.find({ user: req.user._id })
        res.status(200).json(children);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

// Update a child's information
const updateChild = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const child = await Child.findById(id);

        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        if (!child.user.includes(req.user.userId)) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to update this child' });
        }

        const updatedChild = await Child.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ message: 'Child updated successfully', updatedChild });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a child's information
const deleteChild = async (req, res) => {
    try {
        const { id } = req.params;
        const child = await Child.findById(id);

        if (!child) {
            return res.status(404).json({ error: 'Child not found' });
        }

        if (!child.user.includes(req.user.userId)) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to delete this child' });
        }
        await Child.findByIdAndDelete(id);

        res.status(200).json({ message: 'Child deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}


module.exports = {
    addChild,
    getChild,
    getChildByUser,
    updateChild,
    deleteChild
};