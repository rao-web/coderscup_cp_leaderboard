import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import { BACKENDURL } from "../../constants";
import { detectHouseFromTeam, getHouseInfo } from "../utils/houses";
import PageTitle from "../components/PageTitle";
import HouseBanner from "../components/HouseBanner";
import TableSpinner from "../components/TableSpinner";

type Row = { teamId: string; rank: number; teamName: string; score: number };
type HousesData = Record<string, Record<string, number | undefined>>;

const BATCHES = ["23k", "24k", "25k", "26k"];
const MEDALS = ["bg-linear-to-br from-gold-bright to-gold text-ink-950", "bg-linear-to-br from-slate-100 to-slate-400 text-ink-950", "bg-linear-to-br from-amber-500 to-amber-800 text-ink-950"];

const FinalStandingsPage = ({ page, onReplay }: { page: string; onReplay?: () => void }) => {
    const [houses, setHouses] = useState<HousesData | null>(null);
    const [batchRows, setBatchRows] = useState<Record<string, Row[]>>({});
    const active = page === "final";

    useEffect(() => {
        if (!active) return;
        let cancelled = false;

        // Full snapshot first: lets empty batches resolve to "No scores were recorded" instead of spinning
        fetch(`${BACKENDURL}/api/getRanking`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad response"))))
            .then((buf: Record<string, unknown>) => {
                if (cancelled || !buf) return;
                if (buf.Houses && typeof buf.Houses === "object") setHouses(buf.Houses as HousesData);
                setBatchRows((d) => {
                    const next = { ...d };
                    BATCHES.forEach((b) => {
                        const v = buf[b] as { rows?: Row[] } | unknown[] | undefined;
                        next[b] = Array.isArray(v) ? [] : Array.isArray(v?.rows) ? v.rows : (d[b] ?? []);
                    });
                    return next;
                });
            })
            .catch((e) => console.error("Error loading final standings:", e));

        const socket = io(BACKENDURL);
        socket.emit("joinRoom", "Houses");
        BATCHES.forEach((b) => socket.emit("joinRoom", b));
        socket.on("sendData", (p: unknown) => {
            // Rooms that have no data yet send an empty array: ignore it
            if (!p || typeof p !== "object" || Array.isArray(p)) return;
            const payload = p as { batch?: string; rows?: Row[] };
            if (payload.batch) {
                if (Array.isArray(payload.rows)) setBatchRows((d) => ({ ...d, [payload.batch!]: payload.rows! }));
            } else {
                setHouses(p as HousesData);
            }
        });
        return () => {
            cancelled = true;
            socket.off("sendData");
            socket.disconnect();
        };
    }, [active]);

    const houseRows = useMemo(() => {
        if (!houses) return [];
        return Object.entries(houses)
            .map(([house, batches]) => ({
                house,
                total: Object.values(batches).reduce<number>((s, v) => s + (v ?? 0), 0),
            }))
            .sort((a, b) => b.total - a.total);
    }, [houses]);

    return (
        <div className="flex w-full flex-col items-center gap-5">
            <PageTitle eyebrow="The trial is over" title="Final Standings" />

            {/* House Cup */}
            <section className="w-full max-w-6xl px-4">
                <h2 className="mb-2 text-center font-display text-2xl tracking-widest text-gold">The House Cup</h2>
                {!houses && <TableSpinner />}
                {houses && houseRows.length === 0 && <p className="text-center italic text-parchment-dim">No scores were recorded</p>}
                {houses && houseRows.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {houseRows.map((row, idx) => {
                            const info = getHouseInfo(row.house);
                            return (
                                <motion.article
                                    key={row.house}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                                    transition={{ delay: active ? 0.4 + idx * 0.15 : 0, duration: 0.6 }}
                                    className="panel flex flex-col items-center rounded-sm border bg-ink-900/85 px-4 py-3 backdrop-blur-sm"
                                    style={{
                                        borderColor: idx === 0 && info ? info.primary : "rgba(212,173,90,.3)",
                                        boxShadow: idx === 0 && info ? `0 0 40px ${info.primary}88` : undefined,
                                    }}
                                >
                                    <span className={`grid h-9 w-9 place-items-center rounded-full font-display text-xl ${MEDALS[idx] ?? "text-gold"}`}>{idx + 1}</span>
                                    {info && <div className="mt-2"><HouseBanner house={info} size="sm" /></div>}
                                    <h3 className="mt-2 font-display text-2xl text-parchment">{info?.name ?? row.house}</h3>
                                    {idx === 0 && <p className="font-display text-sm tracking-widest text-gold-bright">♛ House Cup Champions ♛</p>}
                                    <p className="mt-1 font-display text-3xl tabular-nums text-gold-bright">{row.total} pts</p>
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Batch podiums */}
            <section className="w-full max-w-6xl px-4">
                <h2 className="mb-2 text-center font-display text-2xl tracking-widest text-gold">Batch Champions</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {BATCHES.map((batch) => {
                        const rows = batchRows[batch];
                        const top = (rows ?? [])
                            .filter((r) => r.teamId !== "N/A")
                            .sort((a, b) => a.rank - b.rank)
                            .slice(0, 3);
                        return (
                            <div key={batch} className="panel rounded-sm border border-gold/30 bg-ink-900/85 px-4 py-3 backdrop-blur-sm">
                                <h3 className="mb-2 text-center font-display text-xl tracking-widest text-gold">Batch ’{batch.slice(0, 2)}</h3>
                                {!rows && <TableSpinner />}
                                {rows && top.length === 0 && <p className="text-center italic text-parchment-dim">No scores were recorded</p>}
                                <ol className="space-y-1.5">
                                    {top.map((r, i) => {
                                        const house = detectHouseFromTeam(r.teamName);
                                        return (
                                            <li key={`${r.teamId}-${i}`} className="flex items-center gap-3 rounded-sm bg-white/[0.04] px-2 py-1.5">
                                                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-lg ${MEDALS[i]}`}>{i + 1}</span>
                                                {house && <HouseBanner house={house} size="sm" />}
                                                <div className="min-w-0 flex-1 text-left">
                                                    <p className="truncate font-display text-lg text-parchment">{r.teamName}</p>
                                                    <p className="tabular-nums text-parchment-dim">{r.score} pts</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        );
                    })}
                </div>
            </section>

            {onReplay && (
                <button
                    onClick={onReplay}
                    className="cursor-pointer rounded-full border border-gold-bright bg-gold-deep px-7 py-2.5 font-display text-lg text-parchment transition-colors hover:bg-gold hover:text-ink-950"
                >
                    ♛ Replay the ceremony
                </button>
            )}
        </div>
    );
};

export default FinalStandingsPage;
