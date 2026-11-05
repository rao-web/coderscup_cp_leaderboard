import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import TableSpinner from "./TableSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { BACKENDURL } from "../../constants"
import { detectHouseFromTeam } from "../utils/houses";

type Row = {
    teamId: string;
    rank: number;
    teamName: string;
    score: number;
    penalty: number;
    problems: Array<{ status: string; time: string; penalty: string; firstSolve: boolean }>;
};

type Payload = {
    batch: string;
    version: number;
    ts: number;
    startTime: string | null;
    endTime: string | null;
    rows: Row[];
};

const classNames = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" ");

// Problem cell colours by status (case-insensitive: the scraper sends "Not attempted")
const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
        case "accepted":
            return "bg-linear-to-b from-emerald-500/30 to-emerald-900/25 border border-emerald-400/50 text-emerald-100";
        case "failed":
            return "bg-linear-to-b from-red-700/45 to-red-950/35 border border-red-400/40 text-red-100";
        case "attempted":
            return "bg-linear-to-b from-sky-600/25 to-sky-950/30 border border-sky-400/40 text-sky-100";
        default: // pending / not attempted
            return "bg-white/[0.03] border border-gold/15 text-parchment-dim";
    }
};

const getRankAura = (rank: number) => {
    if (rank === 1) return { row: "from-gold/25 via-gold/5 to-transparent", badge: "bg-linear-to-br from-gold-bright to-gold text-ink-950" };
    if (rank === 2) return { row: "from-slate-300/15 via-slate-300/5 to-transparent", badge: "bg-linear-to-br from-slate-100 to-slate-400 text-ink-950" };
    if (rank === 3) return { row: "from-amber-700/25 via-amber-700/5 to-transparent", badge: "bg-linear-to-br from-amber-500 to-amber-800 text-ink-950" };
    return { row: "from-white/[0.04] to-transparent", badge: "" };
};

type ScoreboardProps = {
    room: string;
    onDataUpdate?: (payload: Payload) => void;
    isSoundOpen: boolean;
    page: string;
};

const TH = "sticky top-0 z-20 bg-linear-to-b from-umber-800 to-umber-900 border-b border-gold/50 px-2 py-3 text-center font-display text-lg tracking-widest text-gold sm:px-3 sm:text-xl";

