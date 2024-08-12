const { mongoose } = require('mongoose')
const { Schema } = mongoose
const validator = require('validator');
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
        unique: True,
        required : [true, 'Please provide Email']
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
        minlength: [6, 'password length too'],
    },
    phone_number : {
        type: String,
        unique: True,
        required: [true, 'Please provide a Phone Number'],
    },
    age: {
        type: String,
        required: [true, 'Please provide your age'],
        minlength: [2, 'Enter an acceptable age'],
    },
    residential_address : {
        type: String,
        required: [true, 'Please provide your Address'],
    },
    preferred_route : {
        type: String,
        required : [true, 'Please enter your preferred route']
    },
    reasons : {
        type: String,
        required : [true, 'Please enter a reason for the answer above']
    },
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
    isDriverVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
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