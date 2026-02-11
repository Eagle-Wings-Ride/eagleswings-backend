// models/StripeEvent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const StripeEventSchema = new Schema({
  eventId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("StripeEvent", StripeEventSchema);
