const Driver = require("../models/Driver");
const DriverShift = require("../models/driverShift");
const DriverHistory = require("../models/driverHistory");
const Assignment = require("../models/Assignment");
const Book = require("../models/Bookings");
const User = require("../models/User");
const Child = require("../models/Child");
const Ride = require("../models/Ride");

const { BookingStatus } = require("../utils/bookingEnum");

const ACTIVE_RIDE_STATUSES = [
  "accepted",
  "enroute_pickup",
  "arrived_pickup",
  "picked_up",
  "enroute_dropoff",
  "arrived_dropoff",
];

// ---------------- ADMIN DASHBOARD ----------------
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

// ---------------- ADMIN DRIVERS DASHBOARD ----------------

const getAdminDriverDashboard = async (req, res) => {
  try {
    // BASIC COUNTS

    const totalDrivers = await Driver.countDocuments();

    const approvedDrivers = await Driver.countDocuments({
      isDriverApproved: true,
    });

    const pendingDrivers = await Driver.countDocuments({
      isDriverApproved: false,
    });

    // DRIVER STATUS

    const onlineDrivers = await Driver.countDocuments({
      status: "online",
    });

    const drivingDrivers = await Driver.countDocuments({
      status: "driving",
    });

    // ACTIVE RIDES

    const activeRides = await Assignment.find({
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
    })
      .populate({
        path: "driver",
        select: "fullname phone_number image status",
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
      })
      .limit(10);

    // RECENT DRIVERS

    const recentDrivers = await Driver.find()
      .select(
        "fullname email phone_number image status isDriverApproved createdAt",
      )
      .sort({
        createdAt: -1,
      })
      .limit(10);

    // DRIVERS CURRENTLY WORKING TODAY

    const today = new Date();

    const activeShifts = await DriverShift.find({
      status: "active",
      date: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      },
    }).populate("driver", "fullname phone_number image");

    res.json({
      stats: {
        totalDrivers,
        approvedDrivers,
        pendingDrivers,
        onlineDrivers,
        drivingDrivers,
      },

      recentDrivers,

      activeShifts,

      activeRides,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ---------------- ADMIN USERS DASHBOARD ----------------

const getAdminUserDashboard = async (req, res) => {
  try {
    // ---------------- STATS ----------------

    const totalUsers = await User.countDocuments();

    const verifiedUsers = await User.countDocuments({
      isVerified: true,
    });

    const unverifiedUsers = await User.countDocuments({
      isVerified: false,
    });

    const totalChildren = await Child.countDocuments();

    const usersWithBookings = await Book.distinct("user");

    const usersWithoutBookings = await User.countDocuments({
      _id: {
        $nin: usersWithBookings,
      },
    });

    // ---------------- RECENT USERS ----------------

    const recentUsers = await User.find()
      .select("fullname email phone_number address isVerified createdAt")
      .sort({
        createdAt: -1,
      })
      .limit(10);

    // ---------------- USERS + CHILDREN ----------------

    const usersWithChildren = await User.aggregate([
      {
        $lookup: {
          from: "children",
          localField: "_id",
          foreignField: "user",
          as: "children",
        },
      },

      {
        $project: {
          fullname: 1,
          email: 1,
          phone_number: 1,
          childrenCount: {
            $size: "$children",
          },
        },
      },

      {
        $sort: {
          childrenCount: -1,
        },
      },

      {
        $limit: 10,
      },
    ]);

    // ---------------- RECENT BOOKINGS ----------------

    const recentBookings = await Book.find()
      .populate("user", "fullname email phone_number")
      .populate("child", "fullname image")
      .sort({
        createdAt: -1,
      })
      .limit(10);

    res.json({
      stats: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        totalChildren,
        usersWithoutBookings: usersWithoutBookings,
      },

      recentUsers,

      usersWithChildren,

      recentBookings,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ---------------- ADMIN BOOKINGS DASHBOARD ----------------

const getAdminBookingDashboard = async (req, res) => {
  try {
    // ---------------- STATS ----------------

    const totalBookings = await Book.countDocuments();

    const paidBookings = await Book.countDocuments({
      status: "paid",
    });

    const assignedBookings = await Book.countDocuments({
      status: "assigned",
    });

    const cancelledBookings = await Book.countDocuments({
      status: "cancelled",
    });

    const expiredBookings = await Book.countDocuments({
      status: "expired",
    });

    const pendingPayment = await Book.countDocuments({
      status: "booked",
    });

    // ---------------- UNASSIGNED BOOKINGS ----------------

    const unassignedBookings = await Book.find({
      status: "paid",
    })
      .populate({
        path: "user",
        select: "fullname phone_number email",
      })
      .populate({
        path: "child",
        select: "fullname image age",
      })
      .sort({
        createdAt: -1,
      })
      .limit(10);

    // ---------------- RECENT BOOKINGS ----------------

    const recentBookings = await Book.find()
      .populate({
        path: "user",
        select: "fullname phone_number",
      })
      .populate({
        path: "child",
        select: "fullname image",
      })
      .sort({
        createdAt: -1,
      })
      .limit(10);

    // ---------------- ACTIVE BOOKINGS ----------------

    const activeBookings = await Book.find({
      status: {
        $in: ["paid", "assigned"],
      },
    })
      .populate("child", "fullname image")
      .populate("user", "fullname phone_number")
      .sort({
        serviceStartDate: 1,
      })
      .limit(10);

    // ---------------- UPCOMING RIDES ----------------

    const upcomingAssignments = await Assignment.find({
      status: {
        $in: ["pending", "accepted"],
      },
    })
      .populate({
        path: "driver",
        select: "fullname phone_number image",
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
        createdAt: 1,
      })
      .limit(10);

    res.json({
      stats: {
        totalBookings,
        paidBookings,
        assignedBookings,
        cancelledBookings,
        expiredBookings,
        pendingPayment,
      },

      unassignedBookings,

      recentBookings,

      activeBookings,

      upcomingAssignments,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


// ---------------- ADMIN RIDES DASHBOARD ----------------

const getAdminRideDashboard = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ---------------- STATS ----------------

    const ridesToday = await Ride.countDocuments({
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    const completedRides = await Ride.countDocuments({
      status: "completed",
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    const activeRides = await Ride.countDocuments({
      status: {
        $in: ["enroute_pickup", "picked_up"],
      },
    });

    const cancelledRides = await Ride.countDocuments({
      status: "cancelled",
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    const pendingRides = await Ride.countDocuments({
      status: "pending",
    });

    // ---------------- ACTIVE RIDES ----------------

    const currentRides = await Ride.find({
      status: {
        $in: ["enroute_pickup", "picked_up"],
      },
    })
      .populate({
        path: "driver",
        select:
          "fullname phone_number image current_latitude current_longitude",
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
            select: "fullname phone_number address",
          },
        ],
      })
      .sort({
        updatedAt: -1,
      })
      .limit(20);

    // ---------------- TODAY COMPLETED ----------------

    const recentCompleted = await Ride.find({
      status: "completed",
    })
      .populate("driver", "fullname image")
      .populate({
        path: "booking",

        populate: {
          path: "child",
          select: "fullname",
        },
      })
      .sort({
        completedAt: -1,
      })
      .limit(10);

    // ---------------- DRIVERS CURRENTLY ACTIVE ----------------

    const activeDrivers = await Driver.find({
      status: {
        $in: ["driving", "online"],
      },
    })
      .select(
        "fullname image phone_number status current_latitude current_longitude",
      )
      .limit(20);

    // ---------------- WAITING ASSIGNMENTS ----------------

    const waitingAssignments = await Assignment.find({
      status: "pending",
    })
      .populate("booking")
      .populate("driver", "fullname phone_number")
      .sort({
        createdAt: 1,
      })
      .limit(10);

    res.json({
      stats: {
        ridesToday,

        completedRides,

        activeRides,

        cancelledRides,

        pendingRides,
      },

      currentRides,

      recentCompleted,

      activeDrivers,

      waitingAssignments,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAdminDriverDashboard,
  getAdminUserDashboard,
  getAdminBookingDashboard,
  getAdminRideDashboard,
};
