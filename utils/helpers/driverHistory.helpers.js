const DriverHistory = require("../../models/DriverHistory");

const HOURLY_RATE = parseFloat(process.env.HOURLY_RATE || 12);
const TAX_PERCENT = parseFloat(process.env.TAX_PERCENT || 0);

// ---------------- PERIOD ----------------

const getPeriod = (date = new Date()) => ({
  periodType: "day",
  period: date.getDate(),
  year: date.getFullYear(),
});

// ---------------- GET OR CREATE ----------------

const getOrCreateHistory = async (
  driverId,
  date = new Date(),
  session = null,
) => {
  const { periodType, period, year } = getPeriod(date);

  let query = DriverHistory.findOne({
    driver: driverId,
    periodType,
    period,
    year,
  });

  if (session) {
    query = query.session(session);
  }

  let history = await query;

  if (!history) {
    history = new DriverHistory({
      driver: driverId,
      periodType,
      period,
      year,
    });
  }

  return history;
};

// ---------------- SHIFT COMPLETED ----------------

const updateDriverHistoryFromShift = async (shift, session = null) => {
  if (shift.historyUpdated) {
    return null;
  }

  const history = await getOrCreateHistory(
    shift.driver,
    shift.completedAt,
    session,
  );

  // ---------- HOURS ----------

  history.totalHours += shift.totalHours;

  history.totalActiveMinutes += shift.totalMinutes;

  // ---------- SHIFTS ----------

  history.totalShifts += 1;

  history.shiftsCompleted += 1;

  history.lastShiftCompletedAt = shift.completedAt;

  // ---------- DISTANCE ----------

  const distanceKm = shift.totalDistanceMeters / 1000;

  history.totalDistanceKm = Number(
    (history.totalDistanceKm + distanceKm).toFixed(2),
  );

  // ---------- RIDES ----------

  history.ridesCompleted += shift.assignmentCount;

  history.lastRideCompletedAt = shift.completedAt;

  history.completionRate = history.ridesAccepted
    ? Number(
        ((history.ridesCompleted / history.ridesAccepted) * 100).toFixed(2),
      )
    : 0;

  // ---------- PAY ----------

  const gross = shift.totalHours * HOURLY_RATE;

  const net = gross * (1 - TAX_PERCENT / 100);

  history.grossPay = Number((history.grossPay + gross).toFixed(2));

  history.netPay = Number((history.netPay + net).toFixed(2));

  // paidAmount intentionally
  // NOT updated automatically

  // ---------- AVERAGES ----------

  if (history.ridesCompleted > 0) {
    history.averageDistanceKm = Number(
      (history.totalDistanceKm / history.ridesCompleted).toFixed(2),
    );

    history.averageRideMinutes = Number(
      (history.totalActiveMinutes / history.ridesCompleted).toFixed(2),
    );
  }

  history.lastUpdatedFromShift = shift._id;

  if (session) {
    await history.save({ session });
  } else {
    await history.save();
  }

  shift.historyUpdated = true;

  if (session) {
    await shift.save({ session });
  } else {
    await shift.save();
  }

  return history;
};

const updateDriverHistoryAction = async (driverId, action) => {
  const { periodType, period, year } = getPeriod();

  let history = await DriverHistory.findOne({
    driver: driverId,
    periodType,
    period,
    year,
  });

  if (!history) {
    history = new DriverHistory({
      driver: driverId,
      periodType,
      period,
      year,
    });
  }

  if (action === "accepted") {
    history.ridesAccepted += 1;
  }

  if (action === "rejected") {
    history.ridesRejected += 1;
  }

  const total = history.ridesAccepted + history.ridesRejected;

  if (total > 0) {
    history.acceptanceRate = Number(
      ((history.ridesAccepted / total) * 100).toFixed(2),
    );
  }

  await history.save();

  return history;
};

module.exports = {
  getOrCreateHistory,

  updateDriverHistoryFromShift,

  updateDriverHistoryAction,
};
