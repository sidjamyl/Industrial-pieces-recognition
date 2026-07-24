"use client";

import { useRef, useState } from "react";
import { Maximize2, Move } from "lucide-react";

import type { CropBox } from "@/lib/recognition-types";

type Interaction = {
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  initial: CropBox;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function CropEditor({
  src,
  imageSize,
  crop,
  onChange,
}: {
  src: string;
  imageSize: [number, number];
  crop: CropBox;
  onChange: (box: CropBox) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<[number, number]>(imageSize);
  const [width, height] = naturalSize;

  const begin = (
    event: React.PointerEvent<HTMLDivElement>,
    mode: Interaction["mode"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initial: crop,
    });
  };

  const update = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const image = imageRef.current;
    if (!image) return;

    const scaleX = width / image.clientWidth;
    const scaleY = height / image.clientHeight;
    const deltaX = (event.clientX - interaction.startX) * scaleX;
    const deltaY = (event.clientY - interaction.startY) * scaleY;

    if (interaction.mode === "move") {
      onChange({
        ...interaction.initial,
        x: Math.round(
          clamp(
            interaction.initial.x + deltaX,
            0,
            width - interaction.initial.width,
          ),
        ),
        y: Math.round(
          clamp(
            interaction.initial.y + deltaY,
            0,
            height - interaction.initial.height,
          ),
        ),
      });
      return;
    }

    const maxSide = Math.min(
      width - interaction.initial.x,
      height - interaction.initial.y,
    );
    const side = Math.round(
      clamp(
        interaction.initial.width + Math.max(deltaX, deltaY),
        48,
        maxSide,
      ),
    );
    onChange({ ...interaction.initial, width: side, height: side });
  };

  const finish = (event: React.PointerEvent<HTMLDivElement>) => {
    if (interaction?.pointerId === event.pointerId) setInteraction(null);
  };

  return (
    <div className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[26px] bg-[#12171b] shadow-[0_24px_70px_rgba(11,18,24,0.18)]">
      {/* A plain img keeps the overlay in the exact coordinate space of the source. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt="Photo à recadrer"
        className="block h-auto max-h-[66vh] w-full object-contain"
        onLoad={(event) => {
          setNaturalSize([
            event.currentTarget.naturalWidth,
            event.currentTarget.naturalHeight,
          ]);
          setLoaded(true);
        }}
      />

      {loaded && (
        <>
          <div
            className="absolute touch-none cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(6,10,13,.58),0_10px_32px_rgba(0,0,0,.2)]"
            style={{
              left: `${(crop.x / width) * 100}%`,
              top: `${(crop.y / height) * 100}%`,
              width: `${(crop.width / width) * 100}%`,
              height: `${(crop.height / height) * 100}%`,
            }}
            onPointerDown={(event) => begin(event, "move")}
            onPointerMove={update}
            onPointerUp={finish}
            onPointerCancel={finish}
          >
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.06em] text-white uppercase backdrop-blur-md">
              <Move className="size-3" />
              Déplacer
            </span>
            <div
              className="absolute -right-3 -bottom-3 grid size-11 cursor-nwse-resize touch-none place-items-center rounded-full border-2 border-white bg-[var(--ink)] text-white shadow-lg"
              aria-label="Redimensionner la zone"
              onPointerDown={(event) => begin(event, "resize")}
              onPointerMove={update}
              onPointerUp={finish}
              onPointerCancel={finish}
            >
              <Maximize2 className="size-4" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
