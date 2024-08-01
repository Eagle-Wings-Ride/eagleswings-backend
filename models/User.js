const mongoose = require('mongoose')
const { Schema } = mongoose
const validator = require('validator');
const bcrypt = require('bcryptjs');


const UserSchema = new Schema({
    fullname: {
      type: String,
      required: [true, 'Please provide name'],
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Please provide email']
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: [6, 'password length too'],
    },
    phone_number : {
      type: String,
      unique: true
    },
    address: String,
    location: String,
    isVerified: {
      type: Boolean,
      default: false
  },
    verificationToken: String,
    createdAt: {
      type: Date,
      default: Date.now() 
  }
  });


  UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  });
  
  UserSchema.methods.comparePassword = async function (canditatePassword) {
    const isMatch = await bcrypt.compare(canditatePassword, this.password);
    return isMatch;
  };
  

module.exports = mongoose.model('User', UserSchema)