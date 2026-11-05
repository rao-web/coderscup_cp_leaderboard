import { HOUSE_LIST } from "./houses";

const HOUSES = HOUSE_LIST.map((h) => `House ${h.name}`);

// Ticker lines used when only podium data is available
const NEWS_TEMPLATES: Array<(house: string, team: string) => string> = [
    (h, t) => `${h} sends an owl: Team ${t} is climbing the ranks`,
    (h, t) => `${h} takes note of Team ${t} after a swift solve`,
    (h, t) => `${h} is watching Team ${t} closely`,
    (h, t) => `${h} cheers as Team ${t} lands a clean submission`,
    (h, t) => `${h} whispers that Team ${t} is calm under pressure`,
    (h, t) => `${h} admires how Team ${t} turned a wrong answer into an accepted one`,
    (h, t) => `${h} says Team ${t} is writing the cleverest code in the castle`,
    (h, t) => `${h} would like Team ${t} on their side of the Great Hall`,
    (h, t) => `${h} marks Team ${t} as one to beat`,
    (h, t) => `${h} is amazed: Team ${t} solved that in record time`,
    (h, t) => `${h} reports a flawless solve from Team ${t}`,
    (h, t) => `${h} thinks Team ${t} has found the secret passage to full marks`,
];

export { HOUSES, NEWS_TEMPLATES };
