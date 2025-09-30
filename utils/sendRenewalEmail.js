const sendEmailEthereal = require('../controllers/sendEmail');

const sendRenewalEmail = async ({ name, email, newEndDate, bookingId }) => {
    if (!name || !email) throw new Error('Missing required parameters: name, email');

    const message = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Booking Renewal Confirmation</title>
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
          <h2>Booking Renewal Successful!</h2>
          <p>Hello ${name},</p>
          <p>Your booking <span class="highlight">Your booking ${bookingId}</span> has been successfully renewed.</p>
          <p>The new service end date is: <span class="highlight">${newEndDate}</span>.</p>
          <p>Please ensure timely payments to continue enjoying your ride services.</p>
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
            subject: 'Booking Renewal Confirmation',
            html: message,
        });
        return info;
    } catch (error) {
        throw new Error('Error sending renewal email: ' + error.message);
    }
};

module.exports = sendRenewalEmail;
