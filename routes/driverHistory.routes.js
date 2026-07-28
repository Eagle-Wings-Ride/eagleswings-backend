const router = require("express").Router();

const authenticateToken = require("../middleware/authenticateToken");

const {
  getMyHistory,
  getHistoryByPeriod,
} = require("../controllers/driverHistoryCtrl");

router.use(authenticateToken);

router.get("/me", getMyHistory);

router.get("/:periodType/:year/:period", getHistoryByPeriod);

module.exports = router;
