const BottomTicker = ({ tickerMessage }: { tickerMessage: string }) => (
    <div className="fixed bottom-4 left-0 right-0 z-30">
        <div className="relative w-full overflow-hidden border-y border-gold/50 bg-ink-900/95">
            <div className="marquee whitespace-nowrap py-2">
                {[0, 1, 2].map((i) => (
                    <span key={i}>
                        <span className="px-4 text-lg italic text-parchment">{tickerMessage}</span>
                        <span className="px-8 text-gold">✦</span>
                    </span>
                ))}
            </div>
        </div>
    </div>
);

export default BottomTicker;
