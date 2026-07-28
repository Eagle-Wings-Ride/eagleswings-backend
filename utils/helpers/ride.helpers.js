const Assignment = require("../../models/Assignment");

// ---------------- CUSTOM ERROR ----------------

const throwError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

// ---------------- FINDERS ----------------

const findOrThrow = async (model, id, message, status = 404) => {
  const doc = await model.findById(id);

  if (!doc) {
    throwError(status, message);
  }

  return doc;
};

const getAssignmentOrThrow = async (assignmentId, populate = null) => {
  let query = Assignment.findById(assignmentId);

  if (populate) {
    query = query.populate(populate);
  }

  const assignment = await query;

  if (!assignment) {
    throwError(404, "Assignment not found");
  }

  return assignment;
};


// ---------------- SHIFT HELPERS ----------------

const validateShift = (shift) => {
  const validShifts = ["morning", "afternoon"];

  if (shift && !validShifts.includes(shift)) {
    throwError(400, "Invalid shift. Use 'morning' or 'afternoon'");
  }
};

const getShiftStatus = (assignments) => ({
  morningTaken: assignments.some((a) => a.shift === "morning"),
  afternoonTaken: assignments.some((a) => a.shift === "afternoon"),
  bothTakenByNull: assignments.some((a) => !a.shift),
});

const checkExistingAssignments = async (
  shiftStatus,
  bookingId,
  driverId,
  shift,
) => {
  if (shiftStatus.bothTakenByNull) {
    throwError(400, "Both shifts already taken by a driver");
  }

  if (!shift && (shiftStatus.morningTaken || shiftStatus.afternoonTaken)) {
    throwError(
      400,
      "Cannot assign full shift — one shift already taken. Assign remaining shift instead.",
    );
  }

  const sameShiftExists = await Assignment.findOne({
    booking: bookingId,
    driver: driverId,
    shift: shift || null,
  });

  if (sameShiftExists) {
    throwError(400, "Driver already assigned for this shift");
  }

  if (
    (shift === "morning" && shiftStatus.morningTaken) ||
    (shift === "afternoon" && shiftStatus.afternoonTaken)
  ) {
    const remaining = shift === "morning" ? "afternoon" : "morning";

    throwError(400, `Shift already taken. Only ${remaining} shift remaining`);
  }
};

// ---------------- DRIVER VALIDATION ----------------

const verifyDriverAssignment = (assignment, driverId) => {
  if (assignment.driver.toString() !== driverId.toString()) {
    throwError(403, "This assignment does not belong to the current driver.");
  }

  return true;
};

// ---------------- SOCKET ----------------

const emitRideStatus = (assignmentId, status) => {
  if (!global.io) return;

  global.io.to(`assignment_${assignmentId}`).emit("ride-status-update", {
    assignmentId,
    status,
  });

  global.io.to("admins").emit("ride-status-update", {
    assignmentId,
    status,
  });
};

// ---------------- STATE MACHINE ----------------

const STATUS_TIMESTAMPS = {
  accepted: "acceptedAt",
  enroute_pickup: "startedAt",
  arrived_pickup: "arrivedPickupAt",
  picked_up: "pickupTime",
  arrived_dropoff: "arrivedDropoffAt",
  completed: "completedAt",
  cancelled: "cancelledAt",
  rejected: "rejectedAt",
};

const ALLOWED_TRANSITIONS = {
  pending: ["accepted", "rejected"],

  accepted: ["enroute_pickup"],

  enroute_pickup: ["arrived_pickup"],

  arrived_pickup: ["picked_up"],

  picked_up: ["enroute_dropoff"],

  enroute_dropoff: ["arrived_dropoff"],

  arrived_dropoff: ["completed"],

  rejected: [],
  completed: [],
  cancelled: [],
};

const canTransition = (from, to) => {
  return ALLOWED_TRANSITIONS[from]?.includes(to);
};

const updateStatus = async (assignmentOrId, newStatus, options = {}) => {
  const assignment =
    assignmentOrId instanceof Assignment
      ? assignmentOrId
      : await getAssignmentOrThrow(assignmentOrId);

  if (!canTransition(assignment.status, newStatus)) {
    throwError(400, `Invalid transition ${assignment.status} → ${newStatus}`);
  }

  assignment.status = newStatus;

  const timestampField = STATUS_TIMESTAMPS[newStatus];

  if (timestampField) {
    assignment[timestampField] = new Date();
  }

  if (options.extra) {
    Object.assign(assignment, options.extra);
  }

  await assignment.save();

  emitRideStatus(assignment._id, assignment.status);

  return assignment;
};

// ---------------- RIDE ACTIONS ----------------

const acceptRide = async (assignment) => {
  return updateStatus(assignment, "accepted");
};

const rejectRide = async (assignment) => {
  return updateStatus(assignment, "rejected");
};

const startPickup = async (assignment) => {
  return updateStatus(assignment, "enroute_pickup");
};

const arrivePickup = async (assignment) => {
  return updateStatus(assignment, "arrived_pickup");
};

const pickupChild = async (assignment) => {
  return updateStatus(assignment, "picked_up");
};

const startDropoff = async (assignment) => {
  return updateStatus(assignment, "enroute_dropoff");
};

const arriveDropoff = async (assignment) => {
  return updateStatus(assignment, "arrived_dropoff");
};

const completeRide = async (assignment) => {
  return updateStatus(assignment, "completed");
};

const cancelRide = async (assignment) => {
  return updateStatus(assignment, "cancelled");
};

// ---------------- DISTANCE ----------------

const updateAssignmentDistance = (assignment, meters) => {
  if (assignment.status === "enroute_pickup") {
    assignment.pickupDistanceMeters = Math.round(meters);
  }

  if (assignment.status === "enroute_dropoff") {
    assignment.tripDistanceMeters = Math.round(meters);
  }

  assignment.distanceUpdatedAt = new Date();
};

module.exports = {
  throwError,
  findOrThrow,
  getAssignmentOrThrow,

  validateShift,
  getShiftStatus,
  checkExistingAssignments,

  verifyDriverAssignment,

  emitRideStatus,

  canTransition,
  updateStatus,

  acceptRide,
  rejectRide,
  startPickup,
  arrivePickup,
  pickupChild,
  startDropoff,
  arriveDropoff,
  completeRide,
  cancelRide,

  updateAssignmentDistance,
};
