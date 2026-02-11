const { Server } = require("socket.io");
const Driver = require("../models/Driver");

const setupSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your frontend origin
      methods: ["GET", "POST"],
    },
  });

  // Generic handler for driver status changes
  const handleDriverStatus = (status) => async (data) => {
    // Parse payload if it's a string
    let payload;
    if (typeof data === "string") {
      try {
        payload = JSON.parse(data);
      } catch (err) {
        console.error("Invalid JSON payload:", data);
        return;
      }
    } else {
      payload = data;
    }

    const { driverId } = payload;
    if (!driverId) return console.error("No driverId provided");

    try {
      await Driver.findByIdAndUpdate(driverId, { status });
      io.emit("driver-status-changed", { driverId, status });
    } catch (err) {
      console.error("Error updating driver status:", err);
    }
  };

  // Handle client connections
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("driver-online", handleDriverStatus("online"));
    socket.on("driver-offline", handleDriverStatus("offline"));

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

module.exports = setupSockets;
