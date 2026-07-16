interface SkeletonRowProps {
  /** Number of rows to render (default: 5) */
  count?: number;
  /** Width fractions for each column, e.g. ["40%","20%","20%","20%"] */
  widths?: string[];
}

export function SkeletonRow({ count = 5, widths = ["45%", "25%", "20%", "10%"] }: SkeletonRowProps) {
  return (
    <div className="w-full" role="status" aria-label="Loading…">
      {Array.from({ length: count }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border-light, rgba(255,255,255,0.06))" }}
        >
          {/* Leading avatar/icon placeholder */}
          <div
            className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full"
            style={{ background: "var(--surface-hover, rgba(255,255,255,0.06))" }}
          />
          {widths.map((width, colIdx) => (
            <div
              key={colIdx}
              className="animate-pulse rounded"
              style={{
                width,
                height: "12px",
                background: "var(--surface-hover, rgba(255,255,255,0.06))",
                animationDelay: `${rowIdx * 80 + colIdx * 30}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default SkeletonRow;
