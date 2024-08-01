const { Model } = require('mongoose')
const User = require('../models/User')
const sendVerificationEmail = require('../utils/sendVerificationEmail')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const register = async (req, res) => {
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

        // Create a new user
        const verificationToken = crypto.randomBytes(32).toString('hex')
        const user = new User({
            fullname,
            email,
            password,
            phone_number,
            address,
            verificationToken,
            isVerified: false
        });

        await user.save();

        // Send verification email

        const origin = process.env.ORIGIN;

        await sendVerificationEmail({
            name: user.firstname,
            email: user.email,
            verificationToken: user.verificationToken,
            origin,
        })
        res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.' });
    } catch (error) {
        res.status(500).json({ message: 'User registration failed', error });
    }
}

const login = async (req, res) => {
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

const logout = async (req, res) => {
    // clear the token on the client-side
    res.status(200).json({ message: 'Logout successful. Please remove the token on the client-side.' })
}

const verifyEmail = async (req, res) => {
    try {
        const { verificationToken, email } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.verificationToken !== verificationToken) {
            return res.status(400).json({ message: 'Verification Failed' });
        }

        user.isVerified = true,
        user.verificationToken = undefined

        await user.save();

        res.status(200).json({ message: 'Email successfully verified' });
    } catch (error) {
        res.status(500).json({ message: 'Email verification failed', error });
    }
}

const updateUserPassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(401).json({message : 'Please provide both values'});
    }

    const user = await User.findOne({ _id: req.user.userId });

    const isPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isPasswordCorrect) {
        return res.status(401).json({ message: 'Invalid Credentials' });
    }
    user.password = newPassword;
  
    await user.save();
    res.status(200).json({ msg: 'Success! Password Updated.' });
};



module.exports = {
    register,
    login,
    logout,
    verifyEmail,
    updateUserPassword,
};