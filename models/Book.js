const mongoose = require('mongoose');
const {Schema} = mongoose;


const BookSchema = new Schema({
    pick_up_location: {
        type: String,
        required: true,
    },
    drop_off_location: {
        type: String,
        required: true,
    },
    ride_type: {
        type: String,
        enum: ['freelance', 'inhouse'],
        required: true,
    },
    trip_type: {
        type: String,
        enum: ['return', 'one-way'],
        required: true,
    },
    schedule: {
        type: String,
        enum: ['2 weeks', '1 month'],
        required: true,
    },
    start_date: {
        type: String,
        required: true,
    },
    pick_up_time: {
        type: String,
        required: true,
    },
    drop_off_time: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['booked', 'paid', 'assigned', 'ongoing','payment_failed', 'completed', 'cancelled'],
        default: 'booked',
    },
    start_latitude:{
        type: String,
        required: true,
    },
    start_longitude:{
        type: String,
        required: true,
    },
    end_latitude:{
        type: String,
        required: true,
    },
    end_longitude:{
        type: String,
        required: true,
    },
    cancellationReason: {
        type: String,
        default: null,
    },
    cancellationDate: {
        type: Date,
        default: null,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true,
    },
    drivers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
    }],    
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Bookings', BookSchema);