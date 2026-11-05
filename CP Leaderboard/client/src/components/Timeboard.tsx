const Timeboard = ({ label, display }: { label: string; display: string }) => (
    <div className="fixed left-3 top-3 z-30 min-w-36 rounded-sm border border-gold/40 bg-ink-900/85 px-4 py-2 text-center shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:left-5 sm:top-5">
        <div className="h-5 font-display text-sm tracking-widest text-gold">{label || "Coder’s Cup ’26"}</div>
        <div className="whitespace-nowrap text-2xl font-semibold tabular-nums text-parchment">{display}</div>
    </div>
);

export default Timeboard;
