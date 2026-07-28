const { Server } = require("socket.io");

const Driver = require("../models/Driver");
const Assignment = require("../models/Assignment");

const socketAuth = require("../middleware/socketAuth");

const { getDistance, estimateETA } = require("../utils/geo");

const {
  notifyParentDriverNearby,
  notifyParentDriverArrived,
} = require("../utils/helpers/notifications.helpers");

const {
  updateStatus,
  updateAssignmentDistance,
  getAssignmentOrThrow,
} = require("../utils/helpers/ride.helpers");

const LOCATION_THROTTLE_MS = 2000;

const ARRIVAL_RADIUS = 200;

const WARNING_RADIUS = 500;

const setupSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  global.io = io;

  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const role = socket.user.role;

    const id =
      socket.user.driverId || socket.user.userId || socket.user.adminId;

    if (!id) return;

    console.log(`[Socket] ${role} ${id} connected (${socket.id})`);

    // ---------------- ROOMS ----------------

    if (role === "driver") {
      await Driver.findByIdAndUpdate(id, {
        status: "online",
        lastSeenAt: new Date(),
      });

      socket.join(`driver_${id}`);
    }

    if (role === "user") {
      socket.join(`user_${id}`);
    }

    if (role === "admin") {
      socket.join("admins");
    }

    // ---------------- JOIN ASSIGNMENT ----------------

    socket.on("join-assignment", async ({ assignmentId }) => {
      try {
        const assignment = await getAssignmentOrThrow(assignmentId, {
          path: "booking",
          populate: {
            path: "user",
            select: "_id",
          },
        });

        if (!assignment) return;

        const isDriver =
          role === "driver" && assignment.driver.toString() === id;

        const isParent =
          role === "user" && assignment.booking.user._id.toString() === id;

        const isAdmin = role === "admin";

        if (!isDriver && !isParent && !isAdmin) {
          return;
        }

        socket.join(`assignment_${assignmentId}`);

        console.log(`${id} joined ${assignmentId}`);
      } catch (err) {
        console.log("join room error", err.message);
      }
    });

    // ---------------- DRIVER LOCATION ----------------

    let lastLocationUpdate = 0;

    socket.on("driver-location", async ({ lat, lng }) => {
      if (role !== "driver") return;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return;
      }


      const now = Date.now();

      if (now - lastLocationUpdate < LOCATION_THROTTLE_MS) return;

      lastLocationUpdate = now;

      try {
        await Driver.findByIdAndUpdate(id, {
          current_latitude: lat,
          current_longitude: lng,
          lastSeenAt: new Date(),
        });

        const assignments = await Assignment.find({
          driver: id,

          status: {
            $in: [
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
              path: "user",
              select: "fullname fcmTokens",
            },
            {
              path: "child",
              select: "fullname",
            },
          ],
        });

        for (const assignment of assignments) {
          if (!assignment.booking) continue;

          const goingPickup =
            assignment.status === "enroute_pickup" ||
            assignment.status === "arrived_pickup";

          const targetLat = goingPickup
            ? assignment.booking.start_latitude
            : assignment.booking.end_latitude;

          const targetLng = goingPickup
            ? assignment.booking.start_longitude
            : assignment.booking.end_longitude;

          const distance = getDistance(lat, lng, targetLat, targetLng);

          const eta = estimateETA(distance);

          // SAVE LIVE LOCATION

          assignment.lastLocation = {
            lat,

            lng,

            timestamp: new Date(),
          };

          updateAssignmentDistance(assignment, distance);

          // SEND LIVE UPDATE

          io.to(`assignment_${assignment._id}`).emit("driver-location-update", {
            assignmentId: assignment._id,

            lat,

            lng,

            distanceMeters: Math.round(distance),

            etaMinutes: eta,

            status: assignment.status,
          });

          // DRIVER NEARBY

          if (distance <= WARNING_RADIUS && !assignment.nearbyNotified) {
            await notifyParentDriverNearby(assignment, eta);

            assignment.nearbyNotified = true;
          }

          // AUTO ARRIVED PICKUP

          if (
            assignment.status === "enroute_pickup" &&
            distance <= ARRIVAL_RADIUS
          ) {
            await updateStatus(assignment, "arrived_pickup");

            if (!assignment.pickupNotified) {
              await notifyParentDriverArrived(assignment);

              assignment.pickupNotified = true;
            }
          }

          // AUTO ARRIVED DROPOFF

          if (
            assignment.status === "enroute_dropoff" &&
            distance <= ARRIVAL_RADIUS
          ) {
            await updateStatus(assignment, "arrived_dropoff");

            assignment.dropoffNotified = true;
          }
          await assignment.save();
        }
      } catch (err) {
        console.error("location error", err.message);
      }
    });

    // ---------------- DISCONNECT ----------------

    socket.on("disconnect", async () => {
      console.log(
          `[Socket Disconnected] ${role} ${id}`
        );

      if (role === "driver") {
        await Driver.findByIdAndUpdate(id, {
          status: "offline",
          lastSeenAt: new Date(),
        });
      }
    });
  });

  return io;
};

module.exports = setupSockets;
