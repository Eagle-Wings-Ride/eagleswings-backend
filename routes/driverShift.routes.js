const express = require("express");
const router = express.Router();

const {
  endDriverShift,
  getActiveDriverShift,
} = require("../controllers/driverShiftCtrl");

const authenticateToken = require("../middleware/authenticateToken");

router.patch("/end", authenticateToken, endDriverShift);

router.get("/active", authenticateToken, getActiveDriverShift);

module.exports = router;
