const mongoose = require("mongoose");
const { Schema } = mongoose;

const DriverShiftSchema = new Schema(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
    },

    shift: {
      type: String,
      enum: ["morning", "afternoon"],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    startedAt: {
      type: Date,
    },

    endedAt: {
      type: Date,
    },

    totalMinutes: {
      type: Number,
      default: 0,
    },

    totalHours: {
      type: Number,
      default: 0,
    },

    completedAt: {
      type: Date,
    },

    totalDistanceMeters: {
      type: Number,
      default: 0,
    },

    assignmentCount: {
      type: Number,
      default: 0,
    },

    historyUpdated: {
      type: Boolean,
      default: false,
    },

    assignments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Assignment",
      },
    ],
  },
  {
    timestamps: true,
  },
);

DriverShiftSchema.index(
  {
    driver: 1,
    date: 1,
    shift: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("DriverShift", DriverShiftSchema);
