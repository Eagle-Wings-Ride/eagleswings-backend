const mongoose = require('mongoose')
const { Schema } = mongoose
const bcrypt = require('bcryptjs')


const AdminSchema = new Schema({
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
    isVerified: {
      type: Boolean,
      default: false
    },
    otp: String,
    otpExpiry: Date,
    createdAt: {
      type: Date,
      default: Date.now() 
    }
  });


  AdminSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  });
  
  AdminSchema.methods.comparePassword = async function (canditatePassword) {
    const isMatch = await bcrypt.compare(canditatePassword, this.password);
    return isMatch;
  };


module.exports = mongoose.model('Admin', AdminSchema)