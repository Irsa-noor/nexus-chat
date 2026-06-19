from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from datetime import datetime
from models import db, User, Message

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'

# Initialize extensions
db.init_app(app)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active users by session
active_users = {}
typing_users = {}

# Create tables
with app.app_context():
    db.create_all()

# ===== AUTHENTICATION ROUTES =====

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    # Validate input
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validation checks
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if len(username) > 20:
        return jsonify({'error': 'Username must be less than 20 characters'}), 400
    
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    if len(password) > 100:
        return jsonify({'error': 'Password must be less than 100 characters'}), 400
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    try:
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Account created successfully',
            'user': user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        print(f'Signup error: {e}')
        return jsonify({'error': 'Error creating account. Please try again'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        print(f'Login error: {e}')
        return jsonify({'error': 'Error logging in. Please try again'}), 500 

# ===== WEBSOCKET EVENTS =====

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connection_response', {'data': 'Connected to server'})

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    user_id = data.get('user_id')
    
    # Store active user
    active_users[request.sid] = {
        'username': username,
        'room': room,
        'user_id': user_id
    }
    
    if room not in typing_users:
        typing_users[room] = []
    
    join_room(room)
    
    # Emit join message
    emit('message', {
        'username': 'System',
        'message': f'{username} joined the chat',
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'user_id': 'system'
    }, room=room)
    
    # Send list of online users
    room_users = [u for u in active_users.values() if u['room'] == room]
    emit('user_joined', {'users': room_users}, room=room)
    
    # Load recent messages from database
    recent_messages = Message.query.filter_by(room=room).order_by(Message.created_at.desc()).limit(50).all()
    recent_messages.reverse()
    
    for msg in recent_messages:
        emit('message', {
            'username': msg.author.username,
            'message': msg.content,
            'timestamp': msg.created_at.strftime('%H:%M:%S'),
            'user_id': msg.user_id
        })

@socketio.on('send_message')
def handle_message(data):
    session_id = request.sid
    
    if session_id not in active_users:
        return
    
    user_info = active_users[session_id]
    room = user_info['room']
    message_text = data['message']
    user_id = user_info['user_id']
    
    # Save to database
    try:
        message = Message(
            content=message_text,
            room=room,
            user_id=user_id
        )
        db.session.add(message)
        db.session.commit()
        
        # Broadcast message
        emit('message', {
            'username': user_info['username'],
            'message': message_text,
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'user_id': user_id
        }, room=room)
        
        # Clear typing indicator
        if room in typing_users and user_info['username'] in typing_users[room]:
            typing_users[room].remove(user_info['username'])
            emit('user_typing', {'users': typing_users[room]}, room=room)
    
    except Exception as e:
        print(f'Error saving message: {e}')
        emit('error', {'message': 'Failed to send message'})

@socketio.on('typing')
def handle_typing():
    session_id = request.sid
    
    if session_id not in active_users:
        return
    
    user_info = active_users[session_id]
    room = user_info['room']
    username = user_info['username']
    
    if room not in typing_users:
        typing_users[room] = []
    
    if username not in typing_users[room]:
        typing_users[room].append(username)
    
    emit('user_typing', {'users': typing_users[room]}, room=room)

@socketio.on('stop_typing')
def handle_stop_typing():
    session_id = request.sid
    
    if session_id not in active_users:
        return
    
    user_info = active_users[session_id]
    room = user_info['room']
    username = user_info['username']
    
    if room in typing_users and username in typing_users[room]:
        typing_users[room].remove(username)
        emit('user_typing', {'users': typing_users[room]}, room=room)

@socketio.on('disconnect')
def handle_disconnect():
    session_id = request.sid
    
    if session_id in active_users:
        user_info = active_users.pop(session_id)
        room = user_info['room']
        username = user_info['username']
        
        # Remove from typing list
        if room in typing_users and username in typing_users[room]:
            typing_users[room].remove(username)
        
        # Emit leave message
        emit('message', {
            'username': 'System',
            'message': f'{username} left the chat',
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'user_id': 'system'
        }, room=room)
        
        # Send updated user list
        room_users = [u for u in active_users.values() if u['room'] == room]
        emit('user_left', {'users': room_users}, room=room)
        
        leave_room(room)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='localhost', port=5000)  