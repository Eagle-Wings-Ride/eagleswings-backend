const Assignment = require('../../models/Assignment')

// 🧩 Throw custom error
const throwError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

// 🔍 Reusable DB finder
const findOrThrow = async (model, id, message, status = 404) => {
  const doc = await model.findById(id);
  if (!doc) throwError(status, message);
  return doc;
};

// 🕒 Validate shift
const validateShift = (shift) => {
  const validShifts = ["morning", "afternoon"];
  if (shift && !validShifts.includes(shift))
    throwError(400, "Invalid shift. Use 'morning' or 'afternoon'");
};

// ⚙️ Compute shift statuses
const getShiftStatus = (assignments) => ({
  morningTaken: assignments.some((a) => a.shift === "morning"),
  afternoonTaken: assignments.some((a) => a.shift === "afternoon"),
  bothTakenByNull: assignments.some((a) => !a.shift),
});

// 🚫 Validate against duplicates or invalid cases
const checkExistingAssignments = async (shiftStatus, bookingId, driverId, shift) => {
  if (shiftStatus.bothTakenByNull)
    throwError(400, "Both shifts already taken by a driver");

  if (!shift && (shiftStatus.morningTaken || shiftStatus.afternoonTaken))
    throwError(400, "Cannot assign full shift — one shift already taken. Assign remaining shift instead.");

  const sameShiftExists = await Assignment.findOne({
    booking: bookingId,
    driver: driverId,
    shift: shift || null,
  });
  if (sameShiftExists)
    throwError(400, "Driver already assigned for this shift");

  if (
    (shift === "morning" && shiftStatus.morningTaken) ||
    (shift === "afternoon" && shiftStatus.afternoonTaken)
  ) {
    const remaining = shift === "morning" ? "afternoon" : "morning";
    throwError(400, `Shift already taken. Only ${remaining} shift remaining`);
  }
};

module.exports = {
    throwError,
    findOrThrow,
    getShiftStatus,
    validateShift,
    checkExistingAssignments
}