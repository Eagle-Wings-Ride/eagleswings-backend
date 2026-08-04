const router = require("express").Router();

const authenticateToken = require("../middleware/authenticateToken");

const {
  getAdminDashboard,
  getAdminUserDashboard,
  getAdminDriverDashboard,
  getAdminBookingDashboard,
  getAdminRideDashboard,
} = require("../controllers/adminDashboardCtrl");

router.get("/", authenticateToken, getAdminDashboard);
router.get("/users", authenticateToken, getAdminUserDashboard);
router.get("/drivers", authenticateToken, getAdminDriverDashboard);
router.get("/bookings", authenticateToken, getAdminBookingDashboard);
router.get("/rides", authenticateToken, getAdminRideDashboard);

module.exports = router;
