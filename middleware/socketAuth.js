const jwt = require("jsonwebtoken");

const socketAuth = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) return next(new Error("Auth error"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 NORMALISE ID BASED ON ROLE
    const user = {
      role: payload.role,

      driverId: payload.driverId || null,
      userId: payload.userId || null,
      adminId: payload.adminId || null,
    };

    // Optional safety fallback
    user.id =
      payload.driverId ||
      payload.userId ||
      payload.adminId ||
      null;

    socket.user = user;

    next();
  } catch (err) {
    console.error("JWT Error:", err);
    next(new Error("Auth error"));
  }
};

module.exports = socketAuth;