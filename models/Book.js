const mongoose = require("mongoose");
const { Schema } = mongoose;

const BookSchema = new Schema(
  {
    ride_type: {
      type: String,
      enum: ["freelance", "inhouse"],
      required: true,
    },
    trip_type: {
      type: String,
      enum: ["one-way", "return"],
      required: true,
    },
    schedule_type: {
      type: String,
      enum: ["custom", "2 weeks", "1 month"],
      required: true,
    },
    number_of_days: {
      type: Number,
      required: function () {
        return this.schedule_type === "custom";
      },
    },
    pickup_days: {
      type: [String],
      enum: [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
      required: true,
    },
    start_date: {
      type: Date,
      required: true,
    },

    // Morning ride
    morning_from: {
      type: String,
      enum: ["home", "school", "daycare"],
    },
    morning_to: {
      type: String,
      enum: ["home", "school", "daycare"],
    },
    morning_time: String,
    morning_from_address: String,
    morning_to_address: String,

    // Afternoon ride (mandatory only for return trip)
    afternoon_from: {
      type: String,
      enum: ["home", "school", "daycare"],
    },
    afternoon_to: {
      type: String,
      enum: ["home", "school", "daycare"],
    },
    afternoon_time: String,
    afternoon_from_address: String,
    afternoon_to_address: String,

    // Location coordinates
    start_latitude: {
      type: String,
      required: true,
    },
    start_longitude: {
      type: String,
      required: true,
    },
    end_latitude: {
      type: String,
      required: true,
    },
    end_longitude: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "booked",
        "paid",
        "assigned",
        "ongoing",
        "payment_failed",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "booked",
    },
    cancellationReason: String,
    cancellationDate: Date,

    // Relations
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    serviceEndDate: {
      type: Date,
      required: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

BookSchema.pre("validate", function (next) {
  const hasMorning = this.morning_from || this.morning_to || this.morning_time;

  const hasAfternoon =
    this.afternoon_from || this.afternoon_to || this.afternoon_time;

  // ❌ No partial sections
  if (
    hasMorning &&
    (!this.morning_from || !this.morning_to || !this.morning_time)
  ) {
    return next(new Error("Morning ride must include from, to, and time"));
  }

  if (
    hasAfternoon &&
    (!this.afternoon_from || !this.afternoon_to || !this.afternoon_time)
  ) {
    return next(new Error("Afternoon ride must include from, to, and time"));
  }

  // ❌ Trip-type rules
  if (this.trip_type === "one-way") {
    if (hasMorning === hasAfternoon) {
      return next(
        new Error("One-way trip must have either morning or afternoon ride")
      );
    }
  }

  if (this.trip_type === "return") {
    if (!hasMorning || !hasAfternoon) {
      return next(
        new Error("Return trip must have both morning and afternoon rides")
      );
    }
  }

  next();
});

module.exports = mongoose.model('Bookings', BookSchema);
