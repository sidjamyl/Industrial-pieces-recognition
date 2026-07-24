"use client";

import { useRef, useState } from "react";
import { ImagePlus, ShieldCheck, UploadCloud } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

// Adapted for this product from SmoothUI's Animated File Upload component.
export function AnimatedFileUpload({
  onFile,
  disabled = false,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  const accept = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <motion.div
      layout
      animate={
        reduceMotion
          ? undefined
          : { scale: dragging ? 1.008 : 1, y: dragging ? -2 : 0 }
      }
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn(
        "fine-grid group relative grid min-h-[320px] cursor-pointer place-items-center overflow-hidden rounded-[28px] border border-dashed border-[var(--line)] bg-white/55 p-6 text-center outline-none transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 sm:min-h-[380px]",
        dragging && "border-[var(--accent)] bg-[var(--accent-soft)]/45",
        disabled && "pointer-events-none opacity-55",
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Choisir une photo de pièce"
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div className="relative z-10 max-w-[330px]">
        <motion.div
          className="mx-auto mb-6 grid size-16 place-items-center rounded-[22px] border border-white bg-white text-[var(--ink)] shadow-[0_14px_40px_rgba(20,33,44,0.12)]"
          animate={
            reduceMotion
              ? undefined
              : { rotate: dragging ? -4 : 0, scale: dragging ? 1.08 : 1 }
          }
          transition={{ type: "spring", stiffness: 360, damping: 24 }}
        >
          {dragging ? (
            <UploadCloud className="size-6" strokeWidth={1.7} />
          ) : (
            <ImagePlus className="size-6" strokeWidth={1.7} />
          )}
        </motion.div>
        <h2 className="text-xl font-semibold tracking-[-0.035em] sm:text-2xl">
          Photographiez une pièce
        </h2>
        <p className="mx-auto mt-3 max-w-[290px] text-sm leading-6 text-[var(--muted)]">
          Posez-la au centre de l’image, puis touchez ici ou déposez une photo.
        </p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-2 text-[11px] font-medium text-[var(--muted)] shadow-sm">
          <ShieldCheck className="size-3.5 text-[var(--success)]" />
          JPEG, PNG ou WebP · 20 Mo maximum
        </div>
      </div>
    </motion.div>
  );
}
