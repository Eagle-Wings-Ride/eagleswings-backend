const { Model } = require('mongoose')
const Book = require('../models/Book')
const Child = require('../models/Child')

// book a ride

const bookRide = async (req, res) => {
    const {id: childId} = req.params
    try {
        const { 
            pick_up_location,
            drop_off_location,
            ride_type,
            trip_type,
            schedule,
            start_date,
            pick_up_time,
            drop_off_time,
        } = req.body 

        // Check if the child belongs to the user
        const childRecord = await Child.findById(childId);
        if (!childRecord || childRecord.user.toString() !== req.user.userId.toString()) {
            return res.status(400).json({ error: "Child not found or does not belong to this user" });
        }

        const newBooking = new Book({
            pick_up_location,
            drop_off_location,
            ride_type,
            trip_type,
            schedule,
            start_date,
            pick_up_time,
            drop_off_time,
            user: req.user.userId,
            child: childId
        }) 

        await newBooking.save() 
        res.status(201).json(newBooking) 

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


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

const getAllRides = async (req, res) => {
    const rides = await Book.find({})
    res.status(200).json({rides})
}

module.exports = {
    bookRide,
    getRidesByUser,
    getRideByChild,
    getAllRides
}