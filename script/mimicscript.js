import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// e.g. http://localhost:4000/api/postRanking
const backendURL =
    process.env.BACKEND_URL || "http://localhost:4000/api/postRanking";
const KEY = process.env.KEY || "dev-key";
// server root, e.g. http://localhost:4000 (used for the contest-time endpoint)
const baseURL = backendURL.replace(/\/api\/postRanking\/?$/, "");

// Multiple batches for this mimic script
// e.g. BATCHES="23k,24k,25k,26k"
const BATCHES = (process.env.BATCHES || "23k,24k,25k,26k")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

// Always "running now" so the mimic works any day: started 1 hour ago, ends in 12 hours
// const CONTEST_START = new Date(Date.now() - 60 * 60 * 1000).toISOString();
// const CONTEST_END = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

const CONTEST_START = new Date(Date.now() - 1 * 60 * 1000).toISOString();  // 1 minute pehle shuru
const CONTEST_END   = new Date(Date.now() + 2 * 60 * 1000).toISOString();  // 2 minute baad khatam

// -------------------- Helpers --------------------
const randInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p) => Math.random() < p;

const pad2 = (n) => String(n).padStart(2, "0");
function secondsToHMS(s) {
    const h = Math.floor(s / 3600);
    s %= 3600;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}
function randomContestTime() {
    return secondsToHMS(randInt(60, 3 * 3600));
}
function randomPenalty() {
    return `(-${randInt(1, 3)})`;
}

// -------------------- House-based team names --------------------
const HOUSES = ["gryffindor", "hufflepuff", "ravenclaw", "slytherin"];

function randomHousePrefix() {
    const idx = randInt(0, HOUSES.length - 1);
    return HOUSES[idx];
}

function randomTeamSuffix(batch) {
    return `team_${batch}_${randInt(100, 999)}`;
}

function generateTeamName(batch) {
    const house = randomHousePrefix();
    const suffix = randomTeamSuffix(batch);
    // Required format: gryffindor_teamname / hufflepuff_teamname / ravenclaw_teamname / slytherin_teamname
    return `${house}_${suffix}`;
}

// -------------------- Initial state --------------------
const PROBLEM_COUNT = 5;

// state[batch] = array of teams for that batch
const state = {};

function createInitialTeams(batch) {
    return [
        {
            rank: "1",
            teamName: generateTeamName(batch),
            score: "",
            penalty: "",
            problems: Array.from({ length: PROBLEM_COUNT }, () => ({
                status: "Not attempted",
                time: "",
                penalty: "",
            })),
        },
        {
            rank: "2",
            teamName: generateTeamName(batch),
            score: "",
            penalty: "",
            problems: Array.from({ length: PROBLEM_COUNT }, () => ({
                status: "Not attempted",
                time: "",
                penalty: "",
            })),
        },
        {
            rank: "3",
            teamName: generateTeamName(batch),
            score: "",
            penalty: "",
            problems: Array.from({ length: PROBLEM_COUNT }, () => ({
                status: "Not attempted",
                time: "",
                penalty: "",
            })),
        },
    ];
}

// initialize state for all batches
BATCHES.forEach((batch) => {
    state[batch] = createInitialTeams(batch);
});

// -------------------- Problem / team mutation logic --------------------
function sanitizeProblem(p) {
    if (p.status === "Not attempted") {
        p.time = "";
        p.penalty = "";
    } else if (p.status === "Accepted") {
        if (!p.time) p.time = randomContestTime();
        p.penalty = "";
    } else if (p.status === "Attempted") {
        p.time = "";
        if (!p.penalty) p.penalty = randomPenalty();
    } else if (p.status === "Failed") {
        p.time = "";
        p.penalty = "";
    }
}

function mutateProblems(problems) {
    const idx = randInt(0, problems.length - 1);
    const p = problems[idx];

    if (p.status === "Accepted") return;

    if (p.status === "Not attempted") {
        if (chance(0.65)) {
            p.status = "Accepted";
            p.time = randomContestTime();
            p.penalty = "";
        } else if (chance(0.25)) {
            p.status = "Attempted";
            p.time = "";
            p.penalty = randomPenalty();
        }
    } else if (p.status === "Attempted") {
        if (chance(0.55)) {
            p.status = "Accepted";
            p.time = randomContestTime();
            p.penalty = "";
        } else {
            if (chance(0.4)) p.penalty = randomPenalty();
            p.time = "";
        }
    } else if (p.status === "Failed") {
        if (chance(0.4)) {
            p.status = "Attempted";
            p.time = "";
            p.penalty = randomPenalty();
        }
    }

    if (chance(0.2)) {
        const j = randInt(0, problems.length - 1);
        if (j !== idx) mutateProblems([problems[j]]);
    }

    sanitizeProblem(p);
}

