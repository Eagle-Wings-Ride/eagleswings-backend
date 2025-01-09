const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')

const {registerUser, loginUser, logoutUser, verifyUserOTP, resendOTP} = require('../controllers/userAuthCtrl')
const {getAllUsers, getUser, currentUser, updateUser, deleteUser } = require('../controllers/userCtrl')
const {addChild, getChild,getChildrenByUserId, updateChild, deleteChild} = require('../controllers/childCtrl')

// User Route
router.route('/').get(authenticateToken, getAllUsers)
router.route('/current').get(authenticateToken, currentUser)
router.route('/:id').get(authenticateToken, getUser)
                    .patch(authenticateToken, updateUser)
                    .delete(authenticateToken, deleteUser)
router.route('/register').post(registerUser)
router.route('/verify-mail').post(verifyUserOTP)
router.route('/resend-otp').post(resendOTP)
router.route('/login').post(loginUser)
router.route('/logout').post(authenticateToken, logoutUser)

// Children Routes
router.route('/child/').post(authenticateToken, addChild)
router.route('/child/:id').get(authenticateToken, getChild)
                        .patch(authenticateToken, updateChild)
                        .delete(authenticateToken, deleteChild)
router.route('/children/:userId')
    .get(authenticateToken, getChildrenByUserId);


module.exports = router