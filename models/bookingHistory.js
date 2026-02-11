const mongoose = require("mongoose");
const { Schema } = mongoose;

const BookingRenewalHistorySchema = new Schema({
  booking: {
    type: Schema.Types.ObjectId,
    ref: "Bookings",
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  child: {
    type: Schema.Types.ObjectId,
    ref: "Child",
    required: true,
  },
  previousStartDate: { type: Date, required: true },
  previousEndDate: { type: Date, required: true },
  newStartDate: { type: Date, required: true },
  newEndDate: { type: Date, required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BookingHistory", BookingRenewalHistorySchema);
