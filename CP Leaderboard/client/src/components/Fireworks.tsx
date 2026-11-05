import { useEffect, useRef } from "react";

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string };

// Looping fireworks on a canvas. Turn `active` on to start.
const Fireworks = ({ colors, active }: { colors: string[]; active: boolean }) => {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!active) return;
        const c = ref.current!, ctx = c.getContext("2d")!;
        const resize = () => { c.width = innerWidth; c.height = innerHeight; };
        resize();
        window.addEventListener("resize", resize);
        const parts: P[] = [];
        const burst = () => {
            const x = innerWidth * (0.1 + Math.random() * 0.8), y = innerHeight * (0.08 + Math.random() * 0.45);
            const col = colors[(Math.random() * colors.length) | 0];
            for (let i = 0; i < 90; i++) {
                const a = Math.random() * 6.283, s = 1 + Math.random() * 5;
                parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1500, max: 1500, c: col });
            }
        };
        burst();
        const iv = setInterval(burst, 550);
        let raf = 0;
        const frame = () => {
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.globalCompositeOperation = "lighter";
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.life -= 16.7;
                if (p.life <= 0) { parts.splice(i, 1); continue; }
                p.vy += 0.05; p.vx *= 0.99; p.x += p.vx; p.y += p.vy;
                ctx.globalAlpha = p.life / p.max;
                ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, 6.283); ctx.fill();
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => { clearInterval(iv); cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, [active, colors]);

    return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
};

export default Fireworks;
