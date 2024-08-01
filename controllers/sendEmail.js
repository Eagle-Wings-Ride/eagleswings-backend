const nodemailer = require('nodemailer');
require('dotenv').config()


const sendEmailEthereal = async ({ to, subject, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        let info = await transporter.sendMail({
            from: '"Eagles Wings Ride Mobile" <timmyspark4@gmail.com>',
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