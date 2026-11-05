const PageTitle = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
    <header className="px-4 text-center">
        <p className="font-display text-sm tracking-[0.35em] text-gold sm:text-base">✦ {eyebrow} ✦</p>
        <h1 className="title-shimmer mt-1 font-display text-5xl drop-shadow-[0_2px_24px_rgba(212,173,90,0.45)] sm:text-7xl">{title}</h1>
        <div className="mt-3 flex items-center justify-center gap-3 text-gold">
            <span className="h-px w-14 bg-linear-to-r from-transparent to-gold/70 sm:w-40" />
            <span className="text-xs">⚡</span>
            <span className="text-[0.6rem]">◆</span>
            <span className="text-xs">⚡</span>
            <span className="h-px w-14 bg-linear-to-l from-transparent to-gold/70 sm:w-40" />
        </div>
    </header>
);

export default PageTitle;
