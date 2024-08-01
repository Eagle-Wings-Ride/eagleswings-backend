const express = require('express');
const app = express()
const users = require('./routes/user')
const connectDB = require('./db/connect_db')
require('dotenv').config()


// middleware
app.use(express.json())


// Routes
app.use('/api/v1/users', users)

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