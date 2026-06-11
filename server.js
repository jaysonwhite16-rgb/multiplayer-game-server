const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = {};
let itPlayerId = null; // Tracks who is currently "It"

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  players[socket.id] = {
    x: Math.floor(Math.random() * 400) + 50,
    y: Math.floor(Math.random() * 300) + 50,
    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    id: socket.id
  };

  // If nobody is "It" yet, this new player is it!
  if (!itPlayerId) {
    itPlayerId = socket.id;
  }

  // Send player data AND who is "It" to the new player
  socket.emit('currentPlayers', players);
  io.emit('newItPlayer', itPlayerId); 

  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Listen for movement updates
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      socket.broadcast.emit('playerMoved', players[socket.id]);

      // COLLISION DETECTION: If the moving player is "It", check if they hit anyone
      if (socket.id === itPlayerId) {
        for (let id in players) {
          if (id !== socket.id) {
            let p = players[id];
            let it = players[socket.id];

            // Check if the 20x20 pixel squares overlap
            if (it.x < p.x + 20 && it.x + 20 > p.x && it.y < p.y + 20 && it.y + 20 > p.y) {
              itPlayerId = id; // Tag! You're it!
              io.emit('newItPlayer', itPlayerId); // Tell everyone who is IT
              break;
            }
          }
        }
      }
    }
  });

  // Handle player leaving
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    
    // If the "It" player leaves, pick someone else randomly
    if (socket.id === itPlayerId) {
      const remainingIds = Object.keys(players);
      itPlayerId = remainingIds.length > 0 ? remainingIds[0] : null;
      io.emit('newItPlayer', itPlayerId);
    }

    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
