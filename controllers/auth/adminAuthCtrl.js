const Admin = require('../../models/Admin')
const TokenBlacklist = require('../../models/tokenBlacklist')
const sendVerificationEmail = require('../../utils/sendVerificationEmail')
const jwt = require('jsonwebtoken')
const { compare } = require('bcryptjs')


const registerAdmin = async (req, res) => {
    const { fullname, email, password} = req.body;

    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'Please provide fullname, email, and password' });
    }

    try {
        const emailExists = await Admin.findOne({ email });
        if (emailExists) {
            return res.status(409).json({ message: 'Email already exists' });
        }


        const admin = new Admin({
            fullname,
            email,
            password,
            otp: req.otp,
            otpExpiry: req.otpExpiry,
            isVerified: false,
        });

        await admin.save();

        await sendVerificationEmail({
            name: admin.fullname,
            email: admin.email,
            otp: req.otp,
            type: "Email",
        });

        res.status(201).json({
            message: 'Admin registered successfully. Please check your email to verify your account.',
        });
    } catch (error) {
        res.status(500).json({ message: 'Admin registration failed', error: error.message || error });
    }
};

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        // Find admin by email
        const admin = await Admin.findOne({ email });

        // Check if admin exists
        if (!admin) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Check if admin is verified
        if (!admin.isVerified) {
            return res.status(401).json({ message: 'Please verify your email address' });
        }

        // Compare provided password with stored password
        const isPasswordCorrect = await admin.comparePassword(password);

        // Check if password is correct
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { adminId: admin._id, email: admin.email, role: admin.role },
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

const verifyAdminOTP = async (req, res) => {
    try {
        const { email, otp } = req.body

        // Find admin by email
        const admin = await Admin.findOne({ email })
        if (!admin) {
            return res.status(400).json({ message: 'Invalid email or OTP' })
        }

        // Check if admin is already verified
        if (admin.isVerified) {
            return res.status(200).json({ message: 'Admin is already verified' });
        }

        // Check if OTP matches and is not expired
        if (admin.otp !== otp || admin.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' })
        }

        admin.isVerified = true
        admin.otp = undefined
        admin.otpExpiry = undefined

        await admin.save()

        res.status(200).json({ message: 'OTP verified successfully' })
    } catch (error) {
        res.status(500).json({ message: 'OTP verification failed', error })
    }
}

const resendAdminOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (admin.isVerified) {
            return res.status(400).json({ message: 'Admin is already verified' });
        }

        admin.otp = req.otp;
        admin.otpExpiry = req.otpExpiry;

        await admin.save();

        await sendVerificationEmail({
            name: admin.fullname,
            email: admin.email,
            otp: req.otp,
            type: "Email",
        });

        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
    }
};

module.exports = {
    registerAdmin,
    loginAdmin,
    verifyAdminOTP,
    resendAdminOTP,
}
