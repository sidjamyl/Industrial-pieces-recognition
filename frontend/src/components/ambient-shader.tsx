"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

export function AmbientShader() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="ambient-orb" aria-hidden="true">
      <GrainGradient
        width="100%"
        height="100%"
        colors={["#d4e1e8", "#ffffff", "#8fa9ba", "#e8e3dc"]}
        colorBack="#f5f4f0"
        softness={0.84}
        intensity={0.24}
        noise={0.12}
        shape="sphere"
        speed={reduceMotion ? 0 : 0.12}
        scale={1.12}
        maxPixelCount={900000}
      />
    </div>
  );
}
