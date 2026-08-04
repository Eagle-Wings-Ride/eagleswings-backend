const router = require("express").Router();

const authenticateToken = require("../middleware/authenticateToken");

const {
  getAdminDashboard,
} = require("../controllers/adminDashboardCtrl");

router.get(
  "/",
  authenticateToken,
  getAdminDashboard
);

module.exports = router;