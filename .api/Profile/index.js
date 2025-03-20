const jwt = require('jsonwebtoken');
const { userStore } = require('../shared/userStore');

const JWT_SECRET = process.env.JWT_SECRET || 'LOCAL_SECRET_KEY';

module.exports = async function (context, req) {
  context.log('Profile function triggered');

  if (req.method !== 'GET') {
    context.res = { status: 405, body: 'Method Not Allowed' };
    return;
  }

  try {
    // Expect 'Authorization: Bearer <token>'
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.split(' ')[1];
    if (!token) {
      context.res = { status: 401, body: { error: 'Missing token' } };
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        context.res = { status: 401, body: { error: 'Invalid token' } };
        return;
      }
      // Return some user info
      context.res = { body: { username: decoded.username, message: 'Protected content' } };
    });
  } catch (err) {
    context.log('Error in profile function:', err);
    context.res = { status: 500, body: { error: 'Internal server error' } };
  }
};
