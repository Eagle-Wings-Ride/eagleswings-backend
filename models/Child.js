const mongoose = require('mongoose')
const { Schema } = mongoose

const ChildSchema = new Schema({
    fullname: {
      type: String,
      required: [true, 'Please provide name'],
      minlength: 3,
      maxlength: 50,
    },
    image: String,
    age: {
      type: Number,
      required: [true, 'Please provide ward age']
    },
    grade: {
      type: Number,
      maxlength: 2
    },
    school : String,
    address: String,
    relationship: String,
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
        type: Date,
        default: Date.now() 
    }
  });


module.exports = mongoose.model('Child', ChildSchema)