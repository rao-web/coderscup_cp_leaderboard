import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import { BACKENDURL } from "../../constants";
import { detectHouseFromTeam, getHouseInfo } from "../utils/houses";
import HouseBanner from "./HouseBanner";
import Fireworks from "./Fireworks";
import CountUp from "./CountUp";

type Row = { teamId: string; rank: number; teamName: string; score: number };
type HouseRow = { house: string; total: number };

const BATCHES = ["23k", "24k", "25k", "26k"];
const GOLDS = ["#fff3c4", "#f0d48a", "#d4ad5a", "#ffd76a"];
const PODIUM = [
    { i: 1, h: "h-44", delay: 1.2, label: "2nd", bg: "from-slate-100 to-slate-500" },
    { i: 0, h: "h-60", delay: 2.8, label: "1st", bg: "from-gold-bright to-gold-deep" },
    { i: 2, h: "h-32", delay: 0.2, label: "3rd", bg: "from-amber-500 to-amber-900" },
];

const Ceremony = ({ houseRows, isSoundOpen, onClose }: { houseRows: HouseRow[]; isSoundOpen: boolean; onClose: () => void }) => {
    const [step, setStep] = useState(0); // 0 intro, 1 houses, 2..5 batches
    const [revealed, setRevealed] = useState(0);
    const [data, setData] = useState<Record<string, Row[]>>({});
    const soundRef = useRef(isSoundOpen);
    soundRef.current = isSoundOpen;

    useEffect(() => {
        const socket = io(BACKENDURL);
        BATCHES.forEach((b) => socket.emit("joinRoom", b));
        socket.on("sendData", (p: { batch?: string; rows?: Row[] }) => {
            if (p?.batch && p.rows) setData((d) => ({ ...d, [p.batch!]: p.rows! }));
        });
        return () => { socket.off("sendData"); socket.disconnect(); };
    }, []);

    // houses are revealed from last place up to the champion
    useEffect(() => {
        if (step !== 1) return;
        setRevealed(0);
        const ids = [800, 3000, 5200, 7800].map((d, n) => window.setTimeout(() => {
            setRevealed(n + 1);
            if (n === 3 && soundRef.current) new Audio("audio/silver-chime.mp3").play().catch(() => { });
        }, d));
        return () => ids.forEach(clearTimeout);
    }, [step]);

    const houses = useMemo(() => houseRows.slice(0, 4), [houseRows]);
    const champion = houses[0] ? getHouseInfo(houses[0].house) : undefined;
    const batch = step >= 2 ? BATCHES[step - 2] : null;
    const top = useMemo(() => (batch ? (data[batch] ?? []).filter((r) => r.teamId !== "N/A").sort((a, b) => a.rank - b.rank).slice(0, 3) : []), [batch, data]);
    const last = step === BATCHES.length + 1;
    const btn = "cursor-pointer rounded-full border border-gold-bright bg-gold-deep px-7 py-2.5 font-display text-lg text-parchment transition-colors hover:bg-gold hover:text-ink-950";

    return (
        <motion.div className="fixed inset-0 z-[65] overflow-hidden bg-ink-950/92 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
            <Fireworks colors={champion ? [champion.primary, champion.accent, ...GOLDS] : GOLDS} active={(step === 1 && revealed >= 4) || (batch !== null && top.length > 0)} />
            <button onClick={onClose} className="absolute right-4 top-4 z-10 cursor-pointer font-display text-parchment-dim hover:text-gold-bright">Skip ✕</button>

            {/* Steps swap with an enter-only animation. (A nested AnimatePresence "wait" could hang after the
                house reveal and leave the ceremony stuck, so Skip / View final standings never took effect.) */}
            <motion.div key={step} className="relative flex h-full flex-col items-center justify-center px-4 pb-20 pt-10 text-center"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                    {step === 0 && (
                        <>
                            <p className="font-display text-xl tracking-[0.4em] text-gold">The trial is over</p>
                            <h1 className="title-shimmer mt-2 font-display text-5xl sm:text-8xl">The Final Standings</h1>
                            <p className="mx-auto mt-6 max-w-md text-2xl italic text-parchment-dim">The scores are sealed in the ledger, and the House Cup awaits its champion.</p>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <p className="font-display text-xl tracking-[0.4em] text-gold">The House Cup</p>
                            {houses.length === 0 && <p className="mt-10 text-2xl italic text-parchment-dim">No scores were recorded</p>}
                            <div className={`mt-6 flex w-full max-w-5xl flex-col items-center gap-5 ${houses.length === 0 ? "hidden" : ""}`}>
                                <motion.div className="flex min-h-72 w-72 flex-col items-center justify-center rounded-sm border-2 px-4 py-4"
                                    style={{ borderColor: revealed >= 4 && champion ? champion.primary : "#7a4a00", background: "rgba(21,10,7,.9)", boxShadow: revealed >= 4 && champion ? `0 0 90px ${champion.primary}` : "none" }}
                                    animate={revealed >= 4 ? { scale: [0.6, 1.15, 1] } : { scale: 1 }} transition={{ type: "tween", duration: 0.9, times: [0, 0.6, 1], ease: "easeOut" }}>
                                    {revealed >= 4 && champion ? (
                                        <>
                                            <HouseBanner house={champion} />
                                            <p className="mt-2 font-display text-lg tracking-widest text-gold-bright">♛ House Cup Champions ♛</p>
                                            <h2 className="font-display text-5xl" style={{ color: champion.accent, textShadow: `0 0 30px ${champion.primary}` }}>{champion.name}</h2>
                                            <p className="font-display text-3xl text-gold-bright"><CountUp value={houses[0].total} /> pts</p>
                                        </>
                                    ) : <span className="font-display text-8xl text-gold/60">?</span>}
                                </motion.div>
                                <div className="flex w-full flex-wrap justify-center gap-4">
                                    {[1, 2, 3].map((idx) => {
                                        const row = houses[idx], info = row ? getHouseInfo(row.house) : undefined;
                                        const shown = revealed >= 4 - idx + 0 && revealed >= (idx === 3 ? 1 : idx === 2 ? 2 : 3);
                                        return (
                                            <motion.div key={idx} className="flex w-60 items-center gap-3 rounded-sm border border-gold/40 bg-ink-900/90 px-4 py-3"
                                                animate={shown ? { rotateX: [90, 0], opacity: 1 } : { opacity: 0.4 }} transition={{ type: "tween", duration: 0.8 }}>
                                                <span className="font-display text-3xl text-gold">{idx + 1}</span>
                                                {shown && info ? (
                                                    <><HouseBanner house={info} size="sm" /><div className="text-left"><p className="font-display text-xl text-parchment">{info.name}</p><p className="text-parchment-dim">{row.total} pts</p></div></>
                                                ) : <span className="font-display text-3xl text-gold/50">?</span>}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {batch && (
                        <>
                            <p className="font-display text-xl tracking-[0.4em] text-gold">Batch ’{batch.slice(0, 2)}</p>
                            <h2 className="title-shimmer font-display text-5xl sm:text-7xl">Champions</h2>
                            {top.length === 0 ? <p className="mt-10 text-2xl italic text-parchment-dim">No scores were recorded</p> : (
                                <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6">
                                    {PODIUM.map((p) => {
                                        const r = top[p.i];
                                        if (!r) return null;
                                        const house = detectHouseFromTeam(r.teamName);
                                        return (
                                            <div key={p.i} className="flex w-36 flex-col items-center sm:w-56">
                                                <motion.div className="mb-2" initial={{ opacity: 0, y: -60, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: p.delay + 0.6, type: "spring", damping: 10 }}>
                                                    {house && <div className="mb-1 flex justify-center"><HouseBanner house={house} size="sm" /></div>}
                                                    <p className="font-display text-xl text-parchment sm:text-2xl">{r.teamName}</p>
                                                    <p className="font-display text-2xl text-gold-bright">{r.score} pts</p>
                                                </motion.div>
                                                <motion.div className={`${p.h} w-full origin-bottom rounded-t-sm border-2 border-gold-bright bg-linear-to-b ${p.bg} pt-3 font-display text-5xl text-ink-950`}
                                                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: p.delay, duration: 0.9, ease: "easeOut" }}>
                                                    {p.label}
                                                </motion.div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
            </motion.div>

            <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <button className={btn} onClick={() => (last ? onClose() : setStep((s) => s + 1))}>
                    {last ? "View final standings" : step === 0 ? "Begin the ceremony" : "Next ›"}
                </button>
            </div>
        </motion.div>
    );
};

export default Ceremony;
