const Assignment = require("../models/Assignment");

const {
  endShift,
  getActiveShift,
} = require("../utils/helpers/driverShift.helpers");

const {
  updateDriverHistoryFromShift,
} = require("../utils/helpers/driverHistory.helpers");


// ---------------- END SHIFT ----------------

const endDriverShift = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    const shift = await getActiveShift(driverId);

    if (!shift) {
      return res.status(404).json({
        message: "No active shift found",
      });
    }

    if (shift.historyUpdated) {
      return res.status(400).json({
        message: "Shift already processed",
      });
    }

    /*
  Driver cannot clock out
  while rides are still active
  */

    const activeAssignments = await Assignment.countDocuments({
      shiftRecord: shift._id,

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
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        message: "Cannot end shift while rides are active",
      });
    }

    const completedShift = await endShift(shift);

    await updateDriverHistoryFromShift(completedShift);

    res.json({
      message: "Shift completed",

      shift: completedShift,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

// ---------------- GET ACTIVE SHIFT ----------------

const getActiveDriverShift = async (req, res) => {
  try {
    const shift = await getActiveShift(req.user.driverId);

    res.json({
      shift,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  endDriverShift,

  getActiveDriverShift,
};
