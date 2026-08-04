const Driver = require("../models/Driver");
const DriverShift = require("../models/driverShift");
const Assignment = require("../models/Assignment");
const Book = require("../models/Bookings");
const User = require("../models/User");
const Child = require("../models/Child");

const { BookingStatus } = require("../utils/bookingEnum");

const ACTIVE_RIDE_STATUSES = [
  "accepted",
  "enroute_pickup",
  "arrived_pickup",
  "picked_up",
  "enroute_dropoff",
  "arrived_dropoff",
];

const getAdminDashboard = async (req, res) => {
  try {
    if (!req.user.adminId) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    const today = new Date();

    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);

    const [
      totalDrivers,
      onlineDrivers,
      offlineDrivers,
      activeShifts,

      activeRides,
      pendingRides,
      completedToday,
      cancelledToday,

      paidBookings,
      pendingPaymentBookings,
      expiredBookings,
      expiringSoonBookings,

      totalParents,
      totalChildren,
    ] = await Promise.all([

      Driver.countDocuments(),

      Driver.countDocuments({
        status: "online",
      }),

      Driver.countDocuments({
        status: "offline",
      }),

      DriverShift.countDocuments({
        status: "active",
      }),

      Assignment.countDocuments({
        status: {
          $in: ACTIVE_RIDE_STATUSES,
        },
      }),

      Assignment.countDocuments({
        status: "pending",
      }),

      Assignment.countDocuments({
        completedAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

      Assignment.countDocuments({
        cancelledAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

      Book.countDocuments({
        status: BookingStatus.PAID,
      }),

      Book.countDocuments({
        status: BookingStatus.BOOKED,
      }),

      Book.countDocuments({
        status: BookingStatus.EXPIRED,
      }),

      Book.countDocuments({
        status: BookingStatus.PAID,
        serviceEndDate: {
          $gte: today,
          $lte: threeDays,
        },
      }),

      User.countDocuments(),

      Child.countDocuments(),
    ]);

    res.json({
      drivers: {
        total: totalDrivers,
        online: onlineDrivers,
        offline: offlineDrivers,
        activeShifts,
      },

      rides: {
        active: activeRides,
        pending: pendingRides,
        completedToday,
        cancelledToday,
      },

      bookings: {
        paid: paidBookings,
        pendingPayment: pendingPaymentBookings,
        expired: expiredBookings,
        expiringSoon: expiringSoonBookings,
      },

      users: {
        parents: totalParents,
        children: totalChildren,
      },
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
};