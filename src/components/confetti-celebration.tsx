"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

/** One-shot confetti bursts when the results celebration mounts. */
export function ConfettiCelebration() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const fire = (partial?: Parameters<typeof confetti>[0]) => {
      void confetti({
        particleCount: 110,
        spread: 75,
        startVelocity: 38,
        ticks: 220,
        gravity: 0.9,
        origin: { y: 0.65 },
        ...partial,
      });
    };

    fire();

    const t1 = window.setTimeout(() => {
      fire({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.55 } });
    }, 250);

    const t2 = window.setTimeout(() => {
      fire({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.55 } });
    }, 450);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
