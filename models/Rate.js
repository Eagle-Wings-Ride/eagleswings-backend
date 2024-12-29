const mongoose = require('mongoose');
const { Schema } = mongoose;

const RateSchema = new Schema({
    in_house_drivers: {
        one_way: {
            type: Number, 
            required: true 
        },
        return: {
            type: Number, 
            required: true 
        }
    },
    freelance_drivers: {
        one_way: {
            type: Number, 
            required: true
        },
        return: {
            type: Number, 
            required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now 
    }
});

module.exports = mongoose.model('Rates', RateSchema);