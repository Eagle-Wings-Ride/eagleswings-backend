const sendEmailEthereal = require('../controllers/sendEmail')

const sendVerificationEmail = async ({ name, email, otp, type}) => {
    if (!name || !email || !otp || !type) {
      throw new Error('Missing required parameters: name, email, otp, or type');
    }

    const message = `<p>Your OTP code is <strong>${otp}</strong>. Please use this code to verify your account.</p>`
    const subject = `Your OTP Code for ${type} Verification`

    try {
        const info = await sendEmailEthereal({
            to: email,
            subject,
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