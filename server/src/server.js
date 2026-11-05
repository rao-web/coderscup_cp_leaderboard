
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import rankingRoutes from './routes/ranking.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://coderscup-scoreboard-2025.vercel.app',
  'https://coderscup-scoreboard-2025-raahims-projects-f828742c.vercel.app',
  'https://scoreboard.acmnuceskhi.com',
  'https://coderscupcpleaderboard.vercel.app'
];

// CORS configuration for Express API
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Socket.IO configuration
const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Backend test route
app.get('/', (req, res) => {
  res.json({
    msg: 'Coders cup scoreboard',
    status: 'Backend is running'
  });
});

// Ranking API routes
app.use('/api', rankingRoutes(io));

// Start server
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log('Connected and listening to requests on', PORT);
});
