'use strict';

// Rejects any request that didn't pass through Kong, so the API is never reachable
// directly and can't bypass Kong's authentication/rate-limiting layer. Kong is configured
// (see kong/kong.yml) to inject this shared secret via its pre-function plugin.
const gateway = (req, res, next) => {
  const expected = process.env.KONG_GATEWAY_SECRET;
  if (!expected) {
    // Misconfiguration: fail closed rather than silently allowing unchecked traffic
    return res.status(500).json({ message: 'Gateway secret not configured' });
  }

  if (req.headers['x-gateway-secret'] !== expected) {
    return res.status(403).json({ message: 'Forbidden: request did not originate from the gateway' });
  }

  next();
};

module.exports = gateway;