function recomputeScoresAndRanks(arr) {
    arr.forEach((t) => {
        t.problems.forEach(sanitizeProblem);
        const accepted = t.problems.filter((p) => p.status === "Accepted").length;
        t.score = String(accepted);
    });

    const toSec = (s) => {
        if (!s) return 0;
        const [h, m, ss] = s.split(":").map(Number);
        return (h || 0) * 3600 + (m || 0) * 60 + (ss || 0);
    };

    arr.sort((a, b) => {
        const sa = parseInt(a.score || "0", 10);
        const sb = parseInt(b.score || "0", 10);
        if (sb !== sa) return sb - sa;

        const ta = a.problems
            .filter((p) => p.status === "Accepted" && p.time)
            .map((p) => toSec(p.time))
            .reduce((x, y) => x + y, 0);

        const tb = b.problems
            .filter((p) => p.status === "Accepted" && p.time)
            .map((p) => toSec(p.time))
            .reduce((x, y) => x + y, 0);

        return ta - tb;
    });

    arr.forEach((t, i) => (t.rank = String(i + 1)));
}

function maybeAddTeam(arr, batch) {
    if (chance(0.2)) {
        arr.push({
            rank: String(arr.length + 1),
            teamName: generateTeamName(batch),
            score: "0",
            penalty: "",
            problems: Array.from({ length: PROBLEM_COUNT }, () => ({
                status: chance(0.25) ? "Attempted" : "Not attempted",
                time: "",
                penalty: chance(0.25) ? randomPenalty() : "",
            })),
        });
    }
}

function mutateBatchArray(arr, batch) {
    if (arr.length === 0) {
        arr.push({
            rank: "1",
            teamName: generateTeamName(batch),
            score: "0",
            penalty: "",
            problems: Array.from({ length: PROBLEM_COUNT }, () => ({
                status: "Not attempted",
                time: "",
                penalty: "",
            })),
        });
    }

    maybeAddTeam(arr, batch);

    arr.forEach((team) => {
        if (team.problems.length !== PROBLEM_COUNT) {
            team.problems = Array.from({ length: PROBLEM_COUNT }, (_, i) => {
                return (
                    team.problems[i] || { status: "Not attempted", time: "", penalty: "" }
                );
            });
        }
        const edits = randInt(0, 2);
        for (let i = 0; i < edits; i++) mutateProblems(team.problems);
        team.problems.forEach(sanitizeProblem);
    });

    recomputeScoresAndRanks(arr);
}

// -------------------- Posting to backend --------------------
export const postData = async (data, batch) => {
    try {
        const response = await fetch(backendURL, {
            method: "POST",
            body: JSON.stringify({
                data, // array of rows like in the scraper
                batch,
                meta: {
                    startTime: CONTEST_START,
                    endTime: CONTEST_END,
                },
            }),
            headers: {
                "Content-Type": "application/json",
                key: KEY,
            },
        });

        if (!response.ok) {
            throw new Error(
                `Network response was not ok: ${response.status} ${response.statusText}`
            );
        }

        const json = await response.json();
        console.log(`Data sent successfully (batch: ${batch}):`, json);
    } catch (error) {
        console.error(`Error sending data for batch ${batch}:`, error.message);
    }
};

export const postTime = async (startTime, endTime) => {
    try {
        const response = await fetch(`${baseURL}/api/postContestTime`, {
            method: "POST",
            body: JSON.stringify({ startTime, endTime }),
            headers: {
                "Content-Type": "application/json",
                key: KEY,
            },
        });

        if (!response.ok) {
            console.error("Status:", response.status, response.statusText);
            throw new Error(`Network response was not ok`);
        }

        const json = await response.json();
        console.log(`Contest time posted successfully:`, json);
    } catch (error) {
        console.error("Error posting contest time:", error);
    }
};


export const generateAndSendData = async (batch) => {
    const arr = state[batch];
    mutateBatchArray(arr, batch);
    console.log(`Updated leaderboard state for batch ${batch}:`);
    await postData(arr, batch);
};

postTime(CONTEST_START, CONTEST_END);

// -------------------- Run for all batches --------------------
BATCHES.forEach((batch) => {
    generateAndSendData(batch);
});

// Stop sending once the contest is over (15s after the end so the last update still goes out)
const STOP_AT = new Date(CONTEST_END).getTime() + 15_000;
const mimicTimer = setInterval(() => {
    if (Date.now() > STOP_AT) {
        console.log("Contest over - mimic stopped.");
        clearInterval(mimicTimer);
        return;
    }
    BATCHES.forEach((batch) => generateAndSendData(batch));
}, 10_000);
