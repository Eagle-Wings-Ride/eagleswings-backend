const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')

const {bookRide, getRidesByUser, getRideByChild} = require('../controllers/bookCtrl')

//Booking routes

router.route('/:id').post(authenticateToken, bookRide)

// Route to get rides by user
router.get('/rides/:userId', authenticateToken, getRidesByUser)

// Route to get a ride by child ID
router.get('/ride/:childId', authenticateToken, getRideByChild)

// Route to upload payment file (coming up)
// router.post('/ride/:bookingId/upload', authenticateToken, uploadPaymentFile)

module.exports = router