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
 * Admin notification
 */
const notifyRideAccepted = async (assignment) => {
  try {
    const tokens = await getAdminTokens();

    if (!tokens.length) return;

    await sendToTokens(
      tokens,
      "Ride Accepted",
      "Driver accepted assigned ride",
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyRideAccepted:", err);
  }
};

/**
 * DRIVER REJECTED
 */
const notifyRideRejected = async (assignment) => {
  try {
    const tokens = await getAdminTokens();

    if (!tokens.length) return;

    await sendToTokens(
      tokens,
      "Ride Rejected",
      "Driver rejected assigned ride",
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyRideRejected:", err);
  }
};

/**
 * Driver approaching pickup
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
 * Driver arrived pickup
 */
const notifyDriverArrivedPickup = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Driver Arrived",
      `${assignment.booking.child.fullname} pickup driver has arrived`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyDriverArrivedPickup:", err);
  }
};

/**
 * Child picked up
 */
const notifyChildPickedUp = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Trip Started",
      `${assignment.booking.child.fullname} is now travelling`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyChildPickedUp:", err);
  }
};

/**
 * Child dropped off
 */
const notifyDropoff = async (assignment) => {
  try {
    const tokens = assignment.booking?.user?.fcmTokens;

    if (!tokens?.length) return;

    await sendToTokens(
      tokens,
      "Trip Completed",
      `${assignment.booking.child.fullname} arrived safely`,
      {
        assignmentId: assignment._id.toString(),
      },
    );
  } catch (err) {
    console.error("notifyDropoff:", err);
  }
};

module.exports = {
  notifyRideAssigned,
  notifyRideAccepted,
  notifyRideRejected,
  notifyDriverNearby,
  notifyDriverArrivedPickup,
  notifyChildPickedUp,
  notifyDropoff,
};
