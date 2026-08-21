import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ca_evaluator_jwt_secret_key_2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to evaluate answers.',
      code: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn('JWT verification failed:', err.message);
    return res.status(401).json({
      error: 'Invalid or expired authentication token. Please log in again.',
      code: 'INVALID_TOKEN'
    });
  }
}
