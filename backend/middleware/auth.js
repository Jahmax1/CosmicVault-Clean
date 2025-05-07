// C:\Users\HP\CosmicVault-New\backend\middleware\auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  console.log('[AuthMiddleware] Checking authorization for:', req.method, req.url);
  
  // Get token from Authorization header
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    console.log('[AuthMiddleware] No Authorization header provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Check for Bearer token format
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    console.log('[AuthMiddleware] Invalid token format');
    return res.status(401).json({ message: 'Invalid token format' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AuthMiddleware] Token verified, user ID:', decoded.id);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Token verification failed:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;