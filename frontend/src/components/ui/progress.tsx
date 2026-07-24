import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-out"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
