const sendEmailEthereal = require('../controllers/sendEmail')

const sendVerificationEmail = async ({ name, email, otp, type}) => {
    if (!name || !email || !otp || !type) {
      throw new Error('Missing required parameters: name, email, otp, or type');
    }

    const message = 
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <title>Verify Your Email - EaglesRide</title>
      <style>
        /* Reset styles for email clients */
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        table, td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        
        img {
          -ms-interpolation-mode: bicubic;
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
        }
        
        /* Base styles */
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #334155;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        
        /* Header */
        .header {
          background: #FF5500;
          padding: 32px 24px;
          text-align: center;
        }
        
        .logo {
          color: #ffffff !important;
          font-size: 32px;
          font-weight: 800;
          text-decoration: none;
          margin: 0;
        }
        
        .tagline {
          color: #E0E7FF !important;
          font-size: 14px;
          margin: 8px 0 0 0;
        }
        
        /* Content */
        .content {
          padding: 48px 24px;
        }
        
        .content h1 {
          color: #1E293B;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 16px 0;
          text-align: center;
        }
        
        .content p {
          color: #64748B;
          font-size: 16px;
          margin: 0 0 24px 0;
          text-align: center;
        }
        
        /* Verification Code */
        .verification-code-container {
          background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
          border: 2px solid #E2E8F0;
          border-radius: 16px;
          padding: 32px;
          margin: 32px 0;
          text-align: center;
        }
        
        .verification-code-label {
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 16px 0;
        }
        
        .verification-code {
          background: linear-gradient(135deg, #FF5500 0%, #c17f61 100%);
          color: #ffffff;
          font-size: 36px;
          font-weight: 800;
          font-family: 'Courier New', monospace;
          letter-spacing: 8px;
          padding: 20px 32px;
          border-radius: 12px;
          display: inline-block;
          margin: 0px 0px 16px 0px;
          box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.25);
        }
        
        .code-expiry {
          color: #EF4444;
          font-size: 14px;
          font-weight: 500;
          margin: 16px 0 0 0;
        }
        
        /* Instructions */
        .instructions {
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 12px;
          padding: 20px;
          margin: 32px 0;
        }
        
        .instructions p {
          color: #92400E;
          font-size: 14px;
          margin: 0;
          text-align: left;
        }
        
        .instructions strong {
          color: #78350F;
        }
        
        /* Security Notice */
        .security-notice {
          background: #FEE2E2;
          border: 1px solid #F87171;
          border-radius: 12px;
          padding: 20px;
          margin: 32px 0;
        }
        
        .security-notice p {
          color: #991B1B;
          font-size: 14px;
          margin: 0;
          text-align: left;
        }
        
        /* Footer */
        .footer {
          background-color: #F8FAFC;
          padding: 32px 24px;
          text-align: center;
          border-top: 1px solid #E2E8F0;
        }
        
        .footer p {
          color: #64748B;
          font-size: 14px;
          margin: 0 0 16px 0;
        }
        
        .footer-links {
          margin: 24px 0 0 0;
        }
        
        .footer-links a {
          color: #FF5500;
          text-decoration: none;
          margin: 0 16px;
          font-size: 14px;
        }
        
        .footer-links a:hover {
          text-decoration: underline;
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          
          .header {
            padding: 24px 16px;
          }
          
          .content {
            padding: 32px 16px;
          }
          
          .content h1 {
            font-size: 24px;
          }
          
          .verification-code {
            font-size: 28px;
            letter-spacing: 6px;
            padding: 16px 24px;
          }
          
          .verification-code-container {
            padding: 24px 16px;
          }
          
          .footer {
            padding: 24px 16px;
          }
          
          .footer-links a {
            display: block;
            margin: 8px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
         <div class="header">
                <h1 class="logo" style="color:#ffffff !important;">Eagles Ride</h1>
            </div>
        
        <!-- Content -->
        <div class="content">
          <h1>Your OTP Code for ${type} Verification</h1>
          <p>Use the code below to complete your email verification on Eagles Ride.</p>
          
          <!-- Verification Code -->
          <div class="verification-code-container">
            <p class="verification-code-label">Verification Code</p>
            <div class="verification-code">${otp}</div>
            <p class="code-expiry">⏰ Expires in 10 minutes</p>
          </div>
          
          <!-- Instructions -->
          <div class="instructions">
            <p><strong>How to use this code:</strong></p>
            <p>1. Return to the EaglesRide Mobile App</p>
            <p>2. Enter the 6-digit code exactly as shown above</p>
            <p>3. Click "Verify" to complete your email verification request</p>
          </div>
          
          <!-- Security Notice -->
          <div class="security-notice">
            <p><strong>⚠️ Security Notice:</strong> If you didn't request this verification code, you can safely ignore this email. Never share your verification codes with anyone.</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>&copy; 2025 Eagles Wings Ride. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `
    const subject = `Your OTP Code for ${type} Verification`


    try {
        const info = await sendEmailEthereal({
            to: email,
            subject,
            html: `${message}`,
        })
        return info
    } catch (error) {
        throw new Error('Error sending Otp Code')
    }
}

module.exports = sendVerificationEmail