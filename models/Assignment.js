const mongoose = require("mongoose");
const { Schema } = mongoose;

const AssignmentSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Bookings",
      required: true,
      index: true,
    },

    driver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    shift: {
      type: String,
      enum: ["morning", "afternoon"],
      required: true,
    },

    shiftRecord: {
      type: Schema.Types.ObjectId,
      ref: "DriverShift",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",

        "enroute_pickup",
        "arrived_pickup",
        "picked_up",

        "enroute_dropoff",
        "arrived_dropoff",

        "completed",
        "cancelled",
        "expired",
      ],
      default: "pending",
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },

    /**
     * DRIVER TIMELINE
     */

    acceptedAt: Date,

    startedAt: Date,

    arrivedPickupAt: Date,

    pickupTime: Date,

    arrivedDropoffAt: Date,

    completedAt: Date,

    cancelledAt: Date,

    rejectedAt: Date,

    /**
     * LOCATION TRACKING
     */

    lastLocation: {
      lat: Number,
      lng: Number,
      timestamp: Date,
    },

    /**
     * Distance/time metrics
     */

    pickupDistanceMeters: {
      type: Number,
      default: 0,
    },

    tripDistanceMeters: {
      type: Number,
      default: 0,
    },

    distanceUpdatedAt: Date,

    durationMinutes: {
      type: Number,
      default: 0,
    },

    /**
     * Notification protection
     */

    nearbyNotified: {
      type: Boolean,
      default: false,
    },

    pickupNotified: {
      type: Boolean,
      default: false,
    },

    dropoffNotified: {
      type: Boolean,
      default: false,
    },

    /**
     * Prevent duplicate history updates
     */

    historyUpdated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// One driver cannot have duplicate same booking shift
AssignmentSchema.index(
  {
    driver: 1,
    booking: 1,
    shift: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Assignment", AssignmentSchema);
