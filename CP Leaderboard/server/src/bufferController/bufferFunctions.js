// Team names on VJudge must contain one of these prefixes, e.g. "gryffindor_teamname"
function getHouse(teamName) {
    const name = teamName.toLowerCase();

    if (name.includes("gryffindor_")) return "Gryffindor";
    if (name.includes("hufflepuff_")) return "Hufflepuff";
    if (name.includes("ravenclaw_")) return "Ravenclaw";
    if (name.includes("slytherin_")) return "Slytherin";
    return "";
}

const updateBuffer = (data, batch, score) => {
    let tempScore = {
        'Gryffindor': 0,
        'Hufflepuff': 0,
        'Ravenclaw': 0,
        'Slytherin': 0
    };

    for (let team of data) {
        // console.log(getHouse(team.teamName));
        const house = getHouse(team.teamName);
        // const house = teamHouses[batch][team.teamName];
        if (house) {
            tempScore[house] += Number(team.score);

            for (let problem of team.problems) {
                if (problem.firstSolve && problem.status === "Accepted") {
                    tempScore[house] += 1; // first solve bonus
                }
            }

        }
    }
    for (let key in tempScore) {
        score[key][batch] = tempScore[key];
    }
    return { data, score };
};

export default updateBuffer;