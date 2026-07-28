const Assignment = require("../models/Assignment");

const { canStartRide } = require("../utils/helpers/book.helpers");

const {
  getAssignmentOrThrow,
  verifyDriverAssignment,
  acceptRide,
  rejectRide,
  startPickup,
  pickupChild,
  startDropoff,
  completeRide,
} = require("../utils/helpers/ride.helpers");

const {
  notifyParentRideAccepted,
  notifyAdminRideAccepted,
  notifyAdminRideRejected,
  notifyParentPickup,
  notifyParentDropoff,
} = require("../utils/helpers/notifications.helpers");

const {
  getOrCreateActiveShift,
  attachAssignmentToShift,
} = require("../utils/helpers/driverShift.helpers");

const {
  updateDriverHistoryAction,
} = require("../utils/helpers/driverHistory.helpers");


// ---------------- GET ASSIGNMENT ----------------
const getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate({
        path: "booking",
        populate: [
          {
            path: "user",
            select: "fullname email fcmTokens",
          },
          {
            path: "child",
            select: "fullname image",
          },
        ],
      })
      .populate("driver", "fullname image phone_number");

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    res.json({
      assignment,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ---------------- ACCEPT RIDE ----------------

const driverAcceptRide = async (req, res) => {
  try {
    const assignment = await getAssignmentOrThrow(req.params.id);

    verifyDriverAssignment(assignment, req.user.driverId);

    const updated = await acceptRide(assignment);

    // history
    await updateDriverHistoryAction(req.user.driverId, "accepted");

    // notifications
    await notifyParentRideAccepted(updated);

    await notifyAdminRideAccepted(updated);

    res.json({
      message: "Ride accepted",

      assignment: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- REJECT RIDE ----------------

const driverRejectRide = async (req, res) => {
  try {
    const assignment = await getAssignmentOrThrow(req.params.id);

    verifyDriverAssignment(assignment, req.user.driverId);

    const updated = await rejectRide(assignment);

    await updateDriverHistoryAction(req.user.driverId, "rejected");

    await notifyAdminRideRejected(updated);

    res.json({
      message: "Ride rejected",

      assignment: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- START PICKUP ----------------

const driverBeginPickup = async (req, res) => {
  try {
    const assignment = await getAssignmentOrThrow(req.params.id, {
      path: "booking",
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
      });
    }

    verifyDriverAssignment(assignment, req.user.driverId);

    const check = canStartRide(assignment.booking);

    if (!check.allowed) {
      return res.status(400).json({
        message: check.message,
      });
    }

    // AUTO START SHIFT

    const shift = await getOrCreateActiveShift(req.user.driverId, assignment);

    // attach assignment

    assignment.shiftRecord = shift._id;

    await assignment.save();

    await attachAssignmentToShift(shift._id, assignment._id);

    const updated = await startPickup(assignment);

    res.json({
      message: "Heading to pickup",

      assignment: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- PICKUP ----------------

const driverConfirmPickup = async (req, res) => {
  try {
    const assignment = await getAssignmentOrThrow(req.params.id);

    verifyDriverAssignment(assignment, req.user.driverId);

    const updated = await pickupChild(assignment);

    await notifyParentPickup(updated);

    res.json({
      message: "Child picked up",

      assignment: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- DROPOFF START ----------------

const driverStartDropoff = async (req, res) => {
  try {
    const assignment = await getAssignmentOrThrow(req.params.id);

    verifyDriverAssignment(assignment, req.user.driverId);

    const updated = await startDropoff(assignment);

    res.json({
      message: "Heading to dropoff",

      assignment: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- COMPLETE ----------------

const driverCompleteRide = async (req, res) => {
  try {
    const assignment = await getAssignmentOrThrow(req.params.id);

    verifyDriverAssignment(assignment, req.user.driverId);

    const updated = await completeRide(assignment);

    await notifyParentDropoff(updated);

    res.json({
      message: "Ride completed",

      assignment: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- DRIVER ACTIVE RIDES ----------------

const getDriverActiveAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({
      driver: req.user.driverId,

      status: {
        $in: [
          "accepted",
          "enroute_pickup",
          "arrived_pickup",
          "picked_up",
          "enroute_dropoff",
          "arrived_dropoff",
        ],
      },
    }).populate("booking");

    res.json({
      count: assignments.length,

      assignments,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  getAssignment,

  driverAcceptRide,

  driverRejectRide,

  driverBeginPickup,

  driverConfirmPickup,

  driverStartDropoff,

  driverCompleteRide,

  getDriverActiveAssignments,
};
