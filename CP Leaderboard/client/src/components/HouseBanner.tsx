import { useState } from "react";
import type { HouseInfo } from "../utils/houses";

// House banner.
// Put your artwork in client/public/banners/ named after the house, lowercase:
//   gryffindor.webp  hufflepuff.webp  ravenclaw.webp  slytherin.webp
// If a file is missing, a drawn striped pennant is shown instead.
const HouseBanner = ({ house, size = "md" }: { house: HouseInfo; size?: "sm" | "md" }) => {
    const [noImage, setNoImage] = useState(false);
    const big = size === "md";

    if (!noImage) {
        return (
            <img
                src={`/banners/${house.key.toLowerCase()}.webp`}
                alt={`${house.name} banner`}
                onError={() => setNoImage(true)}
                draggable={false}
                className={`select-none object-contain ${big ? "mx-auto h-52 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]" : "h-10 w-auto"}`}
            />
        );
    }

    // Fallback: drawn pennant in the house colours
    return (
        <div
            className={`relative shrink-0 ${big ? "mx-auto h-44 w-32" : "h-10 w-7"}`}
            style={{
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)",
                background: `repeating-linear-gradient(135deg, ${house.primary} 0 14px, ${house.secondary} 14px 28px)`,
            }}
        >
            {big && (
                <span className="absolute left-1/2 top-[38%] grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-gold-bright bg-ink-950/80 font-display text-4xl text-gold-bright">
                    {house.name[0]}
                </span>
            )}
        </div>
    );
};

export default HouseBanner;
