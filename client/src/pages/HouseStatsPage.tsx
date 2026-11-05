import { useState, useEffect } from 'react';
import { io } from "socket.io-client";
import { BACKENDURL } from '../../constants';
import { HOUSE_LIST } from '../utils/houses';
import PageTitle from '../components/PageTitle';
import HouseBanner from '../components/HouseBanner';
import CountUp from '../components/CountUp';
import { motion } from 'framer-motion';

const batches: string[] = ["23k", "24k", "25k", "26k"];
type HousesData = Record<string, Record<string, number | undefined>>;

const HouseStatsPage = ({ page }: { page: string }) => {
    const [data, setData] = useState<HousesData>({});

    useEffect(() => {
        const socket = io(BACKENDURL);
        socket.emit("joinRoom", "Houses");
        socket.on("sendData", (housesData: HousesData) => setData(housesData));
        return () => {
            socket.disconnect();
        };
    }, [page]);

    return (
        <div className="flex w-full flex-col items-center gap-8">
            <PageTitle eyebrow="Four houses, one castle" title="House Points" />

            <div className="grid w-full max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
                {HOUSE_LIST.map((house, i) => {
                    const scores = data[house.key];
                    const total = batches.reduce((sum, b) => sum + (scores?.[b] ?? 0), 0);
                    return (
                        <motion.article
                            key={house.key}
                            initial={{ opacity: 0, y: 120, rotateX: -60, scale: 0.8 }}
                            animate={page === 'house' ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : { opacity: 0, y: 120, rotateX: -60, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 90, damping: 13, delay: page === 'house' ? 0.5 + i * 0.18 : 0 }}
                            whileHover={{ y: -10, scale: 1.04, boxShadow: `0 0 50px ${house.primary}88, 0 20px 40px rgba(0,0,0,.6)` }}
                            className="panel mx-auto w-full max-w-[17rem] rounded-sm border border-gold/30 bg-ink-900/85 pb-5 backdrop-blur-sm"
                            style={{ borderTop: `3px solid ${house.primary}`, boxShadow: `0 0 28px ${house.primary}44` }}
                        >
                            <div className="banner-sway -mt-px">
                                <HouseBanner house={house} />
                            </div>
                            <h2 className="mt-3 text-center font-display text-3xl text-parchment">{house.name}</h2>
                            <p className="text-center font-display text-lg tracking-widest" style={{ color: house.accent }}>
                                {house.trait}
                            </p>

                            <ul className="mx-auto mt-4 w-4/5 space-y-1">
                                {batches.map((batch) => {
                                    const score = scores?.[batch];
                                    return (
                                        <li key={batch} className="flex justify-between text-lg text-parchment-dim">
                                            <span>Batch ’{batch.slice(0, 2)}</span>
                                            <span className="tabular-nums text-parchment">{score !== undefined ? <CountUp value={score} /> : "–"}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="mx-auto mt-3 flex w-4/5 items-baseline justify-between border-t border-gold/30 pt-3 font-display text-2xl">
                                <span className="text-gold">Total</span>
                                <span className="tabular-nums text-gold-bright"><CountUp value={total} /></span>
                            </div>
                        </motion.article>
                    );
                })}
            </div>
        </div>
    );
};

export default HouseStatsPage;
