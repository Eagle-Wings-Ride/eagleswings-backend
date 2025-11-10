const mongoose = require('mongoose');
const { Schema } = mongoose;

const RateSchema = new Schema({
    in_house_drivers: {
        daily: {
            one_way: { type: Number, required: true },
            return: { type: Number, required: true }
          },
        bi_weekly: {
          one_way: { type: Number, required: true },
          return: { type: Number, required: true }
        },
        monthly: {
          one_way: { type: Number, required: true },
          return: { type: Number, required: true }
        }
      },
      freelance_drivers: {
        daily: {
            one_way: { type: Number, required: true },
            return: { type: Number, required: true }
          },
        bi_weekly: {
          one_way: { type: Number, required: true },
          return: { type: Number, required: true }
        },
        monthly: {
          one_way: { type: Number, required: true },
          return: { type: Number, required: true }
        }
      },
    
    createdAt: {
        type: Date,
        default: Date.now 
    }
});

module.exports = mongoose.model('Rates', RateSchema);