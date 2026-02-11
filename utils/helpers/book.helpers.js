const Rates = require("../../models/Rate");

const MAX_DAYS_AHEAD = 90; // 3 months
const MAX_DAYS_PAST = 1; // timezone tolerance
const MAX_CUSTOM_DAYS = 60;

// 💰 Validate and compute amount
const calculateBookingAmount = async (booking) => {
  const rates = await Rates.findOne();
  if (!rates) throw new Error("Rate configuration missing");

  const rateGroup =
    booking.ride_type === "inhouse"
      ? rates.in_house_drivers
      : rates.freelance_drivers;

  let amount = 0;
  switch (booking.schedule_type) {
    case "custom":
      if (!booking.number_of_days || booking.number_of_days <= 0)
        throw new Error("Invalid number of days for custom schedule");
      amount = rateGroup.daily * booking.number_of_days;
      break;
    case "2 weeks":
      amount = rateGroup.bi_weekly[booking.trip_type];
      break;
    case "1 month":
      amount = rateGroup.monthly[booking.trip_type];
      break;
    default:
      throw new Error("Invalid schedule type");
  }

  return amount;
};

const validateStartDate = (startDate) => {
  const now = new Date();
  const start = new Date(startDate);

  if (!startDate || isNaN(start.getTime())) {
    throw new Error("Invalid start date");
  }

  const diffInDays = (start - now) / (1000 * 60 * 60 * 24);

  if (diffInDays < -MAX_DAYS_PAST) {
    throw new Error("Start date cannot be in the past");
  }

  if (diffInDays > MAX_DAYS_AHEAD) {
    throw new Error("Start date is too far in the future");
  }
};

const validateCustomDays = (days) => {
  if (!Number.isInteger(days) || days < 1 || days > MAX_CUSTOM_DAYS) {
    throw new Error(`Custom days must be between 1 and ${MAX_CUSTOM_DAYS}`);
  }
};

const getStripeProductData = (booking, paymentType) => {
  const childName = booking.child ? booking.child.fullname : "Unknown Child";

  const name =
    paymentType === "renewal"
      ? `Booking Renewal - ${booking.schedule_type} for ${childName}`
      : `Ride Booking - ${booking.schedule_type} for ${childName}`;

  const descriptionParts = [];
  if (paymentType === "renewal") descriptionParts.push(`Renewal for booking: ${childName}`);
  else descriptionParts.push(`New booking for: ${childName}`);

  descriptionParts.push(`Ride Type: ${booking.ride_type}`);
  descriptionParts.push(`Trip Type: ${booking.trip_type}`);

  if (booking.serviceEndDate) descriptionParts.push(`Expires: ${booking.serviceEndDate.toDateString()}`);

  return { name, description: descriptionParts.join(" | ") };
}


module.exports = {
  calculateBookingAmount,
  validateStartDate,
  validateCustomDays,
  getStripeProductData
};
