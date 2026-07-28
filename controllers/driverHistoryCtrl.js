const DriverHistory = require("../models/DriverHistory");

// ---------------- MY HISTORY ----------------

const getMyHistory = async (req, res) => {
  try {
    const history = await DriverHistory.find({
      driver: req.user.driverId,
    }).sort({
      year: -1,
      period: -1,
    });

    res.json({
      count: history.length,
      history,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ---------------- HISTORY BY PERIOD ----------------

const getHistoryByPeriod = async (req, res) => {
  try {
    const { periodType, period, year } = req.params;

    const history = await DriverHistory.findOne({
      driver: req.user.driverId,
      periodType,
      period: Number(period),
      year: Number(year),
    });

    if (!history) {
      return res.status(404).json({
        message: "History not found",
      });
    }

    res.json({
      history,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ---------------- ADMIN VIEW DRIVER HISTORY ----------------

const getDriverHistory = async (req, res) => {
  try {

    if (!req.user.adminId) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    const history = await DriverHistory.find({
      driver: req.params.driverId,
    }).sort({
      year: -1,
      period: -1,
    });

    res.json({
      count: history.length,
      history,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  getMyHistory,
  getHistoryByPeriod,
  getDriverHistory,
};