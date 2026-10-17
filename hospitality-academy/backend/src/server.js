import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { setupSocket } from './sockets/index.js';
import { corsOrigin } from './config/cors.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true
  }
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Hospitality Academy API running on port ${PORT}`);
});
