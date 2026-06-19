import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatApp.css';

const ChatApp = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState('general');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Connect to backend
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      setError('');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server. Retrying...');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      setConnectionStatus('disconnected');
      if (reason === 'io server disconnect') {
        setError('Server disconnected. Please refresh the page.');
      } else if (reason !== 'io client namespace disconnect') {
        setError('Connection lost. Attempting to reconnect...');
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError('An error occurred. Please refresh the page.');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle incoming messages and events
  useEffect(() => {
    if (!socket) return;

    socket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
      setTypingUsers([]);
    });

    socket.on('user_joined', (data) => {
      if (data.users) {
        setUsers(data.users);
      }
    });

    socket.on('user_left', (data) => {
      if (data.users) {
        setUsers(data.users);
      }
    });

    socket.on('user_typing', (data) => {
      if (data.users) {
        setTypingUsers(data.users);
      }
    });

    return () => {
      socket.off('message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('user_typing');
    };
  }, [socket]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!socket || connectionStatus !== 'connected') {
      setError('Not connected to server. Please try again.');
      return;
    }
    if (socket && user) {
      try {
        socket.emit('join', { 
          username: user.username, 
          room,
          user_id: user.id
        });
        setJoined(true);
        setMessages([]);
        setError('');
      } catch (err) {
        console.error('Join error:', err);
        setError('Failed to join room. Please try again.');
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socket || connectionStatus !== 'connected') {
      setError('Not connected to server. Message not sent.');
      return;
    }
    if (messageInput.trim() && socket) {
      try {
        socket.emit('send_message', { message: messageInput });
        setMessageInput('');
        setTypingUsers([]);
      } catch (err) {
        console.error('Send message error:', err);
        setError('Failed to send message. Please try again.');
      }
    }
  };

  const handleTyping = (e) => {
    const text = e.target.value;
    setMessageInput(text);

    if (socket && text.trim() && connectionStatus === 'connected') {
      socket.emit('typing');
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && connectionStatus === 'connected') {
        socket.emit('stop_typing');
      }
    }, 1000);
  };

  const handleLeave = () => {
    setJoined(false);
    setMessages([]);
    setUsers([]);
    setTypingUsers([]);
    setError('');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!joined) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>Nexus Chat</h1>
          <p>Connect, chat, and collaborate in real time</p>
          
          {error && <div className="error-message">{error}</div>}
          
          {connectionStatus !== 'connected' && (
            <div className="connection-status" style={{
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '8px',
              background: connectionStatus === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              border: connectionStatus === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
              color: connectionStatus === 'error' ? '#ff6b6b' : '#3b82f6',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              {connectionStatus === 'connecting' && '⏳ Connecting to server...'}
              {connectionStatus === 'disconnected' && '🔄 Reconnecting...'}
              {connectionStatus === 'error' && '❌ Connection error - retrying...'}
            </div>
          )}
          
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label>Room</label>
              <select value={room} onChange={(e) => setRoom(e.target.value)} disabled={connectionStatus !== 'connected'}>
                <option value="general">General</option>
                <option value="random">Random</option>
                <option value="tech">Tech</option>
              </select>
            </div>
            <button type="submit" disabled={connectionStatus !== 'connected'}>
              {connectionStatus === 'connected' ? `Join Chat as ${user.username}` : 'Connecting...'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Nexus</h2>
          <span className="room-badge">{room.toUpperCase()}</span>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connectionStatus === 'connected' ? '#10b981' : '#ef4444',
            marginLeft: '8px',
            marginTop: '4px'
          }}></span>
        </div>
        
        <div>
          <h3>Online Users ({users.length})</h3>
          <ul className="users-list">
            {users.map((u, idx) => (
              <li key={idx}>
                <div className="user-avatar">{getInitials(u.username)}</div>
                <span>{u.username}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-spacer"></div>
        <div>
          <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px'}}>
            Logged in as <strong>{user.username}</strong>
          </p>
          <button className="leave-btn" onClick={handleLeave} style={{marginBottom: '8px'}}>
            Leave Room
          </button>
          <button className="leave-btn" onClick={onLogout} style={{background: 'rgba(239, 68, 68, 0.2)'}}>
            Logout
          </button>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <h2>Welcome to {room.charAt(0).toUpperCase() + room.slice(1)}</h2>
        </div>

        {error && <div className="error-message" style={{margin: '12px 20px 0'}}>{error}</div>}

        <div className="messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-wrapper ${msg.user_id === 'system' ? '' : ''}`}
            >
              {msg.user_id === 'system' ? (
                <div className="message system">
                  <div className="message-bubble">{msg.message}</div>
                </div>
              ) : (
                <div className={`message ${msg.user_id === user.id ? 'own' : ''}`}>
                  <div className="message-bubble">{msg.message}</div>
                  <div className="message-meta">
                    <div className="message-username">{msg.username}</div>
                    <div>{msg.timestamp}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {typingUsers.length > 0 && (
            <div className="message-wrapper">
              <div className="message typing-indicator">
                <span>{typingUsers.join(', ')} typing</span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <form onSubmit={handleSendMessage} className="input-form">
            <input
              type="text"
              placeholder={connectionStatus === 'connected' ? 'Type your message...' : 'Connecting...'}
              value={messageInput}
              onChange={handleTyping}
              disabled={connectionStatus !== 'connected'}
            />
            <button type="submit" disabled={connectionStatus !== 'connected'}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;  