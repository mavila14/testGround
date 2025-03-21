/***************************************************************
 * user-auth.js
 *
 * Provides login & signup forms for your Azure Static Web App,
 * calling the Functions at /api/Register and /api/Login.
 ***************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const userProfile = document.getElementById('user-profile');
  // For Azure Static Web Apps, the Functions are accessible at /api
  const API_BASE_URL = '/api';

  // Check if there's a JWT in localStorage
  const token = localStorage.getItem('token');
  if (token) {
    // If we have a token, show the user's profile
    showUserProfile();
  } else {
    // Otherwise, show login/signup tabs
    renderAuthTabs();
  }

  /****************************************************
   * RENDER FUNCTIONS
   ****************************************************/

  function showUserProfile() {
    // We stored the username in localStorage upon login.
    const username = localStorage.getItem('username') || 'User';

    userProfile.innerHTML = `
      <div class="user-info">
        <div class="user-avatar default">${username.charAt(0).toUpperCase()}</div>
        <div>
          <div class="user-name">${username}</div>
          <div class="user-provider">Local</div>
        </div>
      </div>
      <button class="logout-btn">Logout</button>
    `;

    document.querySelector('.logout-btn').addEventListener('click', () => {
      // Clear the JWT and username from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      // Show the login/signup tabs again
      renderAuthTabs();
    });
  }

  function renderAuthTabs() {
    userProfile.innerHTML = `
      <div class="auth-tabs">
        <button id="tab-login" class="auth-tab active">Login</button>
        <button id="tab-signup" class="auth-tab">Sign Up</button>
      </div>
      <div id="auth-content"></div>
    `;

    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authContent = document.getElementById('auth-content');

    // Show login form by default
    showLoginForm();

    // Tab click handlers
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      showLoginForm();
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      showSignupForm();
    });

    function showLoginForm() {
      authContent.innerHTML = `
        <form id="login-form" class="login-form">
          <h3>Login</h3>
          <div class="form-group">
            <label for="login-username">Username</label>
            <input type="text" id="login-username" placeholder="Enter username" required />
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" placeholder="Enter password" required />
          </div>
          <button type="submit" class="login-btn">Login</button>
          <div id="login-error" class="login-error"></div>
        </form>
      `;

      const loginForm = document.getElementById('login-form');
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        try {
          const resp = await fetch(`${API_BASE_URL}/Login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await resp.json();

          if (!resp.ok) {
            errorDiv.textContent = data.error || 'Login failed';
            return;
          }

          // Success: store token + username
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', username);

          showUserProfile();
        } catch (err) {
          console.error('Login error:', err);
          errorDiv.textContent = 'Network error. Try again later.';
        }
      });
    }

    function showSignupForm() {
      authContent.innerHTML = `
        <form id="signup-form" class="login-form">
          <h3>Create Account</h3>
          <div class="form-group">
            <label for="signup-username">Username</label>
            <input type="text" id="signup-username" placeholder="Choose a username" required />
          </div>
          <div class="form-group">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" placeholder="Choose a password" required />
          </div>
          <button type="submit" class="login-btn">Sign Up</button>
          <div id="signup-error" class="login-error"></div>
        </form>
      `;

      const signupForm = document.getElementById('signup-form');
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('signup-error');

        try {
          const resp = await fetch(`${API_BASE_URL}/Register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await resp.json();

          if (!resp.ok) {
            errorDiv.textContent = data.error || 'Sign-up failed';
            return;
          }

          // Registration success; inform user or auto-login
          errorDiv.style.color = 'green';
          errorDiv.textContent = 'User created successfully! You can now log in.';
        } catch (err) {
          console.error('Sign-up error:', err);
          errorDiv.textContent = 'Network error. Try again later.';
        }
      });
    }
  }
});
