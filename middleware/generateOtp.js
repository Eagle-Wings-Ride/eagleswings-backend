const otpGenerator = require('otp-generator')

const generateOTPAndExpiry = (req, res, next) => {
    const otp = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });
  
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
  
    req.otp = otp;
    req.otpExpiry = otpExpiry;
  
    next();
  };

  module.exports = generateOTPAndExpiry