const Driver = require("../models/Driver");
const Assignment = require("../models/Assignment");
const DriverShift = require("../models/driverShift");
const DriverHistory = require("../models/driverHistory");

// ---------------- DASHBOARD ----------------

const getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    const driver = await Driver.findById(driverId).select(
      "fullname image phone_number status current_latitude current_longitude",
    );

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    const activeShift = await DriverShift.findOne({
      driver: driverId,
      status: "active",
    });

    const today = new Date();

    const history = await DriverHistory.findOne({
      driver: driverId,
      periodType: "day",
      period: today.getDate(),
      year: today.getFullYear(),
    });

    const activeRide = await Assignment.findOne({
      driver: driverId,
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

    const upcomingRides = await Assignment.find({
      driver: driverId,
      status: "pending",
    })
      .populate("booking")
      .sort({
        createdAt: 1,
      })
      .limit(5);

    res.json({
      driver,

      shift: activeShift,

      todayStats: history || {
        ridesCompleted: 0,
        totalHours: 0,
        grossPay: 0,
        netPay: 0,
      },

      activeRide,

      upcomingRides,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ---------------- ALL DRIVER ASSIGNMENTS ----------------

const getDriverAssignments = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    const assignments = await Assignment.find({
      driver: driverId,
    })
      .populate({
        path: "booking",
        populate: [
          {
            path: "child",
            select: "fullname image",
          },
          {
            path: "user",
            select: "fullname phone_number",
          },
        ],
      })
      .sort({
        createdAt: -1,
      });

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

// ---------------- CURRENT RIDE ----------------

const getDriverCurrentRide = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    const ride = await Assignment.findOne({
      driver: driverId,

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
    }).populate({
      path: "booking",
      populate: [
        {
          path: "child",
        },
        {
          path: "user",
        },
      ],
    });

    if (!ride) {
      return res.json({
        ride: null,
      });
    }

    res.json({
      ride,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  getDriverDashboard,
  getDriverAssignments,
  getDriverCurrentRide,
};
