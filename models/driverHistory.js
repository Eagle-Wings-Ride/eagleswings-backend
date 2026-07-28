const mongoose = require("mongoose");
const { Schema } = mongoose;

const DriverHistorySchema = new Schema(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    periodType: {
      type: String,
      enum: ["day", "week", "month", "year"],
      required: true,
    },

    period: Number, // week number or day or month index
    year: Number,

    // ---------------- RIDE COUNTS ----------------
    ridesAccepted: { type: Number, default: 0 },
    ridesRejected: { type: Number, default: 0 },
    ridesCompleted: { type: Number, default: 0 },

    // ---------------- TIME METRICS ----------------
    totalHours: { type: Number, default: 0 }, // IMPORTANT: shift-based, not per ride
    totalActiveMinutes: { type: Number, default: 0 },

    
    totalShifts: { type: Number, default: 0 },
    shiftsCompleted: { type: Number, default: 0 },
    
    // ---------------- DISTANCE ----------------
    totalDistanceKm: { type: Number, default: 0 },
    averageDistanceKm: { type: Number, default: 0 },
    averageRideMinutes: { type: Number, default: 0 },

    // ---------------- PAYROLL ----------------
    paidAmount: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    // ---------------- PERFORMANCE ----------------
    acceptanceRate: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },

    lastRideCompletedAt: Date,
    lastShiftCompletedAt: Date,

    lastUpdatedFromShift: {
      type: Schema.Types.ObjectId,
      ref: "DriverShift",
    },
  },
  { timestamps: true },
);

/**
 * Prevent duplicates per period
 */
DriverHistorySchema.index(
  { driver: 1, periodType: 1, period: 1, year: 1 },
  { unique: true },
);

module.exports = mongoose.model("DriverHistory", DriverHistorySchema);
