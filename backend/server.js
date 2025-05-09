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
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

const userConnections = new Map();

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

    if (userConnections.has(socket.userId)) {
      console.log(`[Socket.IO] User ${socket.userId} already connected, closing old connection`);
      userConnections.get(socket.userId).disconnect();
    }
    userConnections.set(socket.userId, socket);
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
    if (userConnections.get(socket.userId) === socket) {
      userConnections.delete(socket.userId);
    }
  });
});

// Log all incoming requests (before CORS)
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`, {
    body: req.method === 'POST' ? { ...req.body, password: '<redacted>' } : req.body,
    query: req.query,
    headers: req.headers.authorization ? 'Authorization: Bearer <redacted>' : 'No Authorization',
  });
  req.io = io;
  next();
});

// Explicit CORS handling
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Handle OPTIONS preflight explicitly
app.options('*', cors());

// JSON and static files
app.use(express.json());
app.use('/Uploads', express.static('Uploads'));

// Routes
app.use('/api', userRoutes(io));
app.use('/api/pools', poolRoutes(io));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });
  res.status(500).json({ message: 'Internal server error' });
});

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