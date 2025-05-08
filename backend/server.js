// C:\Users\HP\CosmicVault-New\backend\server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const userRoutes = require('./routes/user');
const poolRoutes = require('./routes/pool');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('[Socket.IO] No token provided');
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    console.log('[Socket.IO] User authenticated:', socket.userId);
    next();
  } catch (err) {
    console.error('[Socket.IO] Authentication error:', err.message);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('[Socket.IO] User connected:', socket.userId);

  socket.join(socket.userId);
  console.log(`[Socket.IO] User ${socket.userId} joined room: ${socket.userId}`);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`[Socket.IO] User ${socket.userId} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] User disconnected:', socket.userId);
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api', userRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/auth', authRoutes);

// MongoDB connection with retry
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[MongoDB] Connected to MongoDB');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});