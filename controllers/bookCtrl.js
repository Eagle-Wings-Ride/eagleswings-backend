const { Model } = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Book = require("../models/Book");
const Child = require("../models/Child");
const Admin = require("../models/Admin");
const Rates = require("../models/Rate");
const Assignment = require("../models/Assignment");
const { calculateBookingAmount } = require("../utils/helpers/book.helpers");
const { sendToTokens } = require("../utils/pushNotifications");
const {
  validateStartDate,
  validateCustomDays,
} = require("../utils/helpers/book.helpers");

// Enums
const {
  RideType,
  TripType,
  ScheduleType,
  BookingStatus,
  DaysOfWeek,
} = require("../utils/bookingEnum");


// Book ride
const bookRide = async (req, res) => {
  const { id: childId } = req.params;

  const {
    ride_type,
    trip_type,
    schedule_type,
    number_of_days,
    pickup_days,
    start_date,
    morning_from,
    morning_to,
    morning_time,
    afternoon_from,
    afternoon_to,
    afternoon_time,
    start_latitude,
    start_longitude,
    end_latitude,
    end_longitude,
  } = req.body;

  try {
    /** ---------------- ENUM VALIDATION ---------------- */
    if (!Object.values(RideType).includes(ride_type)) {
      return res.status(400).json({ message: "Invalid ride type." });
    }
    if (!Object.values(TripType).includes(trip_type)) {
      return res.status(400).json({ message: "Invalid trip type." });
    }
    if (!Object.values(ScheduleType).includes(schedule_type)) {
      return res.status(400).json({ message: "Invalid schedule type." });
    }

    /** ---------------- DATE VALIDATION ---------------- */
    validateStartDate(start_date);
    const parsedStartDate = new Date(start_date);
    parsedStartDate.setHours(0, 0, 0, 0); // safe for plain date

    /** ---------------- SCHEDULE LOGIC ---------------- */
    if (schedule_type === ScheduleType.CUSTOM) {
      validateCustomDays(number_of_days);
    } else if (number_of_days !== undefined) {
      return res.status(400).json({
        message: "number_of_days is only allowed for custom schedule",
      });
    }

    /** ---------------- PICKUP DAYS ---------------- */
    if (
      !Array.isArray(pickup_days) ||
      pickup_days.length === 0 ||
      !pickup_days.every((d) => Object.values(DaysOfWeek).includes(d))
    ) {
      return res.status(400).json({ message: "Invalid pickup days" });
    }

    /** ---------------- TRIP LOGIC ---------------- */
    const hasMorning = morning_from && morning_to && morning_time;

    const hasAfternoon = afternoon_from && afternoon_to && afternoon_time;

    if (trip_type === TripType.ONE_WAY) {
      if (hasMorning === hasAfternoon) {
        return res.status(400).json({
          message: "One-way ride must have either a morning or afternoon trip",
        });
      }
    }

    if (trip_type === TripType.RETURN) {
      if (!hasMorning || !hasAfternoon) {
        return res.status(400).json({
          message: "Return ride requires both morning and afternoon trips",
        });
      }
    }

    if (hasMorning && morning_from === morning_to) {
      return res.status(400).json({
        message: "Morning pickup and dropoff cannot be the same",
      });
    }

    if (hasAfternoon && afternoon_from === afternoon_to) {
      return res.status(400).json({
        message: "Afternoon pickup and dropoff cannot be the same",
      });
    }

    /** ---------------- CHILD OWNERSHIP ---------------- */
    const child = await Child.findById(childId);
    if (!child || child.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized child access" });
    }

    /** ---------------- DUPLICATE ACTIVE BOOKING ---------------- */
    const existing = await Book.findOne({
      child: childId,
      status: {
        $in: [
          BookingStatus.BOOKED,
          BookingStatus.PAID,
          BookingStatus.ASSIGNED,
          BookingStatus.ONGOING,
        ],
      },
    });

    if (existing) {
      return res.status(400).json({
        message: "An active booking already exists for this child",
      });
    }
    // Get mapped addresses from child based on selections
    const getAddress = (label) => {
      if (label === "home") return child.home_address;
      if (label === "school") return child.school_address;
      if (label === "daycare") return child.daycare_address;
      return null;
    };

    // Create booking
    const booking = new Book({
      ride_type,
      trip_type,
      schedule_type,
      number_of_days,
      pickup_days,
      start_date: parsedStartDate,

      morning_from,
      morning_to,
      morning_time,
      morning_from_address: getAddress(morning_from),
      morning_to_address: getAddress(morning_to),

      afternoon_from,
      afternoon_to,
      afternoon_time,
      afternoon_from_address: getAddress(afternoon_from),
      afternoon_to_address: getAddress(afternoon_to),

      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,

      user: req.user.userId,
      child: childId,
      status: BookingStatus.BOOKED,
    });

    await booking.save();

    // 🔔 Send notification to admins only
    const admins = await Admin.find({
      fcmTokens: { $exists: true, $ne: [] },
    }).select("fcmTokens");
    const adminTokens = admins.flatMap((a) => a.fcmTokens);

    if (adminTokens.length) {
      await sendToTokens(
        adminTokens,
        "New Booking Created",
        `A booking has been created for child ${child.name}. Awaiting payment.`,
        { bookingId: booking._id.toString() }
      );
    }

    res.status(201).json({
      message: "Ride booked successfully, proceed to make payment",
      booking,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "An error occurred while booking the ride." || error.message,
      });
  }
};


