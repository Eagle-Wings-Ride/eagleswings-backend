const mongoose = require('mongoose')
const { Schema } = mongoose

const ChildSchema = new Schema({
    fullname: {
      type: String,
      required: [true, 'Please provide name'],
      minlength: 3,
      maxlength: 50,
      trim: true
    },
    image: String,
    image_public_id: String,
    age: {
      type: Number,
      required: [true, 'Please provide ward age'],
      min: 0
    },
    grade: String,
    relationship: String,

    // Location-related fields
    school: String,
    home_address: String,
    school_address: String,
    daycare_address: {
      type: String,
      default: '101 Abraham Gate, Fort McMurray, AB T9K 1X8'
    },
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  }, {timestamps: true});

module.exports = mongoose.model('Child', ChildSchema)