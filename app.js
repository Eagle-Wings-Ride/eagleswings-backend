// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

const stripeWebhook = require('./utils/webhook');
require('./cron/serviceExpiration');

// Routes
const users = require('./routes/user');
const driver = require('./routes/driver');
const booking = require('./routes/bookings');
const rates = require('./routes/rates');
const admin = require('./routes/admin');

// Middleware
const notFoundHandler = require('./middleware/notFound');
const connectDB = require('./db/connect_db');

// Stripe webhook
app.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// App routes
app.use('/api/v1/users', users);
app.use('/api/v1/drivers', driver);
app.use('/api/v1/book', booking);
app.use('/api/v1/rates', rates);
app.use('/api/v1/admin', admin);

// 404 handler
app.use(notFoundHandler);


const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.error(error);
  }
};

start();