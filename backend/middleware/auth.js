// C:\Users\HP\CosmicVault-New\backend\middleware\auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  console.log('[AuthMiddleware] Checking authorization for:', req.method, req.path);
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('[AuthMiddleware] No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('[AuthMiddleware] Token verified, user ID:', decoded.id);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Invalid token:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};