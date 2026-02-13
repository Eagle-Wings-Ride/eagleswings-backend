require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./db/connect_db');
const setupSockets = require('./sockets/sockets');

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);

    const server = http.createServer(app);
    setupSockets(server);

    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
  }
};

start();