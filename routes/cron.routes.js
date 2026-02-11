const express = require('express');
const router = express.Router();
const cronAuth = require('../middleware/cronAuth');
const checkExpirations = require('../cron/serviceExpiration');

router.post('/check-expirations', cronAuth, async (req, res) => {
  try {
    await checkExpirations();
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Cron execution failed:', err);
    res.status(500).json({ status: 'failed' });
  }
});

module.exports = router;
