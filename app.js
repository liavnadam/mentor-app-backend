const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const CodeBlock = require('./models/CodeBlock');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Use cookie-parser to parse cookies
app.use(cookieParser());

// Use session with MongoStore
app.use(session({
  secret: 'your secret key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    stringify: false,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

app.use(cors({
  origin: ['http://localhost:3000', 'https://mentor-student-app.netlify.app'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Validate ObjectId middleware
function validateObjectId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send('Invalid ID');
  }
  next();
}

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Coding Mentorship App Backend!');
});

app.get('/codeblocks', async (req, res) => {
  try {
    const codeblocks = await CodeBlock.find({});
    res.json(codeblocks);
  } catch (error) {
    console.error("Error fetching code blocks:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/codeblocks/:id', validateObjectId, async (req, res) => {
  try {
    const codeblock = await CodeBlock.findById(req.params.id);
    if (!codeblock) return res.status(404).send("Code block not found");
    res.json(codeblock);
  } catch (error) {
    res.status(500).send(error);
  }
});


app.get('/codeblocks/:id/role', validateObjectId, (req, res) => {
  const { id } = req.params;
  const { role } = req.query;

  if (!req.session.roles) {
    req.session.roles = {};
  }

  if (role) {
    req.session.roles[id] = role;
  } else if (!req.session.roles[id]) {
    req.session.roles[id] = 'mentor';
  }

  req.session.save(err => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).send('Error saving session');
    }
    res.json({ role: req.session.roles[id] });
  });
});





// Socket.io setup
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('codeChange', (data) => {
    console.log(`Code change received: ${data.code}`);
    socket.broadcast.emit('codeUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
