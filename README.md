# Nexus Chat - Real-Time Chat Application

A real-time chat application built with React, Flask and Socket.IO.

## Features

- **Real-Time Messaging** - Instant message delivery using WebSockets
- **User Authentication** - Secure signup/login with password hashing
- **Message Persistence** - Messages saved to SQLite database
- **Typing Indicators** - See when users are typing
- **Multi-Room Support** - Separate chat rooms for different discussions
- **User Presence** - View online users in each room
- **Modern UI** - Clean, professional dark theme interface

##  Tech Stack

### Frontend
- React.js
- Socket.IO Client
- CSS3

### Backend
- Python 3.11+
- Flask
- Flask-SocketIO
- SQLAlchemy
- SQLite

## Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Server runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

##  Usage

1. **Signup** - Create account with username, email, password
2. **Login** - Sign in with credentials
3. **Select Room** - Choose General, Random, or Tech
4. **Join Chat** - Start messaging in real-time
5. **Send Messages** - Type and press Send
6. **Logout** - Click Logout to sign out

## Security Features

- Password hashing with Werkzeug
- Input validation (frontend & backend)
- CORS protection
- SessionStorage (clears on tab close)

## Key Features

- Real-time WebSocket communication
- User authentication & session management
- Persistent message storage with SQLite
- Typing indicators with animations
- User avatars with initials
- Comprehensive error handling