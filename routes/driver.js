const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')
const upload = require('../cloudinary/multerConfig')
const generateOTPAndExpiry = require('../middleware/generateOtp')

const {registerDriver,
       loginDriver,
       logoutDriver,
       verifyDriverOTP,
       resendDriverOTP} = require('../controllers/auth/driverAuthCtrl')

const {getAllDrivers,
       getDriver,
       driverAcceptRide,
       driverRejectRide,
       updateDriver,
       deleteDriver,
       uploadDriverDetails,
       viewRides} = require('../controllers/driverCtrl')


// Driver Auth Routes

router.route('/register').post(generateOTPAndExpiry, registerDriver)
router.route('/verify-mail').post(verifyDriverOTP)
router.route('/resend-otp').post(generateOTPAndExpiry,resendDriverOTP)
router.route('/login').post(loginDriver)
router.route('/logout').post(authenticateToken, logoutDriver)

// router.route('/forgot-password').post(authenticateToken, generateOTPAndExpiry,forgotPassword)

// Driver Other Routes
router.route('/').get(authenticateToken, getAllDrivers)
router.route('/viewRides').get(authenticateToken, viewRides)
router.route('/:id').get(authenticateToken, getDriver)
                     .patch(authenticateToken, updateDriver)
                     .delete(authenticateToken, deleteDriver)
router.route('/:assignmentId/accept').patch(authenticateToken, driverAcceptRide)
router.route('/:assignmentId/reject').patch(authenticateToken, driverRejectRide)

router.route('/upload-details/:id').patch(authenticateToken, 
                                          upload.fields([
                                                 { name: "image", maxCount: 1 },
                                                 { name: "car_insurance", maxCount: 2 },
                                                 { name: "background_check", maxCount: 2 },
                                                 { name: "government_issued_id", maxCount: 2 },
                                                 { name: "criminal_check_rec", maxCount: 2 },
                                                 { name: "child_intervention_rec", maxCount: 2 },
                                                 { name: "driver_abstract", maxCount: 2 }
                                          ]), 
                                          uploadDriverDetails)

module.exports = router