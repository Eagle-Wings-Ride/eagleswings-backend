const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')
const upload = require('../cloudinary/multerConfig')
const generateOTPAndExpiry = require('../middleware/generateOtp')
const { changePassword, requestPasswordReset, verifyPasswordResetOTP, resendPasswordResetOTP, resetPassword } = require('../controllers/auth/driverAuthCtrl')

const {registerDriver,
       loginDriver,
       logoutDriver,
       verifyDriverOTP,
       resendDriverOTP} = require('../controllers/auth/driverAuthCtrl')

const {updateDriver,
       uploadDriverDetails,
       viewRides, getCurrentDriver} = require('../controllers/driverCtrl')

// Driver Auth Routes
router.route('/register').post(generateOTPAndExpiry, registerDriver)
router.route('/verify-mail').post(verifyDriverOTP)
router.route('/resend-otp').post(generateOTPAndExpiry,resendDriverOTP)
router.route('/login').post(loginDriver)
router.route('/logout').post(authenticateToken, logoutDriver)

//Driver Paassword Reset Routes
router.post("/change-password", authenticateToken, changePassword);
router.post('/password-reset/request', generateOTPAndExpiry, requestPasswordReset);
router.post('/password-reset/resend', generateOTPAndExpiry, resendPasswordResetOTP);
router.route("/password-reset/verify").post(verifyPasswordResetOTP);
router
  .route("/password-reset/reset")
  .post(resetPassword);


// Driver Other Routes
router.route('/me').get(authenticateToken, getCurrentDriver)
                    .patch(authenticateToken, updateDriver)
router.route('/viewRides').get(authenticateToken, viewRides)

router.route('/upload-details/:id').patch(authenticateToken, 
                                         upload.fields([
                                          { name: "image", maxCount: 1 },
                                          { name: "driver_license", maxCount: 1 },
                                          { name: "car_insurance", maxCount: 1 },
                                          { name: "criminal_check_rec", maxCount: 1 },
                                          { name: "child_intervention_rec", maxCount: 1 },
                                          { name: "driver_abstract", maxCount: 1 },
                                          { name: "inspection_report", maxCount: 1 },
                                          ]), 
                                          uploadDriverDetails)


module.exports = router