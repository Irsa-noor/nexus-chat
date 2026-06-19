import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }

    if (username.length > 20) {
      setError('Username must be less than 20 characters');
      return false;
    }

    if (!isLogin && !email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!isLogin && (!email.includes('@') || !email.includes('.'))) {
      setError('Invalid email format');
      return false;
    }

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (password.length > 100) {
      setError('Password must be less than 100 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateInputs()) {
      return;
    }
    
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/signup';
    const payload = isLogin 
      ? { username, password }
      : { username, email, password };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.');
        setLoading(false);
        return;
      }

      // Success - store in sessionStorage
      sessionStorage.setItem('user', JSON.stringify(data.user));
      onAuthSuccess(data.user);
    } catch (err) {
      console.error('Auth error:', err);
      
      if (err.name === 'AbortError') {
        setError('Request timeout. Is the server running on port 5000?');
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your connection.');
      } else {
        setError('Connection error. Is the server running on port 5000?');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Nexus Chat</h1>
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              maxLength="20"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              maxLength="100"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setUsername('');
                setEmail('');
                setPassword('');
              }}
              disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 