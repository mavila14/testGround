const jwt = require('jsonwebtoken');
const { userStore } = require('../shared/userStore');

const JWT_SECRET = process.env.JWT_SECRET || 'LOCAL_SECRET_KEY';

module.exports = async function (context, req) {
  context.log('Profile data function triggered');

  // Expect 'Authorization: Bearer <token>'
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    context.res = { status: 401, body: { error: 'Missing token' } };
    return;
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decoded.username;

    // Find the user
    const user = userStore.find(u => u.username === username);
    if (!user) {
      context.res = { status: 404, body: { error: 'User not found' } };
      return;
    }

    if (req.method === 'GET') {
      // Return the user's profile data
      context.res = { body: user.profileData || {} };
    } else if (req.method === 'POST') {
      // Update the user's profile data
      user.profileData = req.body;
      context.res = { body: { message: 'Profile updated successfully' } };
    } else {
      context.res = { status: 405, body: 'Method Not Allowed' };
    }
  } catch (err) {
    context.log('Error in profile data function:', err);
    context.res = { status: 401, body: { error: 'Invalid token' } };
  }
};
