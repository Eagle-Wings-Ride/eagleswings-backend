const express = require("express")
const router = express.Router()
const generateOTPAndExpiry = require('../middleware/generateOtp')
const authenticateToken = require('../middleware/authenticateToken')

const {registerAdmin, loginAdmin, verifyAdminOTP, resendAdminOTP} = require('../controllers/auth/adminAuthCtrl')
const {approveDriver, assignDriverToRide, UnassignDriverFromRide} = require('../controllers/adminCtrl')
const {getDriver} = require('../controllers/driverCtrl')
const {getUser} = require('../controllers/userCtrl')
const { getDriverHistory} = require("../controllers/driverHistoryCtrl");
const {getAdminDashboard,} = require("../controllers/adminDashboardCtrl");
const {adminDeleteUser, adminDeleteDriver} = require('../controllers/auth/adminAuthCtrl') 

// AUTH URL

router.route('/register').post(generateOTPAndExpiry, registerAdmin)
router.route('/login').post(loginAdmin)
router.route('/verify-mail').post(verifyAdminOTP)
router.route('/resend-otp').post(generateOTPAndExpiry,resendAdminOTP)

router.route('/approve-driver/:id').patch(authenticateToken, approveDriver)
router.route('/bookings/:bookingId/assign-driver').patch(authenticateToken, assignDriverToRide)
router.route('/bookings/:bookingId/unassign-driver').patch(authenticateToken, UnassignDriverFromRide)
router.route("/history/:driverId").get(authenticateToken, getDriverHistory);

// router.route('/driver/location/').get(authenticateToken, getDriverByLocation)
// Dashboard route
router.get("/dashboard",authenticateToken,getAdminDashboard);


//view Accounts (User & Driver)
router.route("/users/:id").get(authenticateToken, getUser)
router.route('/drivers/:id').get(authenticateToken, getDriver)

//Delete Accounts (User & Driver)
router.route('/delete-driver/:id').delete(authenticateToken, adminDeleteDriver)
router.route('/delete-user/:id').delete(authenticateToken, adminDeleteUser)


module.exports = router