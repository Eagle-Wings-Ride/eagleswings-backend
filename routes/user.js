const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')

const {register, login, logout, verifyEmail} = require('../controllers/authCtrl')
const {getAllUsers, getUser, currentUser, updateUser, deleteUser } = require('../controllers/userCtrl')
const {addChild, getChild, getChildByUser, updateChild, deleteChild} = require('../controllers/childCtrl')

// User Route
router.route('/').get(getAllUsers)
router.route('/:id').get(getUser, currentUser)
                    .patch(authenticateToken, updateUser)
                    .delete(authenticateToken, deleteUser)
router.route('/register').post(register)
router.route('/verify-mail').post(verifyEmail)
router.route('/login').post(login)
router.route('/logout').post(logout)

// Children Routes
router.route('/child/').post(authenticateToken, addChild)
router.route('/child/:id').get(authenticateToken, getChild)
                        .patch(authenticateToken, updateChild)
                        .delete(authenticateToken, deleteChild)
router.route('/my-children').get( authenticateToken, getChildByUser);





module.exports = router