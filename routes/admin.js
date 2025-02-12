const express = require("express")
const router = express.Router()
const generateOTPAndExpiry = require('../middleware/generateOtp')

const {registerAdmin, loginAdmin, verifyAdminOTP, resendAdminOTP} = require('../controllers/adminAuthCtrl')
// AUTH URL

router.route('/register').post(generateOTPAndExpiry, registerAdmin)
router.route('/login').post(loginAdmin)
router.route('/verify-mail').post(verifyAdminOTP)
router.route('/resend-otp').post(generateOTPAndExpiry,resendAdminOTP)

module.exports = router