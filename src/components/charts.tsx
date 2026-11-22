"use client";
import { useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: number[];
  type?: "line" | "area" | "bar";
  axis?: "left" | "right";
  dashed?: boolean;
  fmt?: (n: number) => string;
}

export const compact = (n: number) =>
  n >= 1e7
    ? +(n / 1e7).toFixed(1) + "Cr"
    : n >= 1e5
      ? +(n / 1e5).toFixed(1) + "L"
      : n >= 1e3
        ? +(n / 1e3).toFixed(1) + "k"
        : String(Math.round(n * 10) / 10);
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)),
    f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

interface ChartProps {
  title: string;
  labels: string[];
  series: Series[];
  leftFmt?: (n: number) => string;
  rightFmt?: (n: number) => string;
}

export function Chart({
  title,
  labels,
  series,
  leftFmt = compact,
  rightFmt = compact,
}: ChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640,
    H = 250,
    hasRight = series.some((s) => s.axis === "right"),
    band = series.some((s) => s.type === "bar");
  const ml = 54,
    mr = hasRight ? 54 : 14,
    mt = 14,
    mb = 28,
    iw = W - ml - mr,
    ih = H - mt - mb,
    n = labels.length;
  const axisMax = (ax: "left" | "right") =>
    niceMax(
      Math.max(
        0,
        ...series
          .filter((s) => (s.axis ?? "left") === ax)
          .flatMap((s) => s.values),
      ),
    );
  const maxL = axisMax("left"),
    maxR = axisMax("right");
  const x = (i: number) =>
    band
      ? ml + ((i + 0.5) * iw) / n
      : n <= 1
        ? ml + iw / 2
        : ml + (i * iw) / (n - 1);
  const y = (v: number, ax: "left" | "right") =>
    mt + ih - (v / (ax === "right" ? maxR : maxL)) * ih;
  const path = (s: Series) =>
    s.values
      .map(
        (v, i) =>
          `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v, s.axis ?? "left").toFixed(1)}`,
      )
      .join("");
  const ticks = [0, 1, 2, 3, 4];
  const xTicks =
    n <= 6
      ? labels.map((_, i) => i)
      : [...new Set([0, 1, 2, 3, 4].map((k) => Math.round((k * (n - 1)) / 4)))];
  const move = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect(),
      px = ((e.clientX - r.left) / r.width) * iw;
    const i = band
      ? Math.floor(px / (iw / n))
      : Math.round(px / (iw / Math.max(n - 1, 1)));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  const pctLeft = hover === null ? 0 : (x(hover) / W) * 100;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-sm"
              style={{
                background: s.dashed ? "transparent" : s.color,
                borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
              }}
            />
            {s.name}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={title}
        >
          {ticks.map((t) => {
            const yy = mt + ih - (t / 4) * ih;
            return (
              <g key={t}>
                <line
                  x1={ml}
                  x2={W - mr}
                  y1={yy}
                  y2={yy}
                  stroke="var(--line)"
                  strokeWidth="1"
                />
                <text
                  x={ml - 8}
                  y={yy + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--muted)"
                >
                  {leftFmt((maxL * t) / 4)}
                </text>
                {hasRight && (
                  <text
                    x={W - mr + 8}
                    y={yy + 4}
                    fontSize="11"
                    fill="var(--muted)"
                  >
                    {rightFmt((maxR * t) / 4)}
                  </text>
                )}
              </g>
            );
          })}
          {xTicks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted)"
            >
              {labels[i]}
            </text>
          ))}
          {series.map((s) => {
            const ax = s.axis ?? "left";
            if (s.type === "bar")
              return s.values.map((v, i) => (
                <rect
                  key={i}
                  x={x(i) - (iw / n) * 0.3}
                  width={(iw / n) * 0.6}
                  y={y(v, ax)}
                  height={mt + ih - y(v, ax)}
                  rx="2"
                  fill={s.color}
                  opacity={hover === i ? 1 : 0.8}
                />
              ));
            return (
              <g key={s.name}>
                {s.type === "area" && (
                  <path
                    d={`${path(s)}L${x(n - 1)} ${mt + ih}L${x(0)} ${mt + ih}Z`}
                    fill={s.color}
                    opacity="0.12"
                  />
                )}
                <path
                  d={path(s)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.dashed ? 1.5 : 2.2}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {hover !== null && (
            <>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={mt}
                y2={mt + ih}
                stroke="var(--muted)"
                strokeDasharray="3 3"
              />
              {series
                .filter((s) => s.type !== "bar")
                .map((s) => (
                  <circle
                    key={s.name}
                    cx={x(hover)}
                    cy={y(s.values[hover], s.axis ?? "left")}
                    r="3.5"
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth="1.5"
                  />
                ))}
            </>
          )}
          <rect
            x={ml}
            y={mt}
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={move}
            onPointerDown={move}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-line bg-surface p-2.5 text-xs shadow-lg"
            style={{
              left: `${pctLeft}%`,
              transform: pctLeft > 70 ? "translateX(-105%)" : "translateX(8%)",
            }}
          >
            <p className="mb-1 font-semibold text-ink">{labels[hover]}</p>
            {series.map((s) => (
              <p
                key={s.name}
                className="flex items-center justify-between gap-3 text-muted"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.name}
                </span>
                <span className="font-medium text-ink">
                  {(s.fmt ?? compact)(s.values[hover])}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) return null;
  const w = 96,
    h = 28,
    min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
