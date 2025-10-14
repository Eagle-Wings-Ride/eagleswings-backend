// models/Assignment.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AssignmentSchema = new Schema({
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Bookings',
    required: true,
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
  },
  shift: { 
    type: String,
    enum: ['morning','afternoon'],
    required: false,
  }, // optional if splitting ride
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',  // which admin assigned it
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-update updatedAt on save
AssignmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
