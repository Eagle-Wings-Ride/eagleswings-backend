/**
 * Booking schedule calculations
 */

const {DaysOfWeek} = require("../bookingEnum")

const addDays = (date, days) => {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + days);
  return d;
};

const WEEK_DAYS = [
  DaysOfWeek.SUNDAY,
  DaysOfWeek.MONDAY,
  DaysOfWeek.TUESDAY,
  DaysOfWeek.WEDNESDAY,
  DaysOfWeek.THURSDAY,
  DaysOfWeek.FRIDAY,
  DaysOfWeek.SATURDAY,
];

const getSelectedWeekdays = (pickupDays = []) => {
  return pickupDays.map(day => WEEK_DAYS.indexOf(day));
};


/**
 * Counts service days only.
 *
 * Example:
 * pickupDays = ["monday","wednesday"]
 *
 * Monday ✔
 * Tuesday ✘
 * Wednesday ✔
 * Thursday ✘
 */
const addServiceDays = (startDate, serviceDays, pickupDays = []) => {
  const selected = getSelectedWeekdays(pickupDays);

  if (!selected.length) {
    throw new Error("pickup_days cannot be empty");
  }

  let current = new Date(startDate);
  current.setHours(0,0,0,0);

  let completed = 0;

  while (completed < serviceDays) {
    if (selected.includes(current.getDay())) {
      completed++;

      if (completed === serviceDays) {
        break;
      }
    }

    current = addDays(current, 1);
  }

  return current;
};

/**
 * Converts schedule into number of actual ride days.
 *
 * custom
 * = exactly what parent entered
 *
 * 2 weeks
 * = pickup days × 2
 *
 * 1 month
 * = pickup days × 4
 *
 * (We'll improve month later if needed.)
 */
const calculateServiceDays = (booking) => {
  switch (booking.schedule_type) {
    case "custom":
      return booking.number_of_days;

    case "2 weeks":
      return booking.pickup_days.length * 2;

    case "1 month":
      return booking.pickup_days.length * 4;

    default:
      return booking.number_of_days || 0;
  }
};

/**
 * Counts scheduled ride days between two dates (inclusive).
 */
const countRideDaysBetween = (
  startDate,
  endDate,
  pickupDays = []
) => {
  const selected = getSelectedWeekdays(pickupDays);

  let count = 0;

  let current = new Date(startDate);
  current.setHours(0,0,0,0);

  while (current <= endDate) {
    if (selected.includes(current.getDay())) {
      count++;
    }

    current = addDays(current, 1);
  }

  return count;
};

/**
 * Returns start/end dates.
 *
 * Parent pays today
 * Start = Aug 5
 *
 * End is calculated FROM Aug 5,
 * not payment date.
 */
const calculateServiceDates = (booking, startDate = booking.start_date) => {
  const serviceDays = calculateServiceDays(booking);

  const endDate = addServiceDays(
    startDate,
    serviceDays,
    booking.pickup_days
  );

  return {
    serviceDays,
    serviceStartDate: new Date(startDate),
    serviceEndDate: endDate,
  };
};

/**
 * Has booking started yet?
 */
const hasServiceStarted = (booking) => {
  return new Date() >= new Date(booking.start_date);
};

/**
 * Has booking expired?
 */
const hasServiceExpired = (booking) => {
  if (!booking.serviceEndDate) return false;

  return new Date() > new Date(booking.serviceEndDate);
};

/**
 * Remaining service days.
 */
const remainingServiceDays = (booking) => {
  if (!booking.serviceEndDate) {
    return 0;
  }

  const today = new Date();

  if (today > booking.serviceEndDate) {
    return 0;
  }

  return countRideDaysBetween(
    today,
    booking.serviceEndDate,
    booking.pickup_days
  );
};

/**
 * Returns every actual ride date for a booking.
 *
 * Example:
 *
 * start_date: Thursday
 * pickup_days:
 * [
 *   monday,
 *   tuesday,
 *   thursday,
 *   friday
 * ]
 *
 * Returns:
 * [
 *   Thu,
 *   Fri,
 *   Mon,
 *   Tue...
 * ]
 */
const getServiceDates = (booking) => {
  if (!booking.start_date || !booking.serviceEndDate) {
    throw new Error(
      "Booking start date and service end date are required"
    );
  }

  const selected = getSelectedWeekdays(
    booking.pickup_days
  );

  const dates = [];

  let current = new Date(booking.start_date);
  current.setHours(0,0,0,0);

  const end = new Date(booking.serviceEndDate);
  end.setHours(0,0,0,0);


  while (current <= end) {

    if (selected.includes(current.getDay())) {
      dates.push(new Date(current));
    }

    current = addDays(current, 1);
  }


  return dates;
};

module.exports = {
  calculateServiceDays,
  calculateServiceDates,
  countRideDaysBetween,
  hasServiceStarted,
  hasServiceExpired,
  remainingServiceDays,
  getServiceDates,
};