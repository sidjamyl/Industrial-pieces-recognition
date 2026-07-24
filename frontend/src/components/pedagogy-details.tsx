"use client";

import { Braces, Crop, Images, Network } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import type { PredictionResponse } from "@/lib/recognition-types";

function EmbeddingStrip({ values }: { values: number[] }) {
  const sample = values.filter((_, index) => index % 6 === 0);
  return (
    <div className="mt-5 flex h-28 items-center gap-[2px] overflow-hidden rounded-[16px] bg-[var(--ink)] p-4">
      {sample.map((value, index) => (
        <motion.span
          key={index}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: index * 0.004 }}
          className="min-w-[2px] flex-1 origin-center rounded-full bg-white/80"
          style={{ height: `${Math.max(5, Math.abs(value) * 560)}%` }}
        />
      ))}
    </div>
  );
}

export function PedagogyDetails({
  result,
}: {
  result: PredictionResponse;
}) {
  const detail = result.pedagogy;

  return (
    <section className="mt-8 border-t border-[var(--line)] pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge>Décomposition réelle</Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
            Comment le résultat a été obtenu
          </h2>
        </div>
        <p className="max-w-[430px] text-sm leading-6 text-[var(--muted)]">
          Chaque bloc correspond aux données calculées par l’API pour cette
          photo, sans simulation visuelle.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[24px] border border-[var(--line)] bg-white/68 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[var(--surface-soft)]">
              <Crop className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">1 · Recadrage transmis</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {detail.crop_size[0]} × {detail.crop_size[1]} pixels
              </p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.crop_data_url}
            alt="Recadrage exact transmis au modèle"
            className="mt-5 aspect-video w-full rounded-[16px] bg-black object-contain"
          />
        </article>

        <article className="rounded-[24px] border border-[var(--line)] bg-white/68 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[var(--surface-soft)]">
              <Braces className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">2 · Tenseur normalisé</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Forme [{detail.tensor.shape.join(" × ")}]
              </p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Minimum", detail.tensor.minimum],
              ["Moyenne", detail.tensor.mean],
              ["Maximum", detail.tensor.maximum],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[16px] bg-black/[0.035] p-3">
                <dt className="text-[10px] text-[var(--muted)] uppercase">
                  {label}
                </dt>
                <dd className="mt-2 font-mono text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="rounded-[24px] border border-[var(--line)] bg-white/68 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[var(--surface-soft)]">
              <Network className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">3 · Embedding DINOv2</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {detail.embedding.dimensions} dimensions · norme{" "}
                {detail.embedding.norm}
              </p>
            </div>
          </div>
          <EmbeddingStrip values={detail.embedding.values} />
        </article>

        <article className="rounded-[24px] border border-[var(--line)] bg-white/68 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[var(--surface-soft)]">
              <Images className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">4 · Voisins du catalogue</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {detail.score_formula}
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {detail.neighbors.map((neighbor) => (
              <div key={`${neighbor.specimen}-${neighbor.side}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api${neighbor.image_url}`}
                  alt={`${neighbor.reference}, ${neighbor.side}`}
                  className="aspect-square w-full rounded-[13px] bg-black/[0.04] object-cover"
                />
                <p className="mt-2 truncate text-[10px] font-semibold">
                  {neighbor.reference}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-[var(--muted)]">
                  {neighbor.similarity.toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
