const express = require("express");
const cors = require("cors");

const stripeWebhook = require("./utils/webhook");
const notFoundHandler = require("./middleware/notFound");

// Routes
const users = require("./routes/user");
const driver = require("./routes/driver");
const booking = require("./routes/bookings");
const rates = require("./routes/rates");
const admin = require("./routes/admin");
const assignmentRoutes = require("./routes/assignments.routes");
const driverHistoryRoutes = require("./routes/driverHistory.routes");
const driverShiftRoutes = require("./routes/driverShift.routes");
const driverDashboardRoutes = require("./routes/driverDashboard.routes");
const cronRoutes = require("./routes/cron.routes");

const app = express();

/* Stripe webhook */
app.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

/* Global middleware */
app.use(cors());
app.use(express.json());

/* Routes */
app.use("/internal/cron", cronRoutes);
app.use("/api/v1/users", users);
app.use("/api/v1/drivers", driver);
app.use("/api/v1/book", booking);
app.use("/api/v1/rates", rates);
app.use("/api/v1/admin", admin);
app.use("/api/v1/assignments", assignmentRoutes);
app.use("/api/v1/driver-history", driverHistoryRoutes);
app.use("/api/v1/driver-shift", driverShiftRoutes);
app.use("/api/v1/dashboard", driverDashboardRoutes);

/* 404 */
app.use(notFoundHandler);

module.exports = app;
