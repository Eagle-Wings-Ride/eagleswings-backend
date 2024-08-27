const mongoose = require('mongoose')
const { Schema } = mongoose

const BookSchema = new Schema({
    pick_up_location : {
        type: String,
        required : true
    },
    drop_off_location : {
        type: String,
        required : true
    },
    ride_type : {
        type: String,
        required : true
    },
    trip_type : {
        type: String,
        required : true
    },
    schedule : {
        type: String,
        required : true
    },
    start_date : {
        type: String,
        required : true
    },
    pick_up_time : {
        type: String,
        required : true
    },
    drop_off_time : {
        type: String,
        required : true
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    child: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now() 
    }
})

module.exports = mongoose.model('Booking', BookSchema)