const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");

const {
  getDriverDashboard,
  getDriverAssignments,
  getDriverCurrentRide,
} = require("../controllers/driverDashboardCtrl");

router.get("/me", authenticateToken, getDriverDashboard);

router.get("/assignments", authenticateToken, getDriverAssignments);

module.exports = router;
