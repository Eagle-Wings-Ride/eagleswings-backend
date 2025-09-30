const mongoose = require('mongoose');
const {Schema} = mongoose;


const BookSchema = new Schema({
    ride_type: {
      type: String,
      enum: ['freelance', 'inhouse'],
      required: true,
    },
    trip_type: {
      type: String,
      enum: ['one-way', 'return'],
      required: true,
    },
    schedule_type: {
      type: String,
      enum: ['custom', '2 weeks', '1 month'],
      required: true,
    },
    number_of_days: {
      type: Number,
      required: function () {
        return this.schedule_type === 'custom';
      },
    },
    pickup_days: {
      type: [String],
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      default: [],
    },
    start_date: {
      type: String,
      required: true,
    },
  
    // Morning ride
    morning_from: {
      type: String,
      enum: ['home', 'school', 'daycare'],
      required: true,
    },
    morning_to: {
      type: String,
      enum: ['home', 'school', 'daycare'],
      required: true,
    },
    morning_time: {
      type: String,
      required: true,
    },
    morning_from_address: String,
    morning_to_address: String,
  
    // Afternoon ride (if there's a return trip)
    afternoon_from: {
      type: String,
      enum: ['home', 'school', 'daycare'],
    },
    afternoon_to: {
      type: String,
      enum: ['home', 'school', 'daycare'],
    },
    afternoon_time: String,
    afternoon_from_address: String,
    afternoon_to_address: String,
  
    // Location coordinates
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
 
    status: {
      type: String,
      enum: ['booked', 'paid', 'assigned', 'ongoing', 'payment_failed', 'completed', 'cancelled', 'expired'],
      default: 'booked',
    },
    cancellationReason: String,
    cancellationDate: Date,
  
    // Relations
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    serviceEndDate: {
      type: Date,
      required: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    }
    
  })


module.exports = mongoose.model('Bookings', BookSchema);