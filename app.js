const express = require('express');
const cors = require('cors')
const app = express()
const users = require('./routes/user')
const booking = require('./routes/bookings')
const rates = require('./routes/rates')
const admin = require('./routes/admin')
const notFoundHandler = require('./middleware/notFound')
const connectDB = require('./db/connect_db')
require('dotenv').config()


// middleware
app.use(cors())
app.use(express.json())


// Routes
app.use('/api/v1/users', users)
app.use('/api/v1/book', booking)
app.use('/api/v1/rates', rates)
app.use('/api/v1/admin', admin)

// Error for 404 handlers
app.use(notFoundHandler)


const port = process.env.PORT || 5000;


const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();