const ScoreBoard = ({ room, onDataUpdate, isSoundOpen, page }: ScoreboardProps) => {
    const [rows, setRows] = useState<Row[] | ''>('');
    const [fields, setFields] = useState<string[]>(["Rank", "Team", "Score"]);

    const prevRowsRef = useRef<Map<string, Row>>(new Map());
    const blinkUntilRef = useRef<Map<string, number>>(new Map());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio("audio/clock-chime.mp3");
        audioRef.current.preload = "auto";
    }, []);

    const playChime = useCallback(() => {
        if (!isSoundOpen || !audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
    }, [isSoundOpen]);

    useEffect(() => {
        const socket = io(BACKENDURL);
        socket.emit("joinRoom", room);

        const onUpdate = (payload: Payload) => {
            if (payload.batch !== room) return;

            const prevMap = prevRowsRef.current;
            const nextMap = new Map(payload.rows.map(r => [r.teamId, r]));
            const now = Date.now();
            const blinkForMs = 4000;

            let anyChime = false;
            payload.rows.forEach(r => {
                const prev = prevMap.get(r.teamId);
                if (!prev) return;
                if (prev.rank !== r.rank) {
                    blinkUntilRef.current.set(r.teamId, now + blinkForMs);
                    if (prev.rank > r.rank && r.rank <= 3) anyChime = true; // moved into the top 3
                }
                if (prev.score < r.score) {
                    blinkUntilRef.current.set(r.teamId, now + blinkForMs);
                }
            });

            if (anyChime && audioRef.current) playChime();

            prevRowsRef.current = nextMap;
            setRows(payload.rows.slice().sort((a, b) => a.rank - b.rank));
        }

        socket.on("sendData", (payload: Payload) => {
            try {
                if (payload && payload.rows && payload.rows.length > 0 && payload.rows[0].problems) {
                    const newFields = ["Rank", "Team", "Score", "Penalty"];
                    for (let i = 0; i < payload.rows[0].problems.length; i++) {
                        newFields.push(String.fromCharCode(65 + i));
                    }
                    setFields(newFields);
                }
                onUpdate(payload);
                if (onDataUpdate) onDataUpdate(payload);
            } catch (error) {
                console.error("Error parsing data:", error);
            }
        });

        return () => {
            socket.off("sendData");
            socket.disconnect();
        };
    }, [room, onDataUpdate, playChime, page]);

    const now = Date.now();

    if (rows === '') return <TableSpinner />;

    if (rows.length === 0) {
        return (
            <div className="flex w-full max-w-3xl items-center justify-center rounded-sm border border-gold/30 bg-ink-900/80 px-8 py-20 backdrop-blur-sm">
                <h2 className="text-center font-display text-2xl text-parchment sm:text-3xl">Waiting for the first team to score</h2>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[94vw] overflow-hidden rounded-sm border border-gold/50 bg-ink-900/90 panel backdrop-blur-sm">
            <div className="no-scrollbar max-h-[54vh] overflow-auto">
                <table className="mx-auto min-w-max border-separate border-spacing-y-1">
                    <thead className="sticky top-0 z-30">
                        <tr>
                            {fields.map((element, index) => (
                                <th key={index} className={TH}>{element}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody aria-live="polite">
                        <AnimatePresence initial={false}>
                            {rows.map((row: Row) => {
                                if (row.teamId === "N/A") return null;
                                const blink = (blinkUntilRef.current.get(row.teamId) ?? 0) > now;
                                const aura = getRankAura(row.rank);
                                const house = detectHouseFromTeam(row.teamName);
                                return (
                                    <motion.tr
                                        key={row.teamId}
                                        layout
                                        initial={{ opacity: 0.5, y: 16 }}
                                        animate={{ opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } }}
                                        exit={{ opacity: 0, y: -16, transition: { duration: 1, ease: "easeIn" } }}
                                        transition={{ type: "spring", stiffness: 1500, damping: 40, mass: 1.4 }}
                                        className={classNames(
                                            "bg-linear-to-r",
                                            aura.row,
                                            blink && "animate-blink ring-2 ring-gold-bright/60",
                                            row.rank === 1 && "row-gold",
                                        )}
                                    >
                                        <td
                                            className="w-14 px-2 py-2 text-center sm:px-3"
                                            style={house ? { boxShadow: `inset 5px 0 0 ${house.primary}` } : undefined}
                                        >
                                            {row.rank ? (
                                                <span className={classNames("inline-grid h-8 w-8 place-items-center rounded-full font-display text-lg", aura.badge)}>
                                                    {row.rank}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-parchment-dim">–</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-lg italic text-parchment sm:px-4">
                                            {row.teamName}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-center text-xl font-semibold text-parchment sm:px-4">
                                            {row.score}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-center text-lg text-parchment-dim sm:px-4">
                                            {row.penalty}
                                        </td>
                                        {row.problems.map((problem: Row["problems"][number], jdx: number) => (
                                            <td
                                                key={jdx}
                                                className={classNames(
                                                    "min-w-22 whitespace-nowrap px-2 py-2 text-center text-xs font-semibold uppercase tracking-widest sm:px-2.5",
                                                    getStatusClasses(problem.status)
                                                )}
                                            >
                                                <span className="block text-[0.6rem] opacity-80 sm:text-[0.65rem]">
                                                    {problem.status}
                                                    {problem.firstSolve && <span aria-label="first solve"> ★</span>}
                                                </span>
                                                <span className="block text-base sm:text-lg">
                                                    {problem.status === "Accepted" ? problem.time : ""}
                                                </span>
                                                <span className="block text-[0.6rem] opacity-70 sm:text-[0.65rem]">
                                                    {problem.penalty || ""}
                                                </span>
                                            </td>
                                        ))}
                                    </motion.tr>
                                )
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScoreBoard;
