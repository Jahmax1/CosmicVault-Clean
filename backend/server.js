// C:\Users\HP\CosmicVault-New\backend\server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const registerRoutes = require('./routes/register');
const userRoutes = require('./routes/user');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log('[Server] Incoming request:', req.method, req.url);
  console.log('[Server] Request headers:', req.headers);
  console.log('[Server] Request body (pre-parsing):', req.body);
  next();
});

// Token refresh endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    console.log('[Refresh] No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('[Refresh] Token refreshed for user:', decoded.id);
    res.json({ token: newToken });
  } catch (err) {
    console.error('[Refresh] Token refresh error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Routes
app.use('/api/auth', registerRoutes);
app.use('/api', userRoutes);

// Socket.IO Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('[Socket.IO] Authentication error: No token provided');
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    console.log('[Socket.IO] User authenticated:', socket.userId);
    next();
  } catch (err) {
    console.error('[Socket.IO] Authentication error:', err.message);
    return next(new Error(`Authentication error: ${err.message}`));
  }
});

io.on('connection', (socket) => {
  console.log('[Socket.IO] User connected:', socket.userId);
  socket.join(socket.userId);

  socket.on('disconnect', () => {
    console.log('[Socket.IO] User disconnected:', socket.userId);
  });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log('[MongoDB] Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('[MongoDB] Connected to MongoDB');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    process.exit(1);
  }
};

// Start Server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
});

// Export io for use in routes
module.exports = { io };