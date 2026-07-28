const DriverShift = require("../../models/driverShift");
const Assignment = require("../../models/Assignment");

// ---------------- CALCULATE BUSINESS DATES ----------------
const getBusinessDate = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

// ---------------- GET OR CREATE ACTIVE SHIFT ----------------

const getOrCreateActiveShift = async (driverId, assignment) => {
  const today = getBusinessDate();

  let shift = await DriverShift.findOne({
    driver: driverId,
    shift: assignment.shift,
    status: "active",
    date: today,
  });

  if (shift) {
    return shift;
  }

  const now = new Date();

  shift = await DriverShift.create({
    driver: driverId,
    date: today,
    shift: assignment.shift,
    status: "active",
    startedAt: now,
  });

  return shift;
};

// ---------------- GET ACTIVE SHIFT ----------------

const getActiveShift = async (driverId) => {
  const today = getBusinessDate();

  return DriverShift.findOne({
    driver: driverId,
    status: "active",
    date: today,
  });
};

// ---------------- ATTACH ASSIGNMENT ----------------

const attachAssignmentToShift = async (shiftId, assignmentId) => {
  const shift = await DriverShift.findById(shiftId);

  if (!shift) {
    return null;
  }

  const exists = shift.assignments.some(
    (id) => id.toString() === assignmentId.toString(),
  );

  if (!exists) {
    shift.assignments.push(assignmentId);

    shift.assignmentCount = shift.assignments.length;

    await shift.save();
  }

  return shift;
};

// ---------------- END SHIFT ----------------

const endShift = async (shift) => {
  const now = new Date();

  const minutes = (now - shift.startedAt) / 1000 / 60;

  const MAX_SHIFT_MINUTES = 720; // 12 hours

  if (minutes > MAX_SHIFT_MINUTES) {

    throw new Error(
      "Shift exceeds maximum allowed duration"
    );

  }

  const assignments = await Assignment.find({
    _id: { $in: shift.assignments },
    status: "completed",
  });

  let totalDistance = 0;

  for (const assignment of assignments) {
    totalDistance += assignment.tripDistanceMeters || 0;
  }

  shift.status = "completed";

  shift.endedAt = now;

  shift.completedAt = now;

  shift.totalMinutes = Math.round(minutes);

  shift.totalHours = Number((minutes / 60).toFixed(2));

  shift.totalDistanceMeters = totalDistance;

  shift.assignmentCount = assignments.length;

  shift.assignments = assignments.map((a) => a._id);

  await shift.save();

  return shift;
};

module.exports = {
  getOrCreateActiveShift,
  getActiveShift,
  attachAssignmentToShift,
  endShift,
};
