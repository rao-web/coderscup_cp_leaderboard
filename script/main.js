import dotenv from "dotenv";
import puppeteer from "puppeteer";
import UserAgent from "user-agents";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const KEY = process.env.KEY;

// ------------------------------------ SUBJECTIVE DATA ------------------------------------
// TODO: replace YOUR_CONTEST_ID with the real VJudge contest id of each batch
const leaderBoardURLs = [
    { batch: "23k", url: "https://vjudge.net/contest/YOUR_CONTEST_ID#rank" },
    { batch: "24k", url: "https://vjudge.net/contest/YOUR_CONTEST_ID#rank" },
    { batch: "25k", url: "https://vjudge.net/contest/YOUR_CONTEST_ID#rank" },
    { batch: "26k", url: "https://vjudge.net/contest/YOUR_CONTEST_ID#rank" }
];

// const BACKENDURL = "https://coderscup-scoreboard-backend.onrender.com";
const BACKENDURL = "http://localhost:4000";

const CONTEST_START = "2025-11-20T11:30:00+05:00";
const CONTEST_END = "2026-07-19T01:00:00+05:00";
// ------------------------------------ SUBJECTIVE DATA ------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIEWPORT = { width: 1920, height: 1080 };
const RANK_TABLE_SELECTOR = "#contest-rank-table";

const launchBrowser = async () => {
    try {
        return await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            defaultViewport: VIEWPORT,
        });
    } catch (error) {
        console.error("Error launching Puppeteer:", error);
        throw error;
    }
};

const newConfiguredPage = async (browser) => {
    const page = await browser.newPage();
    await page.setUserAgent(new UserAgent().toString());
    return page;
};

const waitForRankTable = async (page) => {
    try {
        await page.waitForSelector(RANK_TABLE_SELECTOR, { timeout: 30000 });
    } catch (e) {
        throw e;
    }
};

const extractLeaderboard = async (page) => {
    return page.evaluate(() => {
        const rows = document.querySelectorAll("#contest-rank-table tbody tr");
        const result = [];

        rows.forEach((row) => {
            const rank = row.querySelector("td.rank")?.innerText.trim() || "N/A";
            const teamName = row.querySelector("td.team a")?.innerText.trim() || "N/A";
            const score = row.querySelector("td.solved span")?.innerText.trim() || "N/A";
            const penalty = row.querySelector("td.penalty span.minute")?.innerText.trim() || "N/A";
            const problems = [];

            const problemCells = row.querySelectorAll("td.prob");
            problemCells.forEach((cell) => {
                const accepted = cell.classList.contains("accepted");
                const failed = cell.classList.contains("failed");
                const firstSolve = cell.classList.contains("fb");

                let problemStatus = "Not attempted";
                let time = "";

                if (accepted) {
                    problemStatus = "Accepted";
                    time = cell.innerText.split("<br>")[0].trim().split("\n")[0].trim();
                } else if (failed) {
                    problemStatus = "Failed";
                }

                let penalty = "";
                const spanElement = cell.querySelector("span");
                if (spanElement) {
                    penalty = spanElement.innerText.trim();
                }

                problems.push({ status: problemStatus, time, penalty, firstSolve });
            });

            result.push({ rank, teamName, score, penalty, problems });
        });
        // return result;
        return result;
    });
};

export const getData = async (URL) => {
    let browser = null;
    try {
        browser = await launchBrowser();
        const page = await newConfiguredPage(browser);
        await page.goto(URL, { waitUntil: "networkidle0" });

        try {
            await waitForRankTable(page);
        } catch (e) {
            console.error("Table not found:", e);
            await page.screenshot({ path: path.join(__dirname, "error_screenshot.png") });
            // console.log(await page.content());
            return { error: "Table not found" };
        }

        const data = await extractLeaderboard(page);
        return data;
    } catch (err) {
        console.error("Unexpected scraping error:", err);
        return { error: "Unexpected scraping error" };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch { }
        }
    }
};

export const postData = async (data, batch) => {
    try {
        const response = await fetch(`${BACKENDURL}/api/postRanking`, {
            method: "POST",
            body: JSON.stringify({
                data: data.rows,
                batch
            }),
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
        console.log(`Data sent successfully (batch: ${batch}):`, json);
    } catch (error) {
        console.error("Error sending data:", error);
    }
};

export const scrapeAndSendData = async (batch, leaderboardURL) => {
    console.log(`Data being scraped for ${batch}...`);

    const data = await getData(leaderboardURL);

    // If scraping failed or returned error object
    if (!Array.isArray(data)) {
        console.error("No valid array data scraped:", data, "of batch", batch);
        return;
    }

    // Now it's safe to use .filter
    const updatedData = data.filter(item => item.rank !== "--");

    if (updatedData.length === 0) {
        console.warn(`No valid rows after filtering for batch ${batch}`);
        return;
    }

    console.log("posting data to backend...");
    await postData(
        {
            rows: updatedData,
        },
        batch
    );
};

export const postTime = async (startTime, endTime) => {
    try {
        const response = await fetch(`${BACKENDURL}/api/postContestTime`, {
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

// Function to clear data buffer for a specific batch
export const clearBatchData = async (batch) => {
    try {
        console.log(`Clearing data buffer for batch: ${batch}...`);

        await postData(
            {
                rows: []
            },
            batch
        );

        console.log(`Data buffer cleared for batch: ${batch}`);
    } catch (error) {
        console.error(`Error clearing data buffer for batch ${batch}:`, error);
    }
};

const clearAllBatches = async () => {
    console.log("clearing buffer");
    for (const { batch } of leaderBoardURLs) {
        await clearBatchData(batch);
    }
};

// Initial setup: clear all batches
// await clearAllBatches();

// post contest time once at the start
postTime(CONTEST_START, CONTEST_END);

// Set intervals for scraping and sending data
leaderBoardURLs.forEach(({ batch, url }) => {
    // first run immediately
    scrapeAndSendData(batch, url);
    // run every 30s
    const timer = setInterval(() => {
        // stop 90s after the contest ends (one last scrape goes out first)
        if (Date.now() > new Date(CONTEST_END).getTime() + 90_000) {
            console.log(`Contest over - stopped scraping batch ${batch}.`);
            clearInterval(timer);
            return;
        }
        scrapeAndSendData(batch, url);
    }, 30000);
});