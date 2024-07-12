const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let waitingUsers = [];
let pairs = {};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.post('/join', (req, res) => {
  const userId = req.body.userId;

  if (waitingUsers.length > 0) {
    const pairId = waitingUsers.pop();
    if (pairId !== userId) {
      pairs[userId] = pairId;
      pairs[pairId] = userId;
      res.json({ paired: true, partnerId: pairId });
      io.to(userId).emit('paired', { partnerId: pairId });
      io.to(pairId).emit('paired', { partnerId: userId });
    } else {
      waitingUsers.push(userId); // Re-add user to the queue if they are the same
      res.json({ paired: false });
    }
  } else {
    waitingUsers.push(userId);
    res.json({ paired: false });
  }
});

app.get('/status/:userId', (req, res) => {
  const userId = req.params.userId;
  const partnerId = pairs[userId];

  if (partnerId) {
    res.json({ paired: true, partnerId });
  } else {
    res.json({ paired: false });
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on('sendMessage', ({ senderId, receiverId, message }) => {
    io.to(receiverId).emit('receiveMessage', { senderId, message });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
