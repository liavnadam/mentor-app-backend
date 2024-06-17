// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const CodeBlock = require('./models/CodeBlock');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions'
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',  // Ensure cookies are only transmitted over HTTPS
      maxAge: 1000 * 60 * 60 * 24 // 24 hours in milliseconds
    }
  }));

// Connect to MongoDB using environment variables
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
  

app.use(cors());
let roleAssignments = {};

app.use(express.json());

// Define routes
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
  
  
  app.get('/codeblocks/:id', async (req, res) => {
    try {
      const codeblock = await CodeBlock.findById(req.params.id);
      if (!codeblock) return res.status(404).send("Code block not found");
      res.json(codeblock);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.get('/codeblocks/:id/role', (req, res) => {
    console.log(`Session ID: ${req.sessionID}`);
    console.log(`Session store: ${JSON.stringify(req.session)}`);
  
    const { id } = req.params;
    if (!req.session.roles) req.session.roles = {};
    if (!req.session.roles[id]) {
        req.session.roles[id] = 'mentor';
        console.log(`First user, set as mentor: ${id}`);
        res.json({ role: 'mentor' });
    } else {
        console.log(`Subsequent user, set as student: ${id}`);
        res.json({ role: 'student' });
    }
  });
  

  
  // Setup socket.io
  io.on('connection', (socket) => {
    console.log('New client connected');
  
    socket.on('codeChange', (data) => {
      socket.broadcast.emit('codeUpdate', data);
    });
  
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
  
  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
