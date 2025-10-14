const sendEmailEthereal = require('../controllers/sendEmail');

const sendReminderEmail = async ({ name, email}) => {
  if (!name || !email) {
    throw new Error('Missing required parameters: name, email');
  }

  const message = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eagles Ride - Service Reminder</title>
    <style>
      body {
        margin: 0; padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #f8fafc;
        color: #334155;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0,0,0,0.05);
      }
      .header {
        background: #FF5500;
        color: white;
        text-align: center;
        padding: 32px 24px;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
      }
      .content {
        padding: 32px 24px;
        text-align: center;
      }
      .content h2 {
        color: #1E293B;
        font-size: 24px;
        margin-bottom: 16px;
      }
      .content p {
        color: #64748B;
        font-size: 16px;
        margin-bottom: 24px;
      }
      .cta-button {
        display: inline-block;
        padding: 14px 28px;
        background: #FF5500;
        color: white;
        font-weight: bold;
        text-decoration: none;
        border-radius: 8px;
        margin-bottom: 24px;
      }
      .footer {
        background: #f1f5f9;
        text-align: center;
        padding: 24px;
        font-size: 14px;
        color: #64748B;
      }
      .footer a {
        color: #FF5500;
        text-decoration: none;
      }
      @media (max-width: 600px) {
        .content { padding: 24px 16px; }
        .header { padding: 24px 16px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Eagles Ride</h1>
      </div>
      <div class="content">
        <h2>Service Expiration Reminder</h2>
        <p>Hello ${name},</p>
        <p>Your booking is set to expire in 3 days. To avoid service interruption, please renew your payment in the app.</p>
        <p>If you’ve already renewed, you can safely ignore this message.</p>
      </div>
      <div class="footer">
        &copy; 2025 Eagles Wings Ride. All rights reserved.<br>
        <a href="https://eagleswingsride.com">Visit our website</a>
      </div>
    </div>
  </body>
  </html>
  `;

  const subject = '⚠️ Service Expiration Reminder - Eagles Wings Ride';

  try {
    const info = await sendEmailEthereal({
      to: email,
      subject,
      html: message,
    });
    return info;
  } catch (error) {
    throw new Error('Error sending service reminder email');
  }
};

module.exports = sendReminderEmail;