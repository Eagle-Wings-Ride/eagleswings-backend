const express = require("express")
const router = express.Router()
const authenticateToken = require('../middleware/authenticateToken')

const {addRate, getRate, updateRate, deleteRate} = require('../controllers/rateCtrl')


router.route('/').post(authenticateToken, addRate)
                    .get(authenticateToken, getRate)
                    .patch(authenticateToken, updateRate)
                    .delete(authenticateToken, deleteRate)

module.exports = router;