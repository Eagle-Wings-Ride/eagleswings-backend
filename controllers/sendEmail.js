const { Resend } = require("resend");
require('dotenv').config()

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmailEthereal = async ({ to, subject, html }) => {
    try {
        const data = await resend.emails.send({
          from: "Eagles Wings Ride Mobile <no-reply@eagleswingsride.com>",
          to,
          subject,
          html,
        });

        return data;
      } catch (error) {
        throw error;
    }
};

module.exports = sendEmailEthereal;