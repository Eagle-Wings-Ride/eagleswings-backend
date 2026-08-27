const { sendToTokens } = require("../pushNotifications");
const Admin = require("../../models/Admin");

/**
 * Get admin notification tokens
 */
const getAdminTokens = async () => {
  const admins = await Admin.find({
    role: "admin",
    fcmTokens: {
      $exists: true,
      $ne: [],
    },
  }).select("fcmTokens");

  return admins.flatMap((admin) => admin.fcmTokens || []);
};

/**
 * DRIVER ASSIGNED
 *
 * Parent notification
 */
const notifyRideAssigned = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Driver Assigned",
      `A driver has been assigned for ${assignment.booking.child.fullname}`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyRideAssigned:", err);
  }
};

/**
 * DRIVER ACCEPTED
 *
 * Parent notification
 */
const notifyParentRideAccepted = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Ride Accepted",
      `Your driver has accepted the ride for ${assignment.booking.child.fullname}.`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyParentRideAccepted:", err);
  }
};

/**
 * DRIVER ACCEPTED
 *
 * Admin notification
 */
const notifyAdminRideAccepted = async (assignment) => {
  try {
    const tokens = await getAdminTokens();

    if (!tokens.length) return;

    await sendToTokens(
      tokens,
      "Ride Accepted",
      "Driver accepted assigned ride.",
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyAdminRideAccepted:", err);
  }
};

/**
 * DRIVER REJECTED
 *
 * Admin notification
 */
const notifyAdminRideRejected = async (assignment) => {
  try {
    const tokens = await getAdminTokens();

    if (!tokens.length) return;

    await sendToTokens(
      tokens,
      "Ride Rejected",
      "Driver rejected assigned ride.",
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyAdminRideRejected:", err);
  }
};

/**
 * DRIVER APPROACHING PICKUP
 */
const notifyDriverNearby = async (assignment, etaMinutes) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Driver Nearby",
      `Driver arriving in about ${etaMinutes} minutes`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyDriverNearby:", err);
  }
};

/**
 * DRIVER ARRIVED AT PICKUP
 */
const notifyDriverArrivedPickup = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Driver Arrived",
      `${assignment.booking.child.fullname}'s pickup driver has arrived.`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyDriverArrivedPickup:", err);
  }
};

/**
 * CHILD PICKED UP
 *
 * Parent notification
 */
const notifyParentPickup = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Trip Started",
      `${assignment.booking.child.fullname} has been picked up and is now travelling.`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyParentPickup:", err);
  }
};

/**
 * CHILD DROPPED OFF
 *
 * Parent notification
 */
const notifyParentDropoff = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Trip Completed",
      `${assignment.booking.child.fullname} has arrived safely.`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyParentDropoff:", err);
  }
};

module.exports = {
  notifyRideAssigned,

  notifyParentRideAccepted,
  notifyAdminRideAccepted,
  notifyAdminRideRejected,

  notifyDriverNearby,
  notifyDriverArrivedPickup,

  notifyParentPickup,
  notifyParentDropoff,
};
