const initializeSocket = (server) => {
    const io = require('socket.io')(server, {
      cors: { origin: '*' },
    });
  
    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);
  
      socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined socket room`);
      });
    });
  
    return io;
  };
  
  module.exports = { initializeSocket };