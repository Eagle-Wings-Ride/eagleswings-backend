const sendEmailEthereal = require('../controllers/sendEmail');

const sendRideRegistrationEmail = async ({ name, email, childName, tripType, scheduleType }) => {
    if (!name || !email) throw new Error('Missing required parameters: name, email');

    const message = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Ride Registration Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f8fafc; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; }
        .header { text-align: center; background: #FF5500; color: #fff; padding: 24px; border-radius: 12px 12px 0 0; }
        .content { padding: 24px; text-align: center; }
        .footer { text-align: center; font-size: 12px; color: #64748B; padding: 16px; }
        .highlight { font-weight: bold; color: #FF5500; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Eagles Wings Ride</h1>
        </div>
        <div class="content">
          <h2>Ride Registration Successful!</h2>
          <p>Hello ${name},</p>
          <p>Your booking for <span class="highlight">${childName}</span> has been successfully registered.</p>
          <p>Trip type: <span class="highlight">${tripType}</span></p>
          <p>Schedule type: <span class="highlight">${scheduleType}</span></p>
          <p>You will be notified once a driver has been assigned.</p>
        </div>
        <div class="footer">
          &copy; 2025 Eagles Wings Ride. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    try {
        const info = await sendEmailEthereal({
            to: email,
            subject: 'Ride Registration Confirmation',
            html: message,
        });
        return info;
    } catch (error) {
        throw new Error('Error sending ride registration email: ' + error.message);
    }
};

module.exports = sendRideRegistrationEmail;
