"use client";

interface SparklineCellProps {
  values: number[];
  type?: "line" | "bar";
  width?: number;
  height?: number;
  color?: string;
}

export function SparklineCell({
  values,
  type = "line",
  width = 80,
  height = 24,
  color = "#3b82f6",
}: SparklineCellProps) {
  if (values.length === 0) return <span className="text-gray-300">-</span>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;
  const innerH = height - padding * 2;
  const innerW = width - padding * 2;

  if (type === "bar") {
    const barWidth = Math.max(2, innerW / values.length - 1);
    const gap = 1;
    return (
      <svg width={width} height={height} className="inline-block align-middle">
        {values.map((v, i) => {
          const barH = ((v - min) / range) * innerH;
          const x = padding + i * (barWidth + gap);
          const y = height - padding - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(1, barH)}
              fill={color}
              rx={1}
              opacity={0.8}
            />
          );
        })}
      </svg>
    );
  }

  // Line chart
  const points = values
    .map((v, i) => {
      const x = padding + (i / Math.max(values.length - 1, 1)) * innerW;
      const y = height - padding - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill
  const firstX = padding;
  const lastX = padding + innerW;
  const areaPoints = `${firstX},${height - padding} ${points} ${lastX},${height - padding}`;

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {values.length > 0 && (
        <circle
          cx={padding + innerW}
          cy={
            height -
            padding -
            ((values[values.length - 1] - min) / range) * innerH
          }
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}
