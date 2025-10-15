# 🦅 Eagles Ride Booking API

**Eagles Wings Ride** is a backend API built to support a child-focused ride booking platform. It allows parents to schedule rides for their children, supports secure payments via Stripe, and offers management portals for both admins and drivers.

---

## 🚀 Features

- 📆 Schedule rides (one-way or return) with options for custom, 2-week, or 1-month durations.
- 🧒 Rides are linked to child profiles with preset home, school, and daycare addresses.
- 🛠 Admin dashboard and driver portal capabilities.
- 💳 Stripe payment integration with webhook support.
- 📍 Supports future ride tracking functionality.
- 👤 Role-based access: Parent, Admin, Driver.

---

## 📁 Project Structure

├── controllers
│ ├── authController.js
│ ├── bookController.js
│ ├── driverController.js
│ └── adminController.js
├── models
│ ├── User.js
│ ├── Child.js
│ ├── Booking.js
│ ├── Driver.js
├── routes
│ ├── user.js
│ ├── booking.js
│ ├── driver.js
│ └── admin.js
├── utils
│ ├── stripeWebhook.js
│ └── cloudinaryUpload.js
├── .env
├── server.js

---

## 🧪 API Testing & Documentation

- API tested and documented using **Postman**.
- Future upgrade possible using Swagger or Redoc for interactive docs.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following:

```env
MONGO_URI=your_mongo_uri
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
DAILY_RATE=20.00
BI_WEEKLY_RATE=230.00
MONTHLY_RATE=420.00
JWT_SECRET=your_jwt_secret
📬 Webhook (Stripe)
Stripe webhook endpoint to update ride status on payment events:

POST /webhook
Register your webhook on the Stripe dashboard or test locally using ngrok/ Stripe CLI:

🔑 Key Routes
🔐 Auth Routes
POST /api/v1/auth/register — Register user

POST /api/v1/auth/login — Login user

🧒 Child Booking
POST /api/v1/book/:id — Book a ride for a child

💳 Payment
POST /api/v1/payment — Create Stripe PaymentIntent

POST /webhook — Stripe webhook to update booking status

🛠 Admin & Driver
GET /api/v1/admin/... — Admin tools

GET /api/v1/driver/... — Driver tools

📦 Installation & Running Locally
git clone https://github.com/Eagle-Wings-Ride/eagleswings-backend.git
cd eagles-backend
npm install
npm start
Ensure .env and database is connected correctly set up before running.

🌐 Deployment
Backend Hosted On: Railway

Can be consumed by mobile or web frontend clients via public API.

🙏 Acknowledgements
Built with 💙 for families and safe transportation of children.

📧 Contact
For issues or feature requests, feel free to reach out via GitHub.

---
