import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIO } from "socket.io";
import rankingRoutes from './routes/ranking.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://coderscup-scoreboard-2025.vercel.app',
    'https://coderscup-scoreboard-2025-raahims-projects-f828742c.vercel.app',
    'https://scoreboard.acmnuceskhi.com',
  ],
  credentials: true
}));

const io = new SocketIO(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://coderscup-scoreboard-2025.vercel.app',
      'https://coderscup-scoreboard-2025-raahims-projects-f828742c.vercel.app',
      'https://scoreboard.acmnuceskhi.com',
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ msg: "Coders cup scoreboard" });
});

app.use('/api', rankingRoutes(io));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log('Connected and listening to requests on', PORT);
});