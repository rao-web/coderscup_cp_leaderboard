import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

const CountUp = ({ value }: { value: number }) => {
    const [v, setV] = useState(0);
    const from = useRef(0);
    useEffect(() => {
        const c = animate(from.current, value, { duration: 1.6, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
        from.current = value;
        return () => c.stop();
    }, [value]);
    return <>{v}</>;
};

export default CountUp;
