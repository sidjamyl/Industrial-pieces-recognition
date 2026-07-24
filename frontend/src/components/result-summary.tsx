"use client";

import { Check, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { AnimatedScore } from "@/components/animated-score";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PredictionResponse } from "@/lib/recognition-types";

export function ResultSummary({
  result,
  previewUrl,
  onReset,
}: {
  result: PredictionResponse;
  previewUrl: string;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:gap-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative min-h-[340px] overflow-hidden rounded-[28px] bg-[#12171b]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Pièce analysée"
          className="h-full max-h-[620px] w-full object-contain"
        />
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-xl">
          <Check className="size-3.5" />
          Analyse terminée
        </div>
      </motion.div>

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[var(--accent)] uppercase">
          <Sparkles className="size-4" />
          Référence la plus proche
        </div>
        <div className="mt-4 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-7">
          <div>
            <h2 className="text-[clamp(3.4rem,10vw,6.6rem)] leading-[0.86] font-semibold tracking-[-0.075em]">
              {result.winner}
            </h2>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Classement fondé sur la similarité visuelle
            </p>
          </div>
          <div className="mb-1 rounded-[20px] bg-[var(--accent-soft)] px-4 py-3 text-right">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
              Score
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--accent)]">
              <AnimatedScore value={result.ranking[0].score * 100} />
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-5">
          {result.ranking.map((item, index) => (
            <motion.div
              key={item.reference}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + index * 0.07 }}
            >
              <div className="mb-2.5 flex items-center justify-between text-sm">
                <span className={index === 0 ? "font-semibold" : "text-[var(--muted)]"}>
                  <span className="mr-3 font-mono text-[11px] text-[var(--muted)]">
                    0{index + 1}
                  </span>
                  {item.reference}
                </span>
                <span className="font-mono text-xs font-semibold">
                  {(item.score * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={item.score * 100}
                className={index === 0 ? "h-2" : undefined}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-[18px] border border-[var(--line)] bg-black/[0.025] px-4 py-3.5 text-xs leading-5 text-[var(--muted)]">
          Ces scores mesurent une ressemblance, pas une certitude. Vérifiez la
          référence avant toute opération critique.
        </div>

        <Button className="mt-6 w-full sm:w-auto" onClick={onReset}>
          <RotateCcw className="size-4" />
          Analyser une autre pièce
        </Button>
      </div>
    </div>
  );
}
