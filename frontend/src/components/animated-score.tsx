"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useReducedMotion } from "motion/react";

export function AnimatedScore({
  value,
  decimals = 1,
  suffix = "%",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    if (reduceMotion) {
      ref.current.textContent = `${value.toFixed(decimals)}${suffix}`;
      return;
    }

    const counter = { value: 0 };
    const animation = animate(counter, {
      value,
      duration: 720,
      ease: "out(4)",
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = `${counter.value.toFixed(decimals)}${suffix}`;
        }
      },
    });
    return () => {
      animation.revert();
    };
  }, [decimals, reduceMotion, suffix, value]);

  return <span ref={ref}>{reduceMotion ? `${value.toFixed(decimals)}${suffix}` : `0${suffix}`}</span>;
}
