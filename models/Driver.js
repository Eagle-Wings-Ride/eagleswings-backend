const { mongoose } = require('mongoose')
const { Schema } = mongoose
const bcrypt = require('bcryptjs');


const DriverSchema = new Schema({
    fullname: {
        type: String,
        required: [true, 'Please provide a name'],
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please provide Email']
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
        minlength: [6, 'password length too short'],
    },
    phone_number: {
        type: String,
        unique: true
    },
    age: {
        type: String,
        minlength: [2, 'Enter an acceptable age'],
    },
    image: String,
    residential_address: String,
    preferred_route: String,
    reasons: String,

    // Verification / credentials
    car_insurance: String,
    driver_license: String,
    criminal_check_rec: String,
    child_intervention_rec: String,
    driver_abstract: String,

    // Verification status
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isDriverApproved: {
        type: Boolean,
        default: false
    },

    // Current availability status (not per ride)
    status: {
        type: String,
        enum: ['driving', 'unavailable', 'online', 'offline'],
        default: 'unavailable',
    },

    // Live location for tracking
    current_latitude: Number,
    current_longitude: Number,

    // Optional start/end points (for ride assignment)
    start_latitude: Number,
    start_longitude: Number,
    end_latitude: Number,
    end_longitude: Number,

    otp: String,
    otpExpiry: Date,

    // Notifications
    fcmTokens: { type: [String], default: [] },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


DriverSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

DriverSchema.methods.comparePassword = async function (candidatePassword) {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
};

module.exports = mongoose.model('Driver', DriverSchema)