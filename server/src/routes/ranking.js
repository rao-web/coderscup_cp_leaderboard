import express from 'express';
import Authenticate from '../middleware/auth.js';
import updateBuffer from '../bufferController/bufferFunctions.js';

export default function rankingRoutes(io) {
    const router = express.Router();

    let score = {
        'Gryffindor': { '23k': 0, '24k': 0, '25k': 0, '26k': 0 },
        'Hufflepuff': { '23k': 0, '24k': 0, '25k': 0, '26k': 0 },
        'Ravenclaw': { '23k': 0, '24k': 0, '25k': 0, '26k': 0 },
        'Slytherin': { '23k': 0, '24k': 0, '25k': 0, '26k': 0 }
    };

    const buffer = {
        'Houses': score,
        '23k': [],
        '24k': [],
        '25k': [],
        '26k': [],
    };

    let contestTimes = {
        startTime: null,
        endTime: null
    };

    let versions = new Map(); // batch -> version
    let lastSnapshot = new Map(); // batch -> rows

    io.on("connection", (socket) => {
        console.log("A user connected");

        socket.on("joinRoom", (room) => {
            if (["23k", "24k", "25k", "26k", "Houses"].includes(room)) {
                socket.join(room);
                console.log(`User joined ${room}`);
                if (buffer[room]) {
                    socket.emit("sendData", buffer[room]);
                }
            } else {
                console.log("Invalid room");
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    router.post('/postRanking', Authenticate, async (req, res) => {
        const { data, batch } = req.body;

        // console.log(data);

        if (!Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid data: expected array" });
        }
        if (!batch || !["23k", "24k", "25k", "26k"].includes(batch)) {
            return res.status(400).json({ error: "Invalid batch" });
        }

        // After the contest ends (plus a short grace period for the final scrape) the standings are frozen
        const graceMs = (Number(process.env.FINAL_GRACE_SECONDS) || 90) * 1000;
        const endMs = contestTimes.endTime ? new Date(contestTimes.endTime).getTime() : NaN;
        if (!Number.isNaN(endMs) && Date.now() > endMs + graceMs) {
            return res.status(200).json({ message: "Contest ended: update ignored", ignored: true });
        }

        const version = (versions.get(batch) ?? 0) + 1;
        versions.set(batch, version);

        const rows = data.map(row => ({
            teamId: row.teamName,
            rank: Number(row.rank),
            teamName: row.teamName,
            score: Number(row.score),
            penalty: Number(row.penalty),
            problems: row.problems
        }));

        lastSnapshot.set(batch, rows);

        const updatedData = updateBuffer(rows, batch, buffer['Houses']);

        const payload = {
            batch,
            version,
            ts: Date.now(),
            rows: updatedData.data
        };

        buffer[batch] = payload;
        buffer['Houses'] = updatedData.score;

        console.log(`Buffer updated for batch ${batch}...`);

        io.to(batch).emit("sendData", payload);

        if (buffer['Houses'])
            io.to('Houses').emit("sendData", buffer['Houses']);

        return res.status(200).json({ message: "Buffer updated" });
    });

    router.get('/getRanking', (req, res) => {
        if (buffer) {
            return res.status(200).json(buffer);
        }
        return res.status(404).json({ error: "No buffer data found" });
    });

    router.get('/getHouseRanking', (req, res) => {
        if (buffer['Houses']) {
            return res.status(200).json(buffer['Houses']);
        }
        return res.status(404).json({ error: "No house ranking data found" });
    });

    router.post('/postContestTime', Authenticate, (req, res) => {
        const { startTime, endTime } = req.body;
        contestTimes.startTime = startTime;
        contestTimes.endTime = endTime;
        return res.status(200).json({ message: "Contest time updated" });
    });

    router.get('/getContestTime', (req, res) => {
        return res.status(200).json(contestTimes);
    });

    router.get('/getTopTeams/:batch', (req, res) => {
        const { batch } = req.params;

        if (!batch || !["23k", "24k", "25k", "26k"].includes(batch)) {
            return res.status(400).json({ error: "Invalid batch" });
        }

        const batchData = buffer[batch];

        if (!batchData || !Array.isArray(batchData.rows)) {
            return res.status(404).json({ error: "No data available for this batch yet" });
        }

        const sorted = [...batchData.rows].sort((a, b) => a.rank - b.rank);

        if (sorted.length < 3) {
            return res.status(400).json({
                error: "Not enough teams yet",
                message: `Only ${sorted.length} team(s) available for batch ${batch}`,
            });
        }

        const top3 = sorted.slice(0, 3);
        // console.log(`Top 3 teams for ${batch}:`, top3);
        return res.status(200).json(top3);
    });


    return router;
};
