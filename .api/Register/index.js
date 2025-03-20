const bcrypt = require('bcrypt');
const { userStore } = require('../shared/userStore');

module.exports = async function (context, req) {
  context.log('Register function triggered');

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

    // Check if user already exists
    const existingUser = userStore.find(u => u.username === username);
    if (existingUser) {
      context.res = { status: 400, body: { error: 'User already exists' } };
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in memory
    userStore.push({ username, password: hashedPassword });

    context.res = { body: { message: 'User created successfully' } };
  } catch (err) {
    context.log('Error in register function:', err);
    context.res = { status: 500, body: { error: 'Internal server error' } };
  }
};
