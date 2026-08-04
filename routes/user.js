const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const upload = require("../cloudinary/multerConfig");
const generateOTPAndExpiry = require("../middleware/generateOtp");

const {
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
} = require("../controllers/auth/userAuthCtrl");

const {
  getAllUsers,
  getUser,
  currentUser,
  updateUser,
} = require("../controllers/userCtrl");

const {
  addChild,
  getChild,
  getChildren,
  updateChild,
  deleteChild,
} = require("../controllers/childCtrl");

// User Route
router.route("/").get(authenticateToken, getAllUsers);
router.route("/current").get(authenticateToken, currentUser)
                        .patch(authenticateToken, updateUser);

router.route("/register").post(generateOTPAndExpiry, registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(authenticateToken, logoutUser);

router.route("/verify-mail").post(verifyUserOTP);
router.route("/resend-otp").post(generateOTPAndExpiry, resendOTP);

router.post("/change-password", authenticateToken, changePassword);
router.post('/password-reset/request', generateOTPAndExpiry, requestPasswordReset);
router.post('/password-reset/resend', generateOTPAndExpiry, resendPasswordResetOTP);
router.route("/password-reset/verify").post(verifyPasswordResetOTP);
router
  .route("/password-reset/reset")
  .post(forgotPassword);

// Children Routes
router
  .route("/child/")
  .post(authenticateToken, upload.single("image"), addChild);
router.route("/children/me").get(authenticateToken, getChildren);
router
  .route("/child/:id")
  .get(authenticateToken, getChild)
  .patch(authenticateToken, upload.single("image"), updateChild)
  .delete(authenticateToken, deleteChild);

module.exports = router;
