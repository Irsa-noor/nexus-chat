import React, { useState, useEffect } from 'react';
import AuthPage from './AuthPage';
import ChatApp from './ChatApp';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Use sessionStorage instead of localStorage
    // This clears when tab closes, so each new tab needs login
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    // Save to sessionStorage (not localStorage)
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="App">
      <ChatApp user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App; 