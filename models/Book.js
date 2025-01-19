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
        enum: ['booked', 'ongoing', 'completed', 'cancelled'],
        default: 'booked',
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
    cancellationReason: {
        type: String,
        default: null,
    },
    cancellationDate: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Bookings', BookSchema);