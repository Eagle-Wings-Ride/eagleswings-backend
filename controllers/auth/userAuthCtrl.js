const User = require("../../models/User");
const TokenBlacklist = require("../../models/tokenBlacklist");
const sendVerificationEmail = require("../../utils/sendVerificationEmail");
const jwt = require("jsonwebtoken");
const { compare } = require("bcryptjs");

// =======================
// REGISTRATION & LOGIN
// =======================

// User Registration
const registerUser = async (req, res) => {
  const { fullname, email, password, phone_number, address } = req.body;
  if (!fullname || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide fullname, email, and password" });
  }

  try {
    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email already exists" });
    if (phone_number && (await User.findOne({ phone_number })))
      return res.status(409).json({ message: "Phone number already exists" });

    const user = new User({
      fullname,
      email,
      password,
      phone_number,
      address,
      otp: req.otp,
      otpExpiry: req.otpExpiry,
      isVerified: false,
    });

    await user.save();

    await sendVerificationEmail({
      name: user.fullname,
      email: user.email,
      otp: req.otp,
      type: "Email",
    });

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "User registration failed",
        error: error.message || error,
      });
  }
};

// User Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Please provide email and password" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid Credentials" });
    if (!user.isVerified)
      return res
        .status(401)
        .json({ message: "Please verify your email address" });

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return res.status(401).json({ message: "Invalid Credentials" });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "5d" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// User Logout
const logoutUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    await TokenBlacklist.create({ token });
    res
      .status(200)
      .json({
        message:
          "Logout successful. Please remove the token on the client-side.",
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Logout failed", error });
  }
};

// =======================
// EMAIL VERIFICATION OTP
// =======================

// Verify Registration OTP
const verifyUserOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or OTP" });
    if (user.isVerified)
      return res.status(200).json({ message: "User is already verified" });
    if (user.otp !== otp || user.otpExpiry < new Date())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "OTP verification failed", error });
  }
};

// Resend Registration OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "User is already verified" });

    user.otp = req.otp;
    user.otpExpiry = req.otpExpiry;
    await user.save();

    await sendVerificationEmail({
      name: user.fullname,
      email: user.email,
      otp: req.otp,
      type: "Email",
    });
    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to resend OTP", error: error.message });
  }
};

// =======================
// PASSWORD RESET FLOW
// =======================

// Step 1: Request Password Reset (send OTP)
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordResetOTP = req.otp;
    user.passwordResetExpiry = req.otpExpiry;
    user.passwordResetVerified = false;
    await user.save();

    await sendVerificationEmail({
      name: user.fullname,
      email,
      otp: req.otp,
      type: "Password Reset",
    });
    res.status(200).json({ message: "Password reset OTP sent to your email." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send password reset OTP" });
  }
};

// Step 2: Verify Password Reset OTP
const verifyPasswordResetOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.passwordResetOTP || !user.passwordResetExpiry)
      return res.status(400).json({ message: "No OTP request found" });
    if (user.passwordResetOTP !== otp || user.passwordResetExpiry < new Date())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.passwordResetVerified = true;
    await user.save();

    res
      .status(200)
      .json({
        message: "OTP verified successfully. You can now reset your password.",
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

// Step 3: Reset Password
const forgotPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;
  if (!email || !newPassword || !confirmPassword)
    return res
      .status(400)
      .json({ message: "Email and new password are required" });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.passwordResetVerified)
      return res
        .status(403)
        .json({
          message: "OTP verification required before resetting password",
        });

    const isSamePassword = await compare(newPassword, user.password);
    if (isSamePassword)
      return res
        .status(400)
        .json({ message: "New password cannot be same as old password" });

    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetExpiry = undefined;
    user.passwordResetVerified = undefined;

    await user.save();
    res
      .status(200)
      .json({
        message:
          "Password reset successfully. You can now login with the new password.",
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Password reset failed" });
  }
};

// Resend Password Reset OTP
const resendPasswordResetOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // generate new OTP
    user.passwordResetOTP = req.otp;
    user.passwordResetExpiry = req.otpExpiry;
    user.passwordResetVerified = false;
    await user.save();

    await sendVerificationEmail({
      name: user.fullname,
      email,
      otp: req.otp,
      type: "Password Reset",
    });
    res.status(200).json({ message: "New OTP sent to your email." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

// Change passwords: for logged-in users who want to change their password
const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
  
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Both passwords required" });
  
    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch)
        return res.status(400).json({ message: "Old password incorrect" });
  
      user.password = newPassword;
      await user.save();
  
      res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Change password failed" });
    }
  };


module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  verifyUserOTP,
  resendOTP,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resendPasswordResetOTP,
  forgotPassword,
  changePassword
};
