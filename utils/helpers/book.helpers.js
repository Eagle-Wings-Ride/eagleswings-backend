const Rates = require("../../models/Rate");

const MAX_DAYS_AHEAD = 90;
const MAX_DAYS_PAST = 1;
const MAX_CUSTOM_DAYS = 60;

/**
 * ---------------------------
 * BOOKING AMOUNT
 * ---------------------------
 */
const calculateBookingAmount = async (booking) => {
  const rates = await Rates.findOne();

  if (!rates) {
    throw new Error("Rate configuration missing");
  }

  const rateGroup =
    booking.ride_type === "inhouse"
      ? rates.in_house_drivers
      : rates.freelance_drivers;

  const tripKey = booking.trip_type.replace("-", "_");

  switch (booking.schedule_type) {
    case "custom":
      if (!booking.number_of_days || booking.number_of_days <= 0) {
        throw new Error("Invalid number of days for custom schedule");
      }

      return rateGroup.daily[tripKey] * booking.number_of_days;

    case "2 weeks":
      return rateGroup.bi_weekly[tripKey];

    case "1 month":
      return rateGroup.monthly[tripKey];

    default:
      throw new Error("Invalid schedule type");
  }
};

/**
 * ---------------------------
 * START DATE VALIDATION
 * ---------------------------
 */
const validateStartDate = (startDate) => {
  if (!startDate) {
    throw new Error("Start date is required");
  }

  const now = new Date();
  const start = new Date(startDate);

  if (isNaN(start.getTime())) {
    throw new Error("Invalid start date");
  }

  const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < -MAX_DAYS_PAST) {
    throw new Error("Start date cannot be in the past");
  }

  if (diffDays > MAX_DAYS_AHEAD) {
    throw new Error("Start date is too far in the future");
  }
};

/**
 * ---------------------------
 * CUSTOM DAYS VALIDATION
 * ---------------------------
 */
const validateCustomDays = (days) => {
  if (!Number.isInteger(days) || days < 1 || days > MAX_CUSTOM_DAYS) {
    throw new Error(`Custom days must be between 1 and ${MAX_CUSTOM_DAYS}`);
  }
};

/**
 * ---------------------------
 * STRIPE PRODUCT INFO
 * ---------------------------
 */
const getStripeProductData = (booking, paymentType) => {
  const childName = booking.child?.fullname || "Unknown Child";

  const isRenewal = paymentType === "renewal";

  return {
    name: isRenewal
      ? `Booking Renewal - ${booking.schedule_type} for ${childName}`
      : `Ride Booking - ${booking.schedule_type} for ${childName}`,

    description: [
      isRenewal ? `Renewal for ${childName}` : `New booking for ${childName}`,
      `Ride Type: ${booking.ride_type}`,
      `Trip Type: ${booking.trip_type}`,
      booking.serviceEndDate
        ? `Expires: ${booking.serviceEndDate.toDateString()}`
        : null,
    ]
      .filter(Boolean)
      .join(" | "),
  };
};

/**
 * ---------------------------
 * CAN START RIDE
 * ---------------------------
 *
 * Only checks booking validity.
 * Assignment state is handled elsewhere.
 */
const canStartRide = (booking) => {
  if (!booking) {
    return {
      allowed: false,
      message: "Booking not found",
    };
  }

  if (!booking.start_date) {
    return {
      allowed: false,
      message: "Booking has no start date",
    };
  }

  const now = new Date();

  const startDate = new Date(booking.start_date);

  if (now < startDate) {
    return {
      allowed: false,
      message: "Ride has not started yet",
    };
  }

  if (booking.serviceEndDate) {
    const endDate = new Date(booking.serviceEndDate);

    if (now > endDate) {
      return {
        allowed: false,
        message: "Ride package has expired",
      };
    }
  }

  return {
    allowed: true,
  };
};

module.exports = {
  calculateBookingAmount,
  validateStartDate,
  validateCustomDays,
  getStripeProductData,
  canStartRide,
};