// Make Payment
const makePayment = async (req, res) => {
  const { bookingId, currency } = req.body;

  // ✅ Only CAD for now
  if (currency !== "cad") {
    return res.status(400).json({ message: "Only CAD currency is supported." });
  }

  try {
    // 🔎 Find booking
    const booking = await Book.findById(bookingId); // do not populate user
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 🔒 Validate booking belongs to user
    const bookingUserId = booking.user?._id
      ? booking.user._id.toString()
      : booking.user.toString(); // works for ObjectId or populated user

    if (bookingUserId !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // ✅ Validate booking status
    if (
      ![BookingStatus.BOOKED, BookingStatus.FAILED].includes(booking.status)
    ) {
      return res
        .status(400)
        .json({ message: "Booking is not eligible for payment" });
    }

    // 💲 Calculate amount
    const amount = await calculateBookingAmount(booking);

    // 🛒 Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Ride booking - ${booking.schedule_type}`,
              description: `Type: ${booking.ride_type}, Trip: ${booking.trip_type}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user.userId,
        type: "new",
      },
      success_url: `${process.env.CHECKOUT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CHECKOUT_URL}/payment-cancelled`,
    });

    return res.status(200).json({
      message: "Checkout session created successfully",
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating payment session:", error);
    return res.status(500).json({
      message: error.message || "Payment session creation failed",
    });
  }
};

// Renew Payment - to rewrite this
const renewBooking = async (req, res) => {
  const { bookingId, paymentMethodId, currency } = req.body;

  if (!["usd", "cad"].includes(currency)) {
    return res
      .status(400)
      .json({ message: "Invalid currency. Only USD and CAD are supported." });
  }

  try {
    const booking = await Book.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.user.toString() !== req.user.userId)
      return res.status(403).json({ message: "Unauthorized access" });

    // ✅ Only allow renewal within 3 days before expiry
    const now = new Date();
    const daysLeft = Math.ceil(
      (booking.serviceEndDate - now) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft > 3) {
      return res.status(400).json({ message: "Too early to renew" });
    }

    // ✅ Get rate info from DB
    const rate = await Rates.findOne();
    if (!rate)
      return res.status(404).json({ message: "Rate not configured yet." });

    const driverRates =
      booking.ride_type === "inhouse"
        ? rate.in_house_drivers
        : rate.freelance_drivers;

    let calculatedAmount = 0;

    if (booking.schedule_type === "custom") {
      if (!booking.number_of_days || booking.number_of_days <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid number of days for custom schedule" });
      }
      calculatedAmount =
        driverRates.daily[booking.trip_type] * booking.number_of_days;
    } else {
      const scheduleKey =
        booking.schedule_type === "2 weeks"
          ? "bi_weekly"
          : booking.schedule_type === "1 month"
          ? "monthly"
          : null;

      if (!scheduleKey) {
        return res.status(400).json({ message: "Invalid schedule type" });
      }

      calculatedAmount = driverRates[scheduleKey][booking.trip_type];
    }

    const amountInCents = Math.round(calculatedAmount * 100);

    // ✅ Create Stripe Payment Intent for renewal
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        bookingId,
        userId: req.user.userId,
        type: "renewal",
      },
    });

    res.status(200).json({
      message: "Renewal payment processing started.",
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Renewal Payment Error:", error.message);
    await Book.findByIdAndUpdate(bookingId, { status: BookingStatus.FAILED });
    res.status(500).json({
      message: "Payment failed. Please try again later.",
      error: error.message,
    });
  }
};

// find all rides created by the user
const getRidesByUser = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get rides
    const rides = await Book.find({ user: userId }).populate(
      "child",
      "fullname image grade age trip_type school"
    );

    // Fetch assignments for all rides
    const rideIds = rides.map((r) => r._id);
    const assignments = await Assignment.find({
      booking: { $in: rideIds },
    }).populate("driver", "fullname image status");

    // Map drivers into rides
    const ridesWithDrivers = rides.map((ride) => {
      const drivers = assignments
        .filter((a) => a.booking.toString() === ride._id.toString())
        .map((a) => a.driver);
      return { ...ride.toObject(), drivers };
    });

    res.status(200).json({ rides: ridesWithDrivers });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error getting rides", error: err.message });
  }
};

// get all rides by children
const getRideByChild = async (req, res) => {
  const { childId } = req.params;

  try {
    const bookings = await Book.find({ child: childId }).populate(
      "child",
      "fullname image grade age trip_type school"
    );

    const isChildOwnedByUser = bookings.every(
      (b) => b.user.toString() === req.user.userId.toString()
    );
    if (!isChildOwnedByUser)
      return res
        .status(403)
        .json({ message: "Unauthorized: Child does not belong to this user" });

    // Get assignments for these bookings
    const bookingIds = bookings.map((b) => b._id);
    const assignments = await Assignment.find({
      booking: { $in: bookingIds },
    }).populate("driver", "fullname image status");

    // Attach drivers
    const bookingsWithDrivers = bookings.map((b) => {
      const drivers = assignments
        .filter((a) => a.booking.toString() === b._id.toString())
        .map((a) => a.driver);
      return { ...b.toObject(), drivers };
    });

    res.status(200).json(bookingsWithDrivers);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get rides", error: err.message });
  }
};

// get all rides
const getAllRides = async (req, res) => {
  try {
    const rides = await Book.find({})
      .populate("user", "fullname address phone_number")
      .populate("child", "fullname image grade age trip_type school");

    // Get all assignments
    const rideIds = rides.map((r) => r._id);
    const assignments = await Assignment.find({
      booking: { $in: rideIds },
    }).populate("driver", "fullname image status");

    // Merge drivers into rides
    const ridesWithDrivers = rides.map((ride) => {
      const drivers = assignments
        .filter((a) => a.booking.toString() === ride._id.toString())
        .map((a) => ({
          id: a.driver?._id,
          fullname: a.driver?.fullname,
          driverStatus: a.driver?.status,
          image: a.driver?.image,
          assignmentStatus: a.status, // from assignment model
          shift: a.shift,
        }));
      return { ...ride.toObject(), drivers };
    });

    res.status(200).json({ rides: ridesWithDrivers });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching rides", error: err.message });
  }
};

//Get all Users with paid rides
const getAllPaidUsers = async (req, res) => {
  try {
    // 1️⃣ Get all paid bookings
    const rides = await Book.find({ status: "paid" })
      .populate("user", "fullname address phone_number")
      .populate("child", "fullname image grade age trip_type school");

    // 2️⃣ Get all assignments related to these rides
    const rideIds = rides.map((r) => r._id);
    const assignments = await Assignment.find({
      booking: { $in: rideIds },
    }).populate("driver", "fullname image status");

    // 3️⃣ Merge drivers into rides
    const ridesWithDrivers = rides.map((ride) => {
      const drivers = assignments
        .filter((a) => a.booking.toString() === ride._id.toString())
        .map((a) => a.driver);
      return { ...ride.toObject(), drivers };
    });

    // 4️⃣ Get unique users (avoid duplicates if multiple bookings)
    const users = rides.map((r) => r.user);
    const uniqueUsers = Array.from(
      new Set(users.map((u) => u._id.toString()))
    ).map((id) => users.find((u) => u._id.toString() === id));

    // 5️⃣ Send response
    res.status(200).json({ rides: ridesWithDrivers, users: uniqueUsers });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error fetching paid users", error: err.message });
  }
};

// Get recent rides for a child, including assigned drivers
const getRecentRides = async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.userId;

    if (!childId) return res.status(400).json({ message: "Child not found" });

    const child = await Child.findOne({ _id: childId, user: userId });
    if (!child)
      return res
        .status(403)
        .json({ message: "Child not registered under this user" });

    const bookings = await Book.find({ child: childId })
      .sort({ createdAt: -1 })
      .populate("user", "fullname email phone_number address")
      .populate("child", "fullname image grade age trip_type school");

    // Fetch assignments for these bookings
    const bookingIds = bookings.map((b) => b._id);
    const assignments = await Assignment.find({
      booking: { $in: bookingIds },
    }).populate("driver", "fullname image status");

    // Map drivers into bookings
    const bookingsWithDrivers = bookings.map((b) => {
      const drivers = assignments
        .filter((a) => a.booking.toString() === b._id.toString())
        .map((a) => a.driver);
      return { ...b.toObject(), drivers };
    });

    res.status(200).json({ bookings: bookingsWithDrivers });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch bookings", error: error.message });
  }
};

// Get rides by status
const getRidesByStatus = async (req, res) => {
  try {
    const { childId, status } = req.params;
    const authenticatedUserId = req.user.userId;

    if (!childId) {
      return res.status(400).json({ message: "Child not Found" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const child = await Child.findOne({
      _id: childId,
      user: authenticatedUserId,
    });

    if (!child) {
      return res
        .status(403)
        .json({ message: "Child not registered under this user" });
    }

    const query = {
      child: childId,
      status: { $regex: new RegExp(`^${status}$`, "i") },
    };

    // Fetch rides
    const rides = await Book.find(query).sort({ createdAt: -1 });

    res.status(200).json({ rides });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch rides", error: error.message });
  }
};

const updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;

    // Validate inputs
    if (!rideId) {
      return res.status(400).json({ message: "Ride not found" });
    }

    if (!status) {
      return res.status(400).json({ message: "New status is required" });
    }

    // Validate if the provided status is a valid BookingStatus
    if (!Object.values(BookingStatus).includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values are: ${Object.values(
          BookingStatus
        ).join(", ")}`,
      });
    }

    // Find the ride and update its status
    const ride = await Book.findByIdAndUpdate(
      rideId,
      { status },
      { new: true, runValidators: true }
    );

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Respond with the updated ride
    res.status(200).json({
      message: "Ride status updated successfully",
      ride,
    });
  } catch (error) {
    console.error("Error updating ride status:", error.message);
    res.status(500).json({
      message: "Failed to update ride status",
      error: error.message,
    });
  }
};

module.exports = {
  bookRide,
  makePayment,
  renewBooking,
  getRidesByUser,
  getRideByChild,
  getAllRides,
  getAllPaidUsers,
  getRecentRides,
  getRidesByStatus,
  updateRideStatus,
};
