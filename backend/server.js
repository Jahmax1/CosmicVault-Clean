// C:\Users\HP\CosmicVault\backend\server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('redis');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const depositRoutes = require('./routes/deposit');
const withdrawRoutes = require('./routes/withdraw');
const sendRoutes = require('./routes/send');
const savingsRoutes = require('./routes/savings');
const investmentsRoutes = require('./routes/investments');
const redeemRoutes = require('./routes/redeem');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Redis setup
const redisClient = createClient({
  url: process.env.REDIS_URI,
});
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect().then(() => console.log('Redis connected'));

// MongoDB setup
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.IO for notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// Make redisClient and io available to routes
app.set('redisClient', redisClient);
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', depositRoutes);
app.use('/api', withdrawRoutes);
app.use('/api', sendRoutes);
app.use('/api', savingsRoutes);
app.use('/api', investmentsRoutes);
app.use('/api', redeemRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));