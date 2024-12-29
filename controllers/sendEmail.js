const nodemailer = require('nodemailer');
require('dotenv').config()


const sendEmailEthereal = async ({ to, subject, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.resend.com",
            port: 465,
            secure: true,
            auth: {
              user: 'resend',
              pass: process.env.RESEND_API_KEY,
            },
          });

        let info = await transporter.sendMail({
            from: '"Eagles Wings Ride Mobile" <no-reply@eagleswingsride.com>',
            to,
            subject,
            html,
        });

        return info;
    } catch (error) {
        // Handle error
        throw error;
    }
};

module.exports = sendEmailEthereal;