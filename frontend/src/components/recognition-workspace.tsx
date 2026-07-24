"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Focus,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plus,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { CropEditor } from "@/components/crop-editor";
import { PedagogyDetails } from "@/components/pedagogy-details";
import { ResultSummary } from "@/components/result-summary";
import { AnimatedFileUpload } from "@/components/smoothui/animated-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CropBox,
  DetectionResponse,
  PredictionResponse,
} from "@/lib/recognition-types";

type Stage = "upload" | "detecting" | "crop" | "analyzing" | "result";

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "Une erreur inattendue est survenue.";
  } catch {
    return "Le moteur de reconnaissance ne répond pas.";
  }
}

export function RecognitionWorkspace({
  pedagogy = false,
}: {
  pedagogy?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageSize, setImageSize] = useState<[number, number]>([1, 1]);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [detected, setDetected] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stageLabel = useMemo(() => {
    if (stage === "detecting") return "Recherche de la pièce";
    if (stage === "crop") return "Recadrage à confirmer";
    if (stage === "analyzing") return "Comparaison au catalogue";
    if (stage === "result") return "Résultat disponible";
    return "Nouvelle analyse";
  }, [stage]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setCrop(null);
    setResult(null);
    setError("");
    setStage("upload");
  };

  const selectFile = async (selected: File) => {
    setError("");
    if (!selected.type.startsWith("image/")) {
      setError("Choisissez un fichier image JPEG, PNG ou WebP.");
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setError("Cette image dépasse la limite de 20 Mo.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(nextPreview);
    setStage("detecting");

    const form = new FormData();
    form.append("image", selected);
    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const detection = (await response.json()) as DetectionResponse;
      const [x1, y1, x2, y2] = detection.box;
      setImageSize(detection.image_size);
      setCrop({
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
      });
      setDetected(detection.detected);
      setStage("crop");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible de préparer cette image.",
      );
      setStage("upload");
    }
  };

  const analyze = async () => {
    if (!file || !crop) return;
    setError("");
    setStage("analyzing");

    const form = new FormData();
    form.append("image", file);
    form.append("crop_x", String(Math.round(crop.x)));
    form.append("crop_y", String(Math.round(crop.y)));
    form.append("crop_width", String(Math.round(crop.width)));
    form.append("crop_height", String(Math.round(crop.height)));

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setResult((await response.json()) as PredictionResponse);
      setStage("result");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "L’analyse n’a pas pu être terminée.",
      );
      setStage("crop");
    }
  };

  const resizeCrop = (factor: number) => {
    setCrop((current) => {
      if (!current) return current;
      const maximum = Math.min(imageSize[0], imageSize[1]);
      const side = Math.min(
        maximum,
        Math.max(48, Math.round(current.width * factor)),
      );
      return {
        x: Math.min(
          imageSize[0] - side,
          Math.max(0, Math.round(current.x + (current.width - side) / 2)),
        ),
        y: Math.min(
          imageSize[1] - side,
          Math.max(0, Math.round(current.y + (current.height - side) / 2)),
        ),
        width: side,
        height: side,
      };
    });
  };

  const centerCrop = () => {
    setCrop((current) =>
      current
        ? {
            ...current,
            x: Math.round((imageSize[0] - current.width) / 2),
            y: Math.round((imageSize[1] - current.height) / 2),
          }
        : current,
    );
  };

  return (
    <>
      <section className="pt-8 text-center sm:pt-14">
        <Badge>
          <ScanLine className="size-3.5" />
          {pedagogy ? "Laboratoire de compréhension" : "Reconnaissance visuelle"}
        </Badge>
        <h1 className="mx-auto mt-6 max-w-[820px] text-[clamp(2.7rem,7vw,5.8rem)] leading-[0.94] font-semibold tracking-[-0.065em]">
          {pedagogy ? (
            <>
              Voir ce que le modèle{" "}
              <span className="text-[var(--accent)]">comprend.</span>
            </>
          ) : (
            <>
              Une photo.{" "}
              <span className="text-[var(--accent)]">Reconnaissance d&apos;images.</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-6 max-w-[590px] text-[15px] leading-7 text-[var(--muted)] sm:text-base">
          {pedagogy
            ? "Analysez une pièce puis explorez le recadrage, l’embedding et les voisins qui construisent le classement."
            : "Photographiez une pièce industrielle, confirmez son cadrage et obtenez immédiatement les références visuellement les plus proches."}
        </p>
      </section>

      <section className="glass-panel mt-10 overflow-hidden rounded-[32px] p-3 sm:mt-14 sm:rounded-[38px] sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <span
              className={`size-2 rounded-full ${
                stage === "analyzing" || stage === "detecting"
                  ? "animate-pulse bg-[var(--accent)]"
                  : stage === "result"
                    ? "bg-[var(--success)]"
                    : "bg-black/25"
              }`}
            />
            <span className="text-xs font-semibold tracking-[0.04em] text-[var(--muted)] uppercase">
              {stageLabel}
            </span>
          </div>
          <span className="text-[11px] text-[var(--muted)]">
            Catalogue actif
          </span>
        </div>

        <div className="p-2 sm:p-4">
          <AnimatePresence mode="wait">
            {stage === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedFileUpload onFile={selectFile} />
              </motion.div>
            )}

            {(stage === "detecting" || stage === "analyzing") && (
              <motion.div
                key={stage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative grid min-h-[440px] place-items-center overflow-hidden rounded-[28px] bg-[var(--ink)] text-white"
              >
                {previewUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-[var(--ink)]/70" />
                  </>
                )}
                <div className="relative z-10 max-w-[340px] px-6 text-center">
                  <div className="mx-auto grid size-16 place-items-center rounded-[22px] border border-white/15 bg-white/10 backdrop-blur-md">
                    <LoaderCircle className="size-6 animate-spin" strokeWidth={1.7} />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
                    {stage === "detecting"
                      ? "Nous cherchons la pièce"
                      : "Comparaison au catalogue"}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {stage === "detecting"
                      ? "Préparation d’une zone que vous pourrez vérifier avant l’analyse."
                      : "DINOv2 transforme la photo puis classe les références les plus similaires."}
                  </p>
                </div>
              </motion.div>
            )}

            {stage === "crop" && crop && (
              <motion.div
                key="crop"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="py-2"
              >
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[var(--accent)] uppercase">
                      <Focus className="size-4" />
                      Étape de contrôle
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
                      La pièce est-elle bien cadrée ?
                    </h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Déplacez le carré ou tirez sa poignée. Gardez peu de fond.
                    </p>
                  </div>
                  <Badge className={detected ? "text-[var(--success)]" : ""}>
                    {detected ? "Zone détectée automatiquement" : "Zone initiale à corriger"}
                  </Badge>
                </div>

                <CropEditor
                  src={previewUrl}
                  imageSize={imageSize}
                  crop={crop}
                  onChange={setCrop}
                />

                <div
                  className="mx-auto mt-4 flex w-fit items-center gap-1 rounded-full border border-[var(--line)] bg-white/80 p-1 shadow-sm"
                  aria-label="Contrôles du recadrage"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Réduire la zone"
                    onClick={() => resizeCrop(0.86)}
                  >
                    <Minus className="size-3.5" />
                    <span className="hidden sm:inline">Réduire</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={centerCrop}
                  >
                    <LocateFixed className="size-3.5" />
                    Recentrer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Agrandir la zone"
                    onClick={() => resizeCrop(1.16)}
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Agrandir</span>
                  </Button>
                </div>

                <div className="mt-4 flex flex-col-reverse gap-3 sm:mt-6 sm:flex-row sm:justify-between">
                  <Button variant="ghost" onClick={reset}>
                    <ArrowLeft className="size-4" />
                    Changer de photo
                  </Button>
                  <Button onClick={analyze}>
                    <Check className="size-4" />
                    Confirmer et analyser
                  </Button>
                </div>
              </motion.div>
            )}

            {stage === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-2"
              >
                <ResultSummary
                  result={result}
                  previewUrl={result.pedagogy.crop_data_url}
                  onReset={reset}
                />
                {pedagogy && <PedagogyDetails result={result} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mx-auto mt-4 max-w-[720px] rounded-[18px] border border-red-900/10 bg-red-50 px-4 py-3 text-center text-sm text-[var(--danger)]"
        >
          {error}
        </motion.div>
      )}

      <footer className="mx-auto mt-6 flex max-w-[760px] items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--muted)]">
        <ShieldCheck className="size-3.5 shrink-0" />
        La photo est traitée pour l’analyse et n’est pas enregistrée par
        l’interface.
      </footer>
    </>
  );
}
