'use strict';

// Restricts a route to users whose Keycloak realm roles include at least one of `roles`.
// Must run after the `auth` middleware, which populates `req.user.roles`.
const requireRole = (...roles) => (req, res, next) => {
  const userRoles = req.user?.roles || [];
  if (!roles.some((role) => userRoles.includes(role))) {
    return res.status(403).json({ message: 'Insufficient role' });
  }
  next();
};

module.exports = requireRole;
