const sendEmailEthereal = require('../controllers/sendEmail')

const sendVerificationEmail = async ({
    name,
    email,
    otp
}) => {

    const message = `<p>Your OTP code is <strong>${otp}</strong>. Please use this code to verify your account.</p>`

    try {
        const info = await sendEmailEthereal({
            to: email,
            subject: 'Your OTP Code for Account Verification',
            html: `<h4> Hello, ${name}</h4>
            ${message}
            `,
        })
        return info
    } catch (error) {
        throw new Error('Error sending Otp Code')
    }
}

module.exports = sendVerificationEmail