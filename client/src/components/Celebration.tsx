import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import HouseBanner from "./HouseBanner";
import type { HouseInfo } from "../utils/houses";

export type CelebrationData =
    | { kind: "house"; house: HouseInfo }
    | { kind: "team"; batch: string; teamName: string; score: number; house: HouseInfo | null };

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; g: number };

const GOLD = ["#fff3c4", "#f0d48a", "#d4ad5a", "#ffd76a"];
const ease = (f: number) => f * f * (3 - 2 * f);

const Rider = ({ primary, secondary }: { primary: string; secondary: string }) => (
    <svg viewBox="0 0 200 90" width="200" height="90" style={{ overflow: "visible" }}>
        <path d="M30 58 L-6 46 L-8 62 L-4 72 L30 62Z" fill="#a9772f" />
        <path d="M30 58 L160 42" stroke="#6b3f1d" strokeWidth="5" strokeLinecap="round" />
        <path d="M120 46 L128 45" stroke="#d4ad5a" strokeWidth="7" />
        <g className="cape">
            <path d="M104 30 C70 20 40 40 4 30 C40 56 70 52 98 52Z" fill={primary} />
            <path d="M100 38 C70 34 40 46 14 40 C44 52 70 50 98 48Z" fill={secondary} opacity=".8" />
        </g>
        <path d="M96 30 L114 30 L120 52 L92 54Z" fill="#1a1210" />
        <path d="M112 34 L142 45" stroke="#1a1210" strokeWidth="5" strokeLinecap="round" />
        <path d="M100 52 L94 68" stroke="#1a1210" strokeWidth="5" strokeLinecap="round" />
        <circle cx="108" cy="22" r="8" fill="#f1c9a0" />
        <path d="M97 18 L110 -10 L119 18Z" fill="#1a1210" />
        <ellipse cx="108" cy="18" rx="15" ry="3.5" fill="#1a1210" />
        <rect x="100" y="12" width="17" height="3" fill={primary} />
    </svg>
);

const Snitch = () => (
    <svg viewBox="0 0 90 50" width="90" height="50" style={{ overflow: "visible" }}>
        <defs>
            <radialGradient id="snb" cx="35%" cy="30%">
                <stop offset="0" stopColor="#fff8d6" />
                <stop offset=".5" stopColor="#f0c64a" />
                <stop offset="1" stopColor="#9a6a10" />
            </radialGradient>
        </defs>
        <g className="wing-l"><path d="M38 24 C22 2 4 4 -4 12 C8 14 14 22 38 26Z" fill="#fff3c4" opacity=".85" stroke="#d4ad5a" strokeWidth=".8" /></g>
        <g className="wing-r"><path d="M52 24 C68 2 86 4 94 12 C82 14 76 22 52 26Z" fill="#fff3c4" opacity=".85" stroke="#d4ad5a" strokeWidth=".8" /></g>
        <circle cx="45" cy="25" r="10" fill="url(#snb)" style={{ filter: "drop-shadow(0 0 8px #ffd76a)" }} />
    </svg>
);

