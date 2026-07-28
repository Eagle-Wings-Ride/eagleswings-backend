const express = require("express");
const router = express.Router();

const {
  getAssignment,
  driverAcceptRide,
  driverRejectRide,
  driverBeginPickup,
  driverConfirmPickup,
  driverStartDropoff,
  driverCompleteRide,
  getDriverActiveAssignments,
  // getAssignmentTracking,
  // updateDistance,
} = require("../controllers/assignmentRideCtrl");

const authenticateToken = require("../middleware/authenticateToken");

// ---------------- Ride Lifecycle ----------------
router.route("/:id").get(authenticateToken, getAssignment);

router.route("/:id/accept").patch(authenticateToken, driverAcceptRide);

router.route("/:id/reject").patch(authenticateToken, driverRejectRide);

router.route("/:id/start-pickup").patch(authenticateToken, driverBeginPickup);

router.route("/:id/pickup").patch(authenticateToken, driverConfirmPickup);

router.route("/:id/start-dropoff").patch(authenticateToken, driverStartDropoff);

router.route("/:id/complete").patch(authenticateToken, driverCompleteRide);

router.route("/driver/active").get(authenticateToken, getDriverActiveAssignments);

// router.route("/:id/tracking").get(authenticateToken, getAssignmentTracking);
// router.route("/:id/update-distance").patch(authenticateToken, updateDistance);

module.exports = router;
