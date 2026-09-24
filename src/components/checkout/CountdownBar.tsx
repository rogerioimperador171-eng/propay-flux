import { useEffect, useState } from "react";

const TOTAL_SECONDS = 5 * 60;

export function CountdownBar() {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="rounded-lg bg-warn px-3 py-3 text-center shadow-sm">
      <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.06em] text-warn-foreground">
        DESCONTO DE 11,5% NO PIX TERMINA EM
      </p>
      <div className="mt-2 flex justify-center">
        <span className="timer-digits inline-flex items-center rounded-md bg-black/25 px-4 py-1.5 text-lg font-bold text-warn-foreground">
          {minutes}:{seconds}
        </span>
      </div>
    </div>
  );
}
