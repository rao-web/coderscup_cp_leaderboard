import { useState } from 'react'

const CREDITS = [
    { name: "Hammad Ahmed", link: "https://github.com/rao-web" },
    { name: "Ahsan Abbasi", link: "https://www.linkedin.com/in/mahsanabbasi/" },
];

const Credits = () => {
    const [isInfoPinned, setIsInfoPinned] = useState(false);
    const [isInfoHover, setIsInfoHover] = useState(false);
    const isInfoVisible = isInfoPinned || isInfoHover;

    return (
        <div
            className="fixed right-3 top-3 z-50 sm:right-5 sm:top-5"
            onMouseEnter={() => setIsInfoHover(true)}
            onMouseLeave={() => setIsInfoHover(false)}
        >
            <button
                aria-label="Credits"
                aria-expanded={isInfoVisible}
                onClick={() => setIsInfoPinned((v) => !v)}
                className="ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-gold/60 bg-ink-900/85 font-display text-lg text-gold transition-colors hover:bg-gold hover:text-ink-950"
                title="Credits"
            >
                i
            </button>

            <div
                className={`absolute right-0 mt-2 w-60 transition-all duration-200 ${isInfoVisible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}
            >
                <div className="rounded-sm border border-gold/50 bg-ink-900/95 p-4 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between font-display text-lg text-gold">
                        <span>Credits</span>
                        <button aria-label="Close" onClick={() => setIsInfoPinned(false)} className="rounded px-2 py-1 text-sm text-parchment-dim hover:text-parchment">✕</button>
                    </div>
                    <ul className="space-y-0.5">
                        {CREDITS.map((c) => (
                            <li key={c.name} className="text-parchment">
                                <a href={c.link} className="font-semibold hover:text-gold-bright hover:underline" target="_blank" rel="noreferrer">{c.name}</a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Credits;
