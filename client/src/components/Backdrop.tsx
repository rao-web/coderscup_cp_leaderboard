import { useMemo } from "react";

// Castle skyline drawn in SVG: x position, width, height, spire height
const TOWERS: Array<[number, number, number, number]> = [
    [40, 44, 110, 0], [100, 30, 160, 64], [150, 54, 120, 0], [220, 38, 210, 90],
    [275, 70, 150, 0], [370, 46, 250, 120], [430, 34, 180, 70], [480, 60, 140, 0],
    [560, 40, 200, 84], [620, 80, 120, 0], [720, 36, 170, 66], [770, 50, 240, 100],
    [835, 40, 150, 0], [890, 64, 190, 76], [970, 36, 130, 0], [1020, 44, 175, 60],
    [1080, 56, 115, 0], [1150, 36, 150, 56],
];

// Tiny seeded generator so stars don't jump around on re-render
const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
};

const Backdrop = () => {
    const stars = useMemo(() => {
        const rnd = seeded(42);
        return Array.from({ length: 46 }, () => ({
            left: `${rnd() * 100}%`,
            top: `${rnd() * 55}%`,
            size: rnd() > 0.85 ? 3 : 2,
            dur: `${3 + rnd() * 4}s`,
            delay: `${rnd() * 5}s`,
        }));
    }, []);

    const candles = useMemo(() => {
        const rnd = seeded(7);
        return Array.from({ length: 11 }, (_, i) => ({
            left: `${4 + i * 9 + rnd() * 4}%`, top: `${5 + rnd() * 24}%`,
            h: 22 + rnd() * 18, cd: `${5 + rnd() * 4}s`, delay: `${-rnd() * 6}s`, fd: `${0.25 + rnd() * 0.2}s`,
        }));
    }, []);
    const motes = useMemo(() => {
        const rnd = seeded(99);
        return Array.from({ length: 24 }, () => ({ left: `${rnd() * 100}%`, rd: `${10 + rnd() * 10}s`, delay: `${-rnd() * 14}s`, s: 2 + rnd() * 2 }));
    }, []);

    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Optional: drop your own castle photo at client/public/castle-bg.jpg */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-45"
                style={{ backgroundImage: "url('/castle-bg.jpg')" }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_8%,rgba(212,173,90,0.16),transparent_55%),linear-gradient(to_bottom,rgba(11,5,4,0.55),rgba(46,18,3,0.55)_70%,rgba(11,5,4,0.9))]" />

            {stars.map((s, i) => (
                <span
                    key={i}
                    className="star absolute rounded-full bg-gold-bright"
                    style={{ left: s.left, top: s.top, width: s.size, height: s.size, ["--d" as string]: s.dur, ["--delay" as string]: s.delay }}
                />
            ))}

            {/* moon */}
            <div className="absolute right-[12%] top-[8%] h-24 w-24 rounded-full opacity-80" style={{ background: "radial-gradient(circle at 35% 35%,#fffbe6,#f0d48a 60%,#b98d3a)", boxShadow: "0 0 80px 30px rgba(240,212,138,.25)" }} />
            {/* shooting star + owl */}
            <span className="absolute right-[20%] top-[12%] h-0.5 w-24 bg-linear-to-l from-transparent to-gold-bright" style={{ animation: "shoot 9s linear 3s infinite" }} />
            <svg className="absolute left-0 top-0 w-14 text-ink-950" viewBox="0 0 60 30" style={{ animation: "owl 38s linear 8s infinite", filter: "drop-shadow(0 0 4px rgba(212,173,90,.4))" }}>
                <path fill="currentColor" d="M30 10c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5zM25 14C14 4 4 6 0 12c8-1 14 4 22 8zM35 14c11-10 21-8 25-2-8-1-14 4-22 8z" />
            </svg>
            {/* mist */}
            <div className="absolute -left-[10%] bottom-[18%] h-48 w-[120%] opacity-30 blur-3xl" style={{ background: "radial-gradient(ellipse,rgba(212,173,90,.35),transparent 70%)", animation: "mist 18s ease-in-out infinite alternate" }} />
            {/* floating candles */}
            {candles.map((c, i) => (
                <div key={i} className="candle absolute flex flex-col items-center opacity-90" style={{ left: c.left, top: c.top, ["--cd" as string]: c.cd, ["--cdelay" as string]: c.delay }}>
                    <div className="flame h-4 w-2.5 rounded-full" style={{ ["--fd" as string]: c.fd, boxShadow: "0 0 28px 12px rgba(255,190,70,.32)" }} />
                    <div className="w-2 rounded-t-sm bg-linear-to-b from-parchment to-parchment-dim" style={{ height: c.h }} />
                </div>
            ))}
            {/* rising embers */}
            {motes.map((m, i) => (
                <span key={i} className="mote absolute bottom-0 rounded-full bg-gold-bright" style={{ left: m.left, width: m.s, height: m.s, ["--rd" as string]: m.rd, ["--rdelay" as string]: m.delay }} />
            ))}

            <svg
                className="absolute bottom-0 left-0 h-[46%] w-full"
                viewBox="0 0 1200 300"
                preserveAspectRatio="xMidYMax slice"
            >
                <defs>
                    <linearGradient id="castleFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#1a0b06" />
                        <stop offset="1" stopColor="#070302" />
                    </linearGradient>
                </defs>
                <g fill="url(#castleFill)" stroke="#d4ad5a" strokeOpacity="0.28" strokeWidth="1.2">
                    {TOWERS.map(([x, w, h, s], i) => (
                        <g key={i}>
                            <rect x={x} y={300 - h} width={w} height={h} />
                            {s > 0 && <polygon points={`${x - 4},${300 - h} ${x + w + 4},${300 - h} ${x + w / 2},${300 - h - s}`} />}
                        </g>
                    ))}
                    <rect x="0" y="262" width="1200" height="38" />
                </g>
                {/* lit windows */}
                <g fill="#f0d48a">
                    {TOWERS.filter((_, i) => i % 2 === 0).map(([x, w, h], i) => (
                        <g key={i} opacity={0.55}>
                            <rect x={x + w / 2 - 2} y={300 - h + 24} width="4" height="9" />
                            {h > 150 && <rect x={x + w / 2 - 2} y={300 - h + 58} width="4" height="9" />}
                        </g>
                    ))}
                </g>
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
        </div>
    );
};

export default Backdrop;
