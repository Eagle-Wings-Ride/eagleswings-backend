const { Model } = require('mongoose')
const User = require('../models/User')
const TokenBlacklist = require('../models/tokenBlacklist')
const sendVerificationEmail = require('../utils/sendVerificationEmail')
const jwt = require('jsonwebtoken')


const registerUser = async (req, res) => {
    const { fullname, email, password, phone_number, address } = req.body;

    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'Please provide fullname, email, and password' });
    }

    try {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const phoneNumberExists = await User.findOne({ phone_number });
        if (phoneNumberExists) {
            return res.status(409).json({ message: 'Phone number already exists' });
        }

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
            message: 'User registered successfully. Please check your email to verify your account.',
        });
    } catch (error) {
        res.status(500).json({ message: 'User registration failed', error: error.message || error });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email address' });
        }

        // Compare provided password with stored password
        const isPasswordCorrect = await user.comparePassword(password);

        // Check if password is correct
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '5d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const logoutUser = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
        return res.status(401).json({ message: 'No token provided' })
    }

    try {
        // Add the token to the blacklist
        await TokenBlacklist.create({ token })

        // Clear the token on the client-side
        res.status(200).json({ message: 'Logout successful. Please remove the token on the client-side.' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Logout failed', error })
    }
}

const verifyUserOTP = async (req, res) => {
    try {
        const { email, otp } = req.body

        // Find user by email
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or OTP' })
        }

        // Check if user is already verified
        if (user.isVerified) {
            return res.status(200).json({ message: 'User is already verified' });
        }

        // Check if OTP matches and is not expired
        if (user.otp !== otp || user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' })
        }

        user.isVerified = true
        user.otp = undefined
        user.otpExpiry = undefined

        await user.save()

        res.status(200).json({ message: 'OTP verified successfully' })
    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed', error })
    }
}

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User is already verified' });
        }

        user.otp = req.otp;
        user.otpExpiry = req.otpExpiry;

        await user.save();

        await sendVerificationEmail({
            name: user.fullname,
            email: user.email,
            otp: req.otp,
            type: "Email",
        });

        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
    }
};
// in progress (doesnt go with app flow)
const forgotPassword = async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;

        // Validate request body
        if (!email || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(400).json({ message: 'User is not verified' });
        }

        // Verify old password
        const isPasswordCorrect = await user.comparePassword(oldPassword);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update user with OTP and expiry
        user.otp = req.otp;
        user.otpExpiry = req.otpExpiry;

        await sendVerificationEmail({
            name: user.fullname,
            email: user.email,
            otp: req.otp,
            type: "Password Reset",
        });

        // Update password
        user.password = newPassword;

        // Send post-change verification email
        await sendVerificationEmail({
            name: user.fullname,
            email: user.email,
            otp: req.otp,
            type: "Password Updated",
        });

        await user.save();

        res.status(200).json({ message: 'Success! Password updated.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
};


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    verifyUserOTP,
    resendOTP,
    forgotPassword,
}