/**
 * auth.js
 * JWT authentication and role-based access control middleware.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'vacciora-secret-key-production-uip-2026';

/**
 * Authenticates user via Bearer JWT.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).populate('facilityId');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive or does not exist.' });
    }

    // If account requires a password change, restrict access to everything except password change
    if (user.requirePasswordChange && req.path !== '/change-password' && !req.path.includes('/auth/change-password')) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'A password change is mandatory before you can access the application.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

/**
 * Role-based access control.
 * @param  {...string} allowedRoles - e.g. 'admin', 'staff', 'parent'
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of roles: [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
  JWT_SECRET
};
