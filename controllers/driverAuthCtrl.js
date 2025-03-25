const Driver = require('../models/Driver')
const TokenBlacklist = require('../models/tokenBlacklist')
const sendVerificationEmail = require('../utils/sendVerificationEmail')
const jwt = require('jsonwebtoken')
const { compare } = require('bcryptjs')


const registerDriver = async (req, res) => {
    const { fullname, email, password, phone_number, residential_address } = req.body;

    // Input validation
    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'Please provide fullname, email, and password' });
    }

    try {
        // Check if email already exists
        const emailExists = await Driver.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ message: 'Email already exists' })
        }

        const phoneNumberExists = await Driver.findOne({ phone_number });
        if (phoneNumberExists) {
            return res.status(409).json({ message: 'Phone number already exists' });
        }

        // Create a new Driver
        const driver = new Driver({
            fullname,
            email,
            password,
            phone_number,
            residential_address,
            otp: req.otp,
            otpExpiry: req.otpExpiry,
            isEmailVerified: false
        });

        await driver.save();

        // Send verification email

        await sendVerificationEmail({
            name: driver.fullname,
            email: driver.email,
            otp: req.otp,
            type: "Email",
        });

        res.status(201).json({ message: 'Driver registered successfully. Please check your email to verify your account.' });
    } catch (error) {
        res.status(500).json({ message: 'Driver registration failed', error });
    }
}

const loginDriver = async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        // Find driver by email
        const driver = await Driver.findOne({ email });

        // Check if driver exists
        if (!driver) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Check if driver is verified
        if (!driver.isEmailVerified) {
            return res.status(401).json({ message: 'Please verify your email address' });
        }

        // Compare provided password with stored password
        const isPasswordCorrect = await driver.comparePassword(password);

        // Check if password is correct
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { driverId: driver._id, email: driver.email },
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

const logoutDriver = async (req, res) => {
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

const verifyDriverOTP = async (req, res) => {
    try {
        const { email, otp } = req.body

        // Find driver by email
        const driver = await Driver.findOne({ email })
        if (!driver) {
            return res.status(400).json({ message: 'No Driver found' })
        }

        // Check if driver is already verified
        if (driver.isEmailVerified) {
            return res.status(200).json({ message: 'Driver is already verified' });
        }

        // Check if OTP matches and is not expired
        if (driver.otp !== otp || driver.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' })
        }

        driver.isEmailVerified = true
        driver.otp = undefined
        driver.otpExpiry = undefined

        await driver.save()

        res.status(200).json({ message: 'OTP verified successfully' })
    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed', error })
    }
}

const resendDriverOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const driver = await Driver.findOne({ email });
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        if (driver.isEmailVerified) {
            return res.status(400).json({ message: 'Driver is already verified' });
        }

        driver.otp = req.otp;
        driver.otpExpiry = req.otpExpiry;

        await driver.save();

        await sendVerificationEmail({
            name: driver.fullname,
            email: driver.email,
            otp: req.otp,
            type: "Email",
        });

        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
    }
};


module.exports = {
    registerDriver,
    loginDriver,
    logoutDriver,
    verifyDriverOTP,
    resendDriverOTP,
}