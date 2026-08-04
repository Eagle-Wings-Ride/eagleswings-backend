const User = require("../models/User");

const getUser = async (req, res) => {
  const { id: userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json(" User Not Found");
  }

  res.status(200).json({
    user: {
      id: user._id,
      fullname: user.fullname,
      email: user.email,
      phone_number: user.phone_number,
      address: user.address,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
  });
};

const getAllUsers = async (req, res) => {
  const users = await User.find({}, "-password -fcmTokens");
  res.status(200).json({ users });
};

const currentUser = async (req, res) => {
  try {
    const email = req.user.email;
    const curruser = await User.findOne({ email });

    if (!curruser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User details retreived successfully",
      user: {
        id: curruser.id,
        fullname: curruser.fullname,
        email: curruser.email,
        address: curruser.address,
        phone_number: curruser.phone_number,
        is_verified: curruser.is_verified,
        createdAt: curruser.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching user details" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const updates = { ...req.body };

    // Fields users cannot update directly
    const blockedFields = [
      "password",
      "otp",
      "otpExpiry",
      "passwordResetOTP",
      "passwordResetExpiry",
      "passwordResetVerified",
      "fcmTokens",

      // Admin/system controlled fields
      "isEmailVerified",
      "role",

      // Protected account fields
      "_id",
    ];

    blockedFields.forEach((field) => delete updates[field]);

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select(
      "-password -otp -otpExpiry -passwordResetOTP -passwordResetExpiry -fcmTokens",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  currentUser,
  updateUser,
};