const Celebration = ({ data, onDone }: { data: CelebrationData; onDone: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const actorRef = useRef<HTMLDivElement>(null);
    const [reveal, setReveal] = useState(false);
    const isHouse = data.kind === "house";
    const house = data.house;
    const primary = house?.primary ?? "#d4ad5a";
    const secondary = house?.secondary ?? "#7a4a00";

    useEffect(() => {
        const c = canvasRef.current!;
        const ctx = c.getContext("2d")!;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
        resize();
        window.addEventListener("resize", resize);

        const parts: P[] = [];
        const W = innerWidth, H = innerHeight;
        const palette = house ? [primary, house.accent, ...GOLD] : GOLD;
        const emit = (x: number, y: number, n: number, spd: number, size: number, g = 0, life = 900) => {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * 6.283, s = Math.random() * spd;
                parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life * (0.6 + Math.random() * 0.6), size: size * (0.5 + Math.random()), color: palette[(Math.random() * palette.length) | 0], g });
            }
        };
        const burst = (x: number, y: number, n = 110) => emit(x, y, n, 7, 2.6, 0.06, 1400);

        const FLY = isHouse ? 3600 : 3400;
        const pts = [[-0.08, .7], [.2, .22], [.34, .62], [.56, .18], [.72, .58], [.42, .34], [.5, .46]].map(([a, b]) => [a * W, b * H]);
        const pos = (t: number) => {
            if (isHouse) return { x: -0.16 * W + t * 1.32 * W, y: H * (0.3 + 0.1 * Math.sin(t * Math.PI * 3)) - t * H * 0.05 };
            const n = pts.length - 1, s = Math.min(Math.max(t, 0), 0.9999) * n, i = Math.floor(s), f = ease(s - i);
            return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f + Math.sin(t * 90) * 5, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f + Math.cos(t * 70) * 5 };
        };

        const timers: number[] = [];
        let revealed = false, last = performance.now(), raf = 0;
        const start = last;

        const frame = (now: number) => {
            const t = Math.max(now - start, 0), dt = Math.min(Math.max((now - last) / 16.7, 0), 3);
            last = now;
            const k = Math.min(t / FLY, 1);
            const a = actorRef.current;
            if (a && t <= FLY) {
                const p = pos(k), p2 = pos(Math.min(k + 0.01, 1));
                const ang = isHouse ? Math.atan2(p2.y - p.y, p2.x - p.x) : Math.sin(k * 40) * 0.25;
                a.style.opacity = "1";
                a.style.transform = `translate(${p.x}px,${p.y}px) rotate(${ang}rad)`;
                const lx = isHouse ? -105 : 0, ly = isHouse ? 12 : 0;
                const tx = p.x + lx * Math.cos(ang) - ly * Math.sin(ang), ty = p.y + lx * Math.sin(ang) + ly * Math.cos(ang);
                emit(tx, ty, isHouse ? 6 : 3, 1.4, isHouse ? 2.6 : 1.8, 0.01, isHouse ? 1100 : 700);
            }
            if (t > FLY && !revealed) {
                revealed = true;
                if (a) a.style.opacity = "0";
                const p = pos(1);
                if (isHouse) {
                    [0, 300, 650, 1000, 1400].forEach((d) => timers.push(window.setTimeout(() => burst(W * (0.15 + Math.random() * 0.7), H * (0.12 + Math.random() * 0.4)), d)));
                } else {
                    burst(p.x, p.y, 160);
                }
                setReveal(true);
            }
            ctx.clearRect(0, 0, W, H);
            ctx.globalCompositeOperation = "lighter";
            for (let i = parts.length - 1; i >= 0; i--) {
                const q = parts[i];
                q.life -= 16.7 * dt;
                if (q.life <= 0) { parts.splice(i, 1); continue; }
                q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
                const al = Math.max(q.life / q.max, 0);
                ctx.fillStyle = q.color;
                ctx.globalAlpha = Math.min(al, 1) * 0.25;
                ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 3, 0, 6.283); ctx.fill();
                ctx.globalAlpha = Math.min(al, 1);
                ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 6.283); ctx.fill();
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        timers.push(window.setTimeout(onDone, isHouse ? 8200 : 7600));

        return () => {
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
            window.removeEventListener("resize", resize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <motion.div
            className="fixed inset-0 z-60 cursor-pointer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}
            onClick={onDone}
        >
            <motion.div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse at center, rgba(11,5,4,.45), rgba(0,0,0,.88))" }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

            <div
                ref={actorRef}
                className="absolute left-0 top-0 opacity-0"
                style={isHouse ? { marginLeft: -100, marginTop: -45 } : { marginLeft: -45, marginTop: -25 }}
            >
                {isHouse ? <Rider primary={primary} secondary={secondary} /> : <Snitch />}
            </div>

            {reveal && (
                <>
                    <motion.div
                        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
                        style={{ borderColor: isHouse ? primary : "#f0d48a" }}
                        initial={{ scale: 0, opacity: 0.9 }} animate={{ scale: 18, opacity: 0 }} transition={{ duration: 1.4, ease: "easeOut" }}
                    />
                    <motion.div className="absolute inset-0 bg-parchment" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />

                    {data.kind === "house" ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <motion.div initial={{ y: "-120vh", rotate: -6 }} animate={{ y: 0, rotate: [-6, 4, -2, 0] }} transition={{ type: "spring", stiffness: 70, damping: 9, rotate: { type: "tween", duration: 1.6 } }}>
                                <div className="mx-auto h-1.5 w-56 rounded bg-linear-to-r from-gold-deep via-gold-bright to-gold-deep" />
                                <div className="banner-sway origin-top scale-[1.35] pb-8 pt-3 sm:scale-150"><HouseBanner house={data.house} /></div>
                            </motion.div>
                            <motion.p className="mt-14 font-display text-xl tracking-[0.35em] text-gold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                                Takes the lead of the House Cup
                            </motion.p>
                            <motion.h2 className="font-display text-6xl sm:text-8xl" style={{ color: data.house.accent, textShadow: `0 0 40px ${data.house.primary}` }} initial={{ opacity: 0, scale: 0.4, letterSpacing: "0.6em" }} animate={{ opacity: 1, scale: 1, letterSpacing: "0.05em" }} transition={{ delay: 1, duration: 1, type: "spring", damping: 12 }}>
                                {data.house.name}
                            </motion.h2>
                            <motion.p className="mt-2 text-2xl italic text-parchment-dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>{data.house.trait} prevails</motion.p>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-4">
                            <motion.div
                                className="w-full max-w-xl rounded-sm px-8 pb-8 pt-7 text-center text-ink-950"
                                style={{ background: "linear-gradient(160deg,#f7ebc9,#d9c08c)", border: "3px double #7a4a00", boxShadow: `0 0 90px ${house ? house.primary : "#d4ad5a"}, 0 30px 80px rgba(0,0,0,.7)` }}
                                initial={{ scale: 0, rotate: -14 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 140, damping: 11 }}
                            >
                                <p className="font-display text-lg tracking-[0.3em] text-gold-deep">New Leader · Batch ’{data.batch.slice(0, 2)}</p>
                                <h2 className="mt-2 font-display text-4xl leading-tight sm:text-6xl">{data.teamName}</h2>
                                <div className="mx-auto my-4 h-px w-3/4 bg-linear-to-r from-transparent via-gold-deep to-transparent" />
                                <p className="text-2xl italic">has caught the Golden Snitch</p>
                                <p className="mt-3 font-display text-5xl text-gold-deep">{data.score} pts</p>
                                {data.house && <div className="mt-3 flex items-center justify-center gap-3"><HouseBanner house={data.house} size="sm" /><span className="font-display text-2xl" style={{ color: data.house.secondary }}>House {data.house.name}</span></div>}
                            </motion.div>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
};

export default Celebration;
