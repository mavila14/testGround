const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { userStore } = require('../shared/userStore');

// In production, use a real secret from environment variables or Azure Key Vault
const JWT_SECRET = process.env.JWT_SECRET || 'LOCAL_SECRET_KEY';

module.exports = async function (context, req) {
  context.log('Login function triggered');

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method Not Allowed' };
    return;
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      context.res = { status: 400, body: { error: 'Missing username or password' } };
      return;
    }

    // Check if user exists
    const user = userStore.find(u => u.username === username);
    if (!user) {
      context.res = { status: 400, body: { error: 'Invalid username or password' } };
      return;
    }

    // Compare the given password with the stored hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      context.res = { status: 400, body: { error: 'Invalid username or password' } };
      return;
    }

    // Generate JWT
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    context.res = { body: { message: 'Login successful', token } };
  } catch (err) {
    context.log('Error in login function:', err);
    context.res = { status: 500, body: { error: 'Internal server error' } };
  }
};
