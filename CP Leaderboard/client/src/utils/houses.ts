// Single source of truth for the four houses.
// To rename a house or change colours, edit it here (and the matching
// keys/prefixes in server/src/routes/ranking.js + bufferController).

export type HouseInfo = {
    key: string;      // must match the key the server sends in the "Houses" room
    name: string;     // display name
    prefix: string;   // team names must contain this to score for the house
    trait: string;
    primary: string;  // main stripe colour
    secondary: string;// second stripe colour
    accent: string;   // text / rule colour on dark panels
};

const HOUSE_LIST: HouseInfo[] = [
    { key: "Gryffindor", name: "Gryffindor", prefix: "gryffindor_", trait: "Valour", primary: "#c8302b", secondary: "#7d1b19", accent: "#ef5a4f" },
    { key: "Hufflepuff", name: "Hufflepuff", prefix: "hufflepuff_", trait: "Loyalty", primary: "#f5b800", secondary: "#2b2210", accent: "#f7c62e" },
    { key: "Ravenclaw", name: "Ravenclaw", prefix: "ravenclaw_", trait: "Wit", primary: "#2c82d6", secondary: "#123f70", accent: "#5aa5ee" },
    { key: "Slytherin", name: "Slytherin", prefix: "slytherin_", trait: "Ambition", primary: "#1f9a55", secondary: "#0b4a29", accent: "#3fc07a" },
];

const normalize = (s: string) => s.replace(/^house\s+/i, "").replace(/\s+/g, "").toLowerCase();

const getHouseInfo = (key: string): HouseInfo | undefined =>
    HOUSE_LIST.find((h) => normalize(h.key) === normalize(key));

// Find a team's house from its VJudge team name, e.g. "gryffindor_team1"
const detectHouseFromTeam = (teamName: string): HouseInfo | null => {
    const s = teamName.toLowerCase();
    return HOUSE_LIST.find((h) => s.includes(h.prefix)) ?? null;
};

export { HOUSE_LIST, getHouseInfo, detectHouseFromTeam };
