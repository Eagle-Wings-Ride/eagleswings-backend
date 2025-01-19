const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')

const {bookRide, getRidesByUser, getRideByChild, getAllRides, getRecentRides, getRidesByStatus, updateRideStatus} = require('../controllers/bookCtrl')

//Booking routes
router.route('/:id').post(authenticateToken, bookRide)

// Route to get rides by user
router.get('/rides/', authenticateToken, getRidesByUser)

// Route to get a ride by child ID
router.get('/ride/:childId', authenticateToken, getRideByChild)

// Route to get all rides
router.get('/all-rides/', authenticateToken, getAllRides)

// Route to get recent rides
router.get('/rides/recent/:userId', authenticateToken, getRecentRides)

// Route to get rides by status
router.get('/rides/status/:userId/:status', authenticateToken, getRidesByStatus)

// Route to update ride status
router.patch('/rides/status/:rideId', authenticateToken, updateRideStatus)


// Route to upload payment file (coming up)
// router.post('/ride/:bookingId/upload', authenticateToken, uploadPaymentFile)

module.exports = router