const sendEmailEthereal = require('../controllers/sendEmail');

const sendVerificationEmail = async ({
    name,
    email,
    verificationToken,
    origin,
}) => {
    const verifyEmail = `${origin}/user/verify-email?token=${verificationToken}&email=${email}`;

    const message = `<p>Please confirm your email by clicking on the following link : 
    <a href="${verifyEmail}">Verify Email</a> </p>`;

    try {
        const info = await sendEmailEthereal({
            to: email,
            subject: 'Email Confirmation',
            html: `<h4> Hello, ${name}</h4>
            ${message}
            `,
        });
        return info;
    } catch (error) {
        throw new Error('Error sending verification email');
    }
};

module.exports = sendVerificationEmail;


