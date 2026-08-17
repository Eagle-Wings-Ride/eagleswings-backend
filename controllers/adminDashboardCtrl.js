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

      Ride.countDocuments({
        status: {
          $in: ["enroute_pickup", "picked_up"],
        },
      }),

      Ride.countDocuments({
        status: "pending",
      }),

      Ride.countDocuments({
        status: "completed",
        updatedAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

    //   Ride.countDocuments({
    //     status: "cancelled",
    //     updatedAt: {
    //       $gte: startOfToday,
    //       $lte: endOfToday,
    //     },
    //   }),

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

    return res.status(200).json({
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
    console.error("Error fetching admin dashboard:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ---------------- ADMIN DRIVERS DASHBOARD ----------------

const getAdminDriverDashboard = async (req, res) => {
  try {
    // ---------------- TODAY ----------------

    const today = new Date();

    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // ---------------- STATS ----------------

    const [
      totalDrivers,
      approvedDrivers,
      unapprovedDrivers,
      onlineDrivers,
      drivingDrivers,
    ] = await Promise.all([
      Driver.countDocuments(),

      Driver.countDocuments({
        isDriverApproved: true,
      }),

      Driver.countDocuments({
        isDriverApproved: false,
      }),

      Driver.countDocuments({
        status: "online",
      }),

      Driver.countDocuments({
        status: "driving",
      }),
    ]);

    // ---------------- RECENT DRIVERS ----------------

    const recentDrivers = await Driver.find()
      .select(
        "_id fullname email phone_number image status isDriverApproved createdAt",
      )
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ---------------- ACTIVE SHIFTS TODAY ----------------

    const activeShifts = await DriverShift.find({
      status: "active",
      date: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .select("_id driver date shift status startedAt assignmentCount")
      .populate({
        path: "driver",
        select: "_id fullname phone_number image status",
      })
      .sort({
        startedAt: 1,
      })
      .lean();

    // ---------------- ACTIVE ASSIGNMENTS ----------------

    const activeAssignments = await Assignment.find({
      status: {
        $in: ACTIVE_RIDE_STATUSES,
      },
    })
      .select("_id booking driver shift status createdAt")
      .populate({
        path: "driver",
        select: "_id fullname phone_number image status",
      })
      .populate({
        path: "booking",
        select: "_id child user serviceStartDate serviceEndDate",
        populate: [
          {
            path: "child",
            select: "_id fullname image",
          },
          {
            path: "user",
            select: "_id fullname phone_number",
          },
        ],
      })
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ---------------- RESPONSE ----------------

    return res.status(200).json({
      stats: {
        totalDrivers,
        approvedDrivers,
        unapprovedDrivers,
        onlineDrivers,
        drivingDrivers,
      },

      recentDrivers: recentDrivers.map((driver) => ({
        id: driver._id,
        fullname: driver.fullname,
        email: driver.email,
        phone_number: driver.phone_number,
        image: driver.image,
        status: driver.status,
        isApproved: driver.isDriverApproved,
        createdAt: driver.createdAt,
      })),

      activeShifts: activeShifts.map((shift) => ({
        id: shift._id,
        date: shift.date,
        shift: shift.shift,
        status: shift.status,
        startedAt: shift.startedAt,
        assignmentCount: shift.assignmentCount,

        driver: shift.driver
          ? {
              id: shift.driver._id,
              fullname: shift.driver.fullname,
              phone_number: shift.driver.phone_number,
              image: shift.driver.image,
              status: shift.driver.status,
            }
          : null,
      })),

      activeAssignments: activeAssignments.map((assignment) => ({
        id: assignment._id,
        bookingId: assignment.booking?._id || null,
        shift: assignment.shift,
        status: assignment.status,
        createdAt: assignment.createdAt,

        driver: assignment.driver
          ? {
              id: assignment.driver._id,
              fullname: assignment.driver.fullname,
              phone_number: assignment.driver.phone_number,
              image: assignment.driver.image,
              status: assignment.driver.status,
            }
          : null,

        child: assignment.booking?.child
          ? {
              id: assignment.booking.child._id,
              fullname: assignment.booking.child.fullname,
              image: assignment.booking.child.image,
            }
          : null,

        parent: assignment.booking?.user
          ? {
              id: assignment.booking.user._id,
              fullname: assignment.booking.user.fullname,
              phone_number: assignment.booking.user.phone_number,
            }
          : null,

        serviceStartDate: assignment.booking?.serviceStartDate || null,

        serviceEndDate: assignment.booking?.serviceEndDate || null,
      })),
    });
  } catch (err) {
    console.error("Error fetching admin driver dashboard:", err);

    return res.status(500).json({
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
      .select(" _id fullname email phone_number isVerified createdAt")
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

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

      // Only users who actually have children
      {
        $match: {
          "children.0": {
            $exists: true,
          },
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
      .select(
        "_id status ride_type trip_type serviceStartDate serviceEndDate user child createdAt",
      )
      .populate({
        path: "user",
        select: "_id fullname email phone_number",
      })
      .populate({
        path: "child",
        select: "_id fullname image",
      })
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ---------------- RESPONSE ----------------

    return res.status(200).json({
      stats: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        totalChildren,
        usersWithoutBookings,
      },

      recentUsers: recentUsers.map((user) => ({
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        phone_number: user.phone_number,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      })),

      usersWithChildren: usersWithChildren.map((user) => ({
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        phone_number: user.phone_number,
        childrenCount: user.childrenCount,
      })),

      recentBookings: recentBookings.map((booking) => ({
        id: booking._id,
        status: booking.status,
        rideType: booking.ride_type,
        tripType: booking.trip_type,
        serviceStartDate: booking.serviceStartDate,
        serviceEndDate: booking.serviceEndDate,

        user: booking.user
          ? {
              id: booking.user._id,
              fullname: booking.user.fullname,
              email: booking.user.email,
              phone_number: booking.user.phone_number,
            }
          : null,

        child: booking.child
          ? {
              id: booking.child._id,
              fullname: booking.child.fullname,
              image: booking.child.image,
            }
          : null,

        createdAt: booking.createdAt,
      })),
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

    const [
      totalBookings,
      paidBookings,
      pendingPayment,
      expiredBookings,
      cancelledBookings,
    ] = await Promise.all([
      Book.countDocuments(),

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
        status: BookingStatus.CANCELLED,
      }),
    ]);

    // ---------------- PAID BOOKINGS WITHOUT ASSIGNMENT ----------------
    //
    // A paid booking does NOT automatically mean assigned.
    //
    // Assignment is a separate document.
    //
    // Therefore we find paid bookings whose _id does not exist
    // in Assignment.booking.

    const assignedBookingIds = await Assignment.distinct("booking");

    const unassignedBookings = await Book.find({
      status: BookingStatus.PAID,
      _id: {
        $nin: assignedBookingIds,
      },
    })
      .select(
        "_id status ride_type trip_type schedule_type start_date serviceStartDate serviceEndDate user child createdAt",
      )
      .populate({
        path: "user",
        select: "_id fullname phone_number email",
      })
      .populate({
        path: "child",
        select: "_id fullname image age grade",
      })
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ---------------- RECENT BOOKINGS ----------------

    const recentBookings = await Book.find()
      .select(
        "_id status ride_type trip_type schedule_type start_date serviceStartDate serviceEndDate user child createdAt",
      )
      .populate({
        path: "user",
        select: "_id fullname phone_number email",
      })
      .populate({
        path: "child",
        select: "_id fullname image age grade",
      })
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ---------------- ACTIVE / UPCOMING BOOKINGS ----------------
    //
    // Booking lifecycle only.
    //
    // We do NOT use assignment status here.
    //
    // Paid bookings remain "paid" even when a driver has
    // accepted or is currently performing the ride.

    const activeBookings = await Book.find({
      status: BookingStatus.PAID,
      serviceEndDate: {
        $gte: new Date(),
      },
    })
      .select(
        "_id status ride_type trip_type schedule_type start_date serviceStartDate serviceEndDate user child createdAt",
      )
      .populate({
        path: "user",
        select: "_id fullname phone_number",
      })
      .populate({
        path: "child",
        select: "_id fullname image",
      })
      .sort({
        serviceStartDate: 1,
      })
      .limit(10)
      .lean();

    // ---------------- RESPONSE ----------------

    return res.status(200).json({
      stats: {
        totalBookings,
        paidBookings,
        pendingPayment,
        expiredBookings,
        cancelledBookings,
        unassignedPaidBookings: unassignedBookings.length,
      },

      unassignedBookings: unassignedBookings.map((booking) => ({
        id: booking._id,
        status: booking.status,

        rideType: booking.ride_type,
        tripType: booking.trip_type,
        scheduleType: booking.schedule_type,

        startDate: booking.start_date,
        serviceStartDate: booking.serviceStartDate,
        serviceEndDate: booking.serviceEndDate,

        user: booking.user
          ? {
              id: booking.user._id,
              fullname: booking.user.fullname,
              phone_number: booking.user.phone_number,
              email: booking.user.email,
            }
          : null,

        child: booking.child
          ? {
              id: booking.child._id,
              fullname: booking.child.fullname,
              image: booking.child.image,
              age: booking.child.age,
              grade: booking.child.grade,
            }
          : null,

        createdAt: booking.createdAt,
      })),

      recentBookings: recentBookings.map((booking) => ({
        id: booking._id,
        status: booking.status,

        rideType: booking.ride_type,
        tripType: booking.trip_type,
        scheduleType: booking.schedule_type,

        startDate: booking.start_date,
        serviceStartDate: booking.serviceStartDate,
        serviceEndDate: booking.serviceEndDate,

        user: booking.user
          ? {
              id: booking.user._id,
              fullname: booking.user.fullname,
              phone_number: booking.user.phone_number,
              email: booking.user.email,
            }
          : null,

        child: booking.child
          ? {
              id: booking.child._id,
              fullname: booking.child.fullname,
              image: booking.child.image,
              age: booking.child.age,
              grade: booking.child.grade,
            }
          : null,

        createdAt: booking.createdAt,
      })),

      activeBookings: activeBookings.map((booking) => ({
        id: booking._id,
        status: booking.status,

        rideType: booking.ride_type,
        tripType: booking.trip_type,
        scheduleType: booking.schedule_type,

        startDate: booking.start_date,
        serviceStartDate: booking.serviceStartDate,
        serviceEndDate: booking.serviceEndDate,

        user: booking.user
          ? {
              id: booking.user._id,
              fullname: booking.user.fullname,
              phone_number: booking.user.phone_number,
            }
          : null,

        child: booking.child
          ? {
              id: booking.child._id,
              fullname: booking.child.fullname,
              image: booking.child.image,
            }
          : null,

        createdAt: booking.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching admin booking dashboard:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// ---------------- ADMIN RIDES DASHBOARD ----------------

const getAdminRideDashboard = async (req, res) => {
  try {
    const today = new Date();

    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // ---------------- STATS ----------------
    //
    // Ride dashboard uses Ride documents only.
    // Assignment/Booking statistics belong to their own dashboards.

    const [
      ridesToday,
      completedRidesToday,
      activeRides,
      pendingRides,
    ] = await Promise.all([
      // Rides scheduled for today
      Ride.countDocuments({
        serviceDate: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

      // Completed rides today
      //
      // Ride does not have completedAt.
      // updatedAt represents the latest ride state change,
      // so for completed rides it represents completion time.
      Ride.countDocuments({
        status: "completed",
        updatedAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

      // Currently active rides
      Ride.countDocuments({
        status: {
          $in: ["enroute_pickup", "picked_up"],
        },
      }),

      // Rides cancelled today
      //
      // This is going to be for Ride cancellation, not Booking cancellation.
    //   Ride.countDocuments({
    //     status: "cancelled",
    //     updatedAt: {
    //       $gte: startOfToday,
    //       $lte: endOfToday,
    //     },
    //   }),

      // Rides waiting to start
      Ride.countDocuments({
        status: "pending",
      }),
    ]);

    // ---------------- CURRENT RIDES ----------------
    //
    // Only actual Ride information.
    // No Assignment dashboard data.
    // No driver availability dashboard data.

    const currentRides = await Ride.find({
      status: {
        $in: ["enroute_pickup", "picked_up"],
      },
    })
      .select(
        "_id booking assignment driver serviceDate status lastLocation createdAt updatedAt",
      )
      .populate({
        path: "driver",
        select: "_id fullname phone_number image",
      })
      .populate({
        path: "booking",
        select: "_id child user ride_type trip_type",
        populate: [
          {
            path: "child",
            select: "_id fullname image",
          },
          {
            path: "user",
            select: "_id fullname phone_number",
          },
        ],
      })
      .sort({
        updatedAt: -1,
      })
      .limit(20)
      .lean();

    // ---------------- RECENT COMPLETED RIDES ----------------

    const recentCompleted = await Ride.find({
      status: "completed",
      updatedAt: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    })
      .select(
        "_id booking assignment driver serviceDate status createdAt updatedAt",
      )
      .populate({
        path: "driver",
        select: "_id fullname image phone_number",
      })
      .populate({
        path: "booking",
        select: "_id child user ride_type trip_type",
        populate: [
          {
            path: "child",
            select: "_id fullname image",
          },
          {
            path: "user",
            select: "_id fullname phone_number",
          },
        ],
      })
      .sort({
        updatedAt: -1,
      })
      .limit(10)
      .lean();

    // ---------------- RESPONSE ----------------

    return res.status(200).json({
      stats: {
        ridesToday,
        completedRidesToday,
        activeRides,
        pendingRides,
      },

      currentRides: currentRides.map((ride) => ({
        id: ride._id,

        bookingId: ride.booking?._id || ride.booking || null,

        assignmentId: ride.assignment || null,

        serviceDate: ride.serviceDate,

        status: ride.status,

        lastLocation: ride.lastLocation || null,

        driver: ride.driver
          ? {
              id: ride.driver._id,
              fullname: ride.driver.fullname,
              phone_number: ride.driver.phone_number,
              image: ride.driver.image,
            }
          : null,

        child: ride.booking?.child
          ? {
              id: ride.booking.child._id,
              fullname: ride.booking.child.fullname,
              image: ride.booking.child.image,
            }
          : null,

        parent: ride.booking?.user
          ? {
              id: ride.booking.user._id,
              fullname: ride.booking.user.fullname,
              phone_number: ride.booking.user.phone_number,
            }
          : null,

        rideType: ride.booking?.ride_type || null,

        tripType: ride.booking?.trip_type || null,

        createdAt: ride.createdAt,

        updatedAt: ride.updatedAt,
      })),

      recentCompleted: recentCompleted.map((ride) => ({
        id: ride._id,

        bookingId: ride.booking?._id || ride.booking || null,

        assignmentId: ride.assignment || null,

        serviceDate: ride.serviceDate,

        status: ride.status,

        driver: ride.driver
          ? {
              id: ride.driver._id,
              fullname: ride.driver.fullname,
              image: ride.driver.image,
              phone_number: ride.driver.phone_number,
            }
          : null,

        child: ride.booking?.child
          ? {
              id: ride.booking.child._id,
              fullname: ride.booking.child.fullname,
              image: ride.booking.child.image,
            }
          : null,

        parent: ride.booking?.user
          ? {
              id: ride.booking.user._id,
              fullname: ride.booking.user.fullname,
              phone_number: ride.booking.user.phone_number,
            }
          : null,

        rideType: ride.booking?.ride_type || null,

        tripType: ride.booking?.trip_type || null,

        createdAt: ride.createdAt,

        completedAt: ride.updatedAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching admin ride dashboard:", err);

    return res.status(500).json({
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
