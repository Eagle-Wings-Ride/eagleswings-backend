const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')
const upload = require('../cloudinary/multerConfig')
const generateOTPAndExpiry = require('../middleware/generateOtp')

const {registerUser, loginUser, logoutUser, verifyUserOTP, resendOTP, forgotPassword} = require('../controllers/auth/userAuthCtrl')
const {getAllUsers, getUser, currentUser, updateUser, deleteUser } = require('../controllers/userCtrl')
const {addChild, getChild,getChildrenByUserId, updateChild, deleteChild} = require('../controllers/childCtrl')

// User Route
router.route('/').get(authenticateToken, getAllUsers)
router.route('/current').get(authenticateToken, currentUser)
router.route('/:id').get(authenticateToken, getUser)
                    .patch(authenticateToken, updateUser)
                    .delete(authenticateToken, deleteUser)
router.route('/register').post(generateOTPAndExpiry, registerUser)
router.route('/verify-mail').post(verifyUserOTP)
router.route('/resend-otp').post(generateOTPAndExpiry,resendOTP)
router.route('/forgot-password').post(authenticateToken, generateOTPAndExpiry,forgotPassword)
router.route('/login').post(loginUser)
router.route('/logout').post(authenticateToken, logoutUser)

// Children Routes
router.route('/child/').post(authenticateToken, upload.single('image'), addChild)
router.route('/child/:id').get(authenticateToken, getChild)
                        .patch(authenticateToken, updateChild)
                        .delete(authenticateToken, deleteChild)
router.route('/children/:userId')
    .get(authenticateToken, getChildrenByUserId);


module.exports = router