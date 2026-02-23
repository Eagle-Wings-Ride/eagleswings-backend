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
    enum: ['pending', 'accepted', 'rejected', 'in_progress', 'completed','cancelled' ],
    default: 'pending',
  },
  pickupNotified: { type: Boolean, default: false },
  dropoffNotified: { type: Boolean, default: false },
  shift: { 
    type: String,
    enum: ['morning','afternoon'],
    required: false,
  }, // optional if splitting ride
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',  // which admin assigned it
  },
  }, {timestamps: true}
);

// Auto-update updatedAt on save
AssignmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
