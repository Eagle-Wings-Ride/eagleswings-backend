const express = require("express")
const router = express.Router()
const generateOTPAndExpiry = require('../middleware/generateOtp')
const authenticateToken = require('../middleware/authenticateToken')

const {registerAdmin, loginAdmin, verifyAdminOTP, resendAdminOTP} = require('../controllers/adminAuthCtrl')
const {approveDriver, getDriverByLocation} = require('../controllers/adminCtrl')

// AUTH URL

router.route('/register').post(generateOTPAndExpiry, registerAdmin)
router.route('/login').post(loginAdmin)
router.route('/verify-mail').post(verifyAdminOTP)
router.route('/resend-otp').post(generateOTPAndExpiry,resendAdminOTP)

router.route('/approve-driver/:id').patch(authenticateToken, approveDriver)
// router.route('/driver/location/').get(authenticateToken, getDriverByLocation)



module.exports = router