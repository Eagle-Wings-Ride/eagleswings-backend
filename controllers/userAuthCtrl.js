const { Model } = require('mongoose')
const User = require('../models/User')
const TokenBlacklist = require('../models/tokenBlacklist')
const sendVerificationEmail = require('../utils/sendVerificationEmail')
const jwt = require('jsonwebtoken')
const otpGenerator = require('otp-generator')


const registerUser = async (req, res) => {
    const { fullname, email, password, phone_number, address } = req.body;

    // Input validation
    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'Please provide fullname, email, and password' });
    }

    try {
        // Check if email already exists
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ message: 'Email already exists' })
        }

        // Check if phone number already exists
        const phoneNumberExists = await User.findOne({ phone_number });
        if (phoneNumberExists) {
            return res.status(409).json({ message: 'Phone number already exists' });
        }

        // Generate Otp code
        const otp = otpGenerator.generate(6, { 
            alphabets: false,
            specialChars: false,
            digits: true
        });
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
        
        // Create a new user
        const user = new User({
            fullname,
            email,
            password,
            phone_number,
            address,
            otp,
            otpExpiry,
            isVerified: false
        });

        await user.save();

        // Send verification email

        await sendVerificationEmail({
            name: user.fullname,
            email: user.email,
            otp: user.otp,
        })
        res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
    } catch (error) {
        res.status(500).json({ message: 'User registration failed', error });
    }
}

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
            { expiresIn: '1h' }
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

const updateUserPassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(401).json({message : 'Please provide both values'})
    }

    const user = await User.findOne({ _id: req.user.userId })

    const isPasswordCorrect = await user.comparePassword(oldPassword)
    if (!isPasswordCorrect) {
        return res.status(401).json({ message: 'Invalid Credentials' })
    }
    user.password = newPassword
  
    await user.save()
    res.status(200).json({ msg: 'Success! Password Updated.' })
}


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    verifyUserOTP,
    updateUserPassword,
}