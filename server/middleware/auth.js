const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // 1. Get token from the "Authorization" header ("Bearer <TOKEN>")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Reject if no token is provided
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. Please log in first.' 
    });
  }

  try {
    // 3. Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // 4. Attach decoded payload (userId, email) to the request object
    req.user = decoded;
    
    // 5. Pass control to the next route handler
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token. Please log in again.' 
    });
  }
};

module.exports = authenticateToken;