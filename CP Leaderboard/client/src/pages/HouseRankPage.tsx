import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import TableSpinner from "../components/TableSpinner";
import PageTitle from "../components/PageTitle";
import HouseBanner from "../components/HouseBanner";
import { AnimatePresence, motion } from "framer-motion";
import { BACKENDURL } from "../../constants"
import { getHouseInfo } from "../utils/houses";

type BatchScores = Record<string, number>;
type HousesData = Record<string, BatchScores>;

const TH = "sticky top-0 z-20 bg-linear-to-b from-umber-800 to-umber-900 border-b border-gold/50 px-2 py-3 text-center font-display text-lg tracking-widest text-gold sm:px-4 sm:text-xl";

const HouseRankPage = ({ page }: { page: string }) => {
    const [data, setData] = useState<HousesData | null>(null);

    useEffect(() => {
        const socket = io(BACKENDURL);
        socket.emit("joinRoom", "Houses");
        socket.on("sendData", (housesData: HousesData) => setData(housesData));
        return () => {
            socket.off("sendData");
            socket.disconnect();
        };
    }, [page]);

    const batchKeys = useMemo(() => {
        if (!data) return [] as string[];
        const set = new Set<string>();
        Object.values(data).forEach((houseBatches) => {
            Object.keys(houseBatches).forEach((batch) => set.add(batch));
        });
        return Array.from(set).sort((a, b) => {
            const na = parseInt(a);
            const nb = parseInt(b);
            if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
            return na - nb;
        });
    }, [data]);

    const rows = useMemo(() => {
        if (!data) return [] as { house: string; batches: BatchScores; totalScore: number }[];
        return Object.entries(data)
            .map(([house, batches]) => ({
                house,
                batches,
                totalScore: Object.values(batches).reduce((sum, score) => sum + (score ?? 0), 0),
            }))
            .sort((a, b) => b.totalScore - a.totalScore);
    }, [data]);

    const hasData = data && rows.length > 0;

    return (
        <div className="flex w-full flex-col items-center gap-6">
            <PageTitle eyebrow="The race for the cup" title="House Rankings" />

            <div className="flex w-full justify-center px-3">
                {!data && <TableSpinner />}

                {data && !hasData && (
                    <div className="flex w-full max-w-3xl items-center justify-center rounded-sm border border-gold/30 bg-ink-900/80 px-8 py-20 backdrop-blur-sm">
                        <h2 className="text-center font-display text-2xl text-parchment sm:text-3xl">Waiting for the houses to score</h2>
                    </div>
                )}

                {hasData && (
                    <div className="w-full max-w-[94vw] overflow-hidden rounded-sm border border-gold/50 bg-ink-900/90 panel backdrop-blur-sm sm:w-auto">
                        <div className="no-scrollbar max-h-[54vh] overflow-auto">
                            <table className="mx-auto min-w-max border-separate border-spacing-y-1">
                                <thead className="sticky top-0 z-30">
                                    <tr>
                                        <th className={TH}>Rank</th>
                                        <th className={TH}>House</th>
                                        {batchKeys.map((batch) => (
                                            <th key={batch} className={TH}>{batch.toUpperCase()}</th>
                                        ))}
                                        <th className={TH}>Total</th>
                                    </tr>
                                </thead>
                                <tbody aria-live="polite">
                                    <AnimatePresence initial={false}>
                                        {rows.map((row, idx) => {
                                            const house = getHouseInfo(row.house);
                                            return (
                                                <motion.tr
                                                    key={row.house}
                                                    layout
                                                    initial={{ opacity: 0.5, y: 16 }}
                                                    animate={{ opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } }}
                                                    exit={{ opacity: 0, y: -16, transition: { duration: 1, ease: "easeIn" } }}
                                                    transition={{ type: "spring", stiffness: 1500, damping: 40, mass: 1.4 }}
                                                    className={idx === 0 ? "bg-linear-to-r from-gold/25 via-gold/5 to-transparent row-gold" : "bg-linear-to-r from-white/[0.04] to-transparent"}
                                                >
                                                    <td className="px-3 py-3 text-center sm:px-5">
                                                        <span className={`inline-grid h-9 w-9 place-items-center rounded-full font-display text-xl ${idx === 0 ? "bg-linear-to-br from-gold-bright to-gold text-ink-950" : "text-gold"}`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 sm:px-8">
                                                        <div className="flex items-center gap-3">
                                                            {house && <HouseBanner house={house} size="sm" />}
                                                            <span className="font-display text-2xl text-parchment">{house?.name ?? row.house}</span>
                                                        </div>
                                                    </td>
                                                    {batchKeys.map((batch) => (
                                                        <td key={batch} className="whitespace-nowrap px-3 py-3 text-center text-xl tabular-nums text-parchment-dim sm:px-4">
                                                            {row.batches[batch] ?? 0}
                                                        </td>
                                                    ))}
                                                    <td className="whitespace-nowrap px-4 py-3 text-center font-display text-3xl tabular-nums text-gold-bright sm:px-6">
                                                        {row.totalScore}
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HouseRankPage;
