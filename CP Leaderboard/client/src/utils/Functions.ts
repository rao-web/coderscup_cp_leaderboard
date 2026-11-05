type TopTeam = {
    teamId: string;
    rank: number;
    teamName: string;
    score: number;
    penalty: number;
    problems: Array<{ status: string; time: string; penalty: string; firstSolve: boolean }>;
};

const formatHMS = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const fetchContestTimes = async (BACKENDURL: string, setStartTime: React.Dispatch<React.SetStateAction<Date | null>>, setEndTime: React.Dispatch<React.SetStateAction<Date | null>>) => {
    try {
        const res = await fetch(`${BACKENDURL}/api/getContestTime`);
        if (!res.ok) throw new Error('Failed to fetch contest times');
        const data = await res.json();
        if (data.startTime && data.endTime) {
            setStartTime(new Date(data.startTime));
            setEndTime(new Date(data.endTime));
        }
    } catch (err) {
        console.error('Error fetching contest times:', err);
    }
};

const fetchTopTeams = async (BACKENDURL: string, setLoadingTop: React.Dispatch<React.SetStateAction<boolean>>, setTopTeams: React.Dispatch<React.SetStateAction<TopTeam[] | null>>) => {
    try {
        setLoadingTop(true);
        const res = await fetch(`${BACKENDURL}/api/getTopTeams/23k`);
        if (!res.ok) throw new Error('Failed to fetch top teams');
        const data: TopTeam[] = await res.json();
        setTopTeams(data);
    } catch (e) {
        console.error('Error fetching top teams:', e);
        setTopTeams(null);
    } finally {
        setLoadingTop(false);
    }
};

export { formatHMS, fetchContestTimes, fetchTopTeams };