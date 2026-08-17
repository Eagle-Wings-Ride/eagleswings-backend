const Admin = require("../models/Admin");
const Driver = require("../models/Driver");
const Book = require("../models/Bookings");
const Assignment = require("../models/Assignment");
const { sendToTokens } = require("../utils/pushNotifications");
const {
  throwError,
  findOrThrow,
  getShiftStatus,
  validateShift,
  checkExistingAssignments,
} = require("../utils/helpers/ride.helpers");

const { getServiceDates } = require("../utils/helpers/schedule.helpers");

// Approve Driver after Vetting
const approveDriver = async (req, res) => {
  const { id: driverId } = req.params;
  const { is_approved } = req.body;
  const adminId = req.user?.adminId;
  const role = req.user?.role;

  try {
    // 🔒 Validate admin authentication
    if (!adminId) throwError(401, "Unauthorized: Admin ID missing");

    // 🔐 Validate admin role
    if (!["admin", "superadmin"].includes(role)) {
      throwError(
        403,
        "Forbidden: Only admin or superadmin can approve drivers",
      );
    }

    // 🧾 Validate input
    if (typeof is_approved !== "boolean") {
      throwError(400, "Invalid input: is_approved must be a boolean");
    }

    // 🔎 Validate admin and driver
    await findOrThrow(Admin, adminId, "Admin not found");

    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { isDriverApproved: is_approved },
      { new: true, runValidators: true },
    );

    if (!updatedDriver) throwError(404, "Driver not found");

    // ✅ Success response
    return res.status(200).json({
      message: `Driver has been ${is_approved ? "approved" : "disapproved"}!`,
      driver: updatedDriver,
    });
  } catch (error) {
    console.error("Error approving driver:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Error approving driver",
    });
  }
};

// Assign driver to the ride (booking)
const assignDriverToRide = async (req, res) => {
  const { driverId, shift } = req.body;
  const { bookingId } = req.params;
  const adminId = req.user?.adminId;

  try {
    // 🔒 Validate admin
    if (!adminId) throwError(401, "Unauthorized: Admin ID missing");
    await findOrThrow(Admin, adminId, "Admin not found");

    // 🔎 Validate booking
    const booking = await findOrThrow(Book, bookingId, "Booking not found");
    if (!["paid", "assigned"].includes(booking.status))
      throwError(
        400,
        "Booking must be paid or active before assigning a driver",
      );

    // 🔎 Validate driver
    const driver = await findOrThrow(Driver, driverId, "Driver not found");
    if (!driver.isDriverApproved)
      throwError(400, "Driver has not been approved yet");

    // ⏰ Validate shift input
    validateShift(shift);

    // ⚙️ Check shift availability
    const acceptedAssignments = await Assignment.find({
      booking: bookingId,
      status: "accepted",
    });
    const shiftStatus = getShiftStatus(acceptedAssignments);

    // 🚫 Handle invalid shift or duplicate
    await checkExistingAssignments(shiftStatus, bookingId, driverId, shift);

    // 🆕 Create assignment

    const assignment = await Assignment.create({
      booking: bookingId,
      driver: driverId,
      shift,
      assignedBy: adminId,
      status: "pending",
    });

    // 🔔 Notify driver
    if (driver.fcmTokens?.length) {
      await sendToTokens(
        driver.fcmTokens,
        "New Ride Assigned",
        "You have a new ride request. Please accept it.",
        { bookingId, driverId },
      );
    }

    return res.status(200).json({
      message: "Driver assignment created (pending driver response)",
      assignment: {
        id: assignment._id,
        driverId: driver._id,
        driverName: `${driver.fullname}`,
        shift: assignment.shift,
        status: assignment.status,
        bookingId: bookingId,
      },
    });
  } catch (error) {
    console.error("Error assigning driver:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Error assigning driver",
    });
  }
};

// Unassign Driver from ride
const UnassignDriverFromRide = async (req, res) => {
  const { driverId } = req.body;
  const { bookingId } = req.params;
  const adminId = req.user?.adminId;

  try {
    // 🔒 Validate admin
    if (!adminId) throwError(401, "Unauthorized: Admin ID missing");
    await findOrThrow(Admin, adminId, "Admin not found");

    // 🧾 Find and remove assignment
    const assignment = await Assignment.findOneAndDelete({
      booking: bookingId,
      driver: driverId,
    });
    if (!assignment)
      throwError(404, "No assignment found for this driver and booking");

    await Book.findByIdAndUpdate(assignment.booking, {
      status: "paid",
    });

    // 🔔 Notify driver
    const driver = await Driver.findById(driverId);
    if (driver?.fcmTokens?.length > 0) {
      await sendToTokens(
        driver.fcmTokens,
        "Ride Unassigned",
        "You have been unassigned from a ride by the admin.",
        { bookingId, driverId },
      );
    }

    return res.status(200).json({
      message: "Driver unassigned successfully",
      assignment: {
        bookingId: bookingId,
        driverId: driverId,
        shift: assignment.shift,
      },
    });
  } catch (error) {
    console.error("Error unassigning driver:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Error unassigning driver",
    });
  }
};

// get driver by location (in progress)
const getDriverByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    // const authenticatedUserId = req.user.userId

    if (!location) {
      return res.status(400).json({ message: "Location is required" });
    }

    const query = {
      location: { $regex: new RegExp(`^${location}$`, "i") },
    };

    // Fetch drivers
    const driver = await Driver.find(query).sort({ createdAt: -1 });

    res.status(200).json({ driver });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch drivers", error: error.message });
  }
};

module.exports = {
  approveDriver,
  assignDriverToRide,
  UnassignDriverFromRide,
  // getDriverByLocation
};
