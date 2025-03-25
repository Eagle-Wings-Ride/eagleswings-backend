const { mongoose } = require('mongoose')
const { Schema } = mongoose
const bcrypt = require('bcryptjs');


const DriverSchema = new Schema({
    fullname : {
        type: String,
        required: [true, 'Please provide a name'],
        minlength: 3,
        maxlength: 50
    },
    email : {
        type: String,
        unique: true,
        required : [true, 'Please provide Email']
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
        minlength: [6, 'password length too short'],
    },
    phone_number : {
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
    car_insurance : String,
    background_check : String,
    government_issued_id : String,
    criminal_check_rec : String,
    child_intervention_rec : String,
    driver_abstract : String,
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isDriverApproved: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['booked', 'notavailable','busy', 'completed', 'cancelled'],
        default: 'notavailable',
    },
    start_latitude:{
        type: String,
    },
    start_longitude:{
        type: String,
    },
    end_latitude:{
        type: String,
    },
    end_longitude:{
        type: String,
    },
    otp: String,
    otpExpiry: Date,
    createdAt: {
        type: Date,
        default: Date.now() 
    }
})

DriverSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

DriverSchema.methods.comparePassword = async function (canditatePassword) {
    const isMatch = await bcrypt.compare(canditatePassword, this.password);
    return isMatch;
};

module.exports = mongoose.model('Driver', DriverSchema)