const mongoose = require('mongoose')
const { Schema } = mongoose

const tokenBlacklistSchema = new Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});


module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema)