"use client";
import type { Activity } from "@/lib/types";

const COLORS = ["var(--rose)", "var(--peach)", "var(--rose-soft)", "var(--peach-soft)"];

/** Roue de la fortune en SVG. La rotation est pilotée de l'extérieur (pour être identique sur les 2 téléphones). */
export function Wheel({ items, rotation, spinning }: { items: Activity[]; rotation: number; spinning: boolean }) {
  const n = Math.max(items.length, 1);
  const seg = 360 / n;
  const r = 100;
  const emojiSize = n > 24 ? 9 : n > 14 ? 12 : n > 8 ? 15 : 20;

  const slice = (i: number) => {
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const large = seg > 180 ? 1 : 0;
    if (n === 1) return `M ${r} 0 A ${r} ${r} 0 1 1 ${r - 0.01} 0 Z`;
    return `M 0 0 L ${r * Math.cos(a0)} ${r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      {/* pointeur */}
      <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 text-3xl drop-shadow">🔻</div>
      <svg
        viewBox="-105 -105 210 210"
        className="h-full w-full drop-shadow-[0_8px_20px_rgba(224,96,126,0.35)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 4.2s cubic-bezier(0.12, 0.8, 0.18, 1)" : "none",
        }}
      >
        <circle r={104} fill="var(--card)" stroke="var(--line)" strokeWidth={2} />
        {items.map((it, i) => {
          const mid = ((i + 0.5) * seg - 90) * (Math.PI / 180);
          const tx = 70 * Math.cos(mid);
          const ty = 70 * Math.sin(mid);
          return (
            <g key={it.id}>
              <path d={slice(i)} fill={COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth={1} />
              <text
                x={tx}
                y={ty}
                fontSize={emojiSize}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${(i + 0.5) * seg} ${tx} ${ty})`}
              >
                {it.emoji}
              </text>
            </g>
          );
        })}
        <circle r={16} fill="var(--card)" stroke="var(--rose)" strokeWidth={3} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={14}>
          💞
        </text>
      </svg>
    </div>
  );
}

/** Calcule la rotation finale pour que le segment `index` s'arrête sous le pointeur. */
export function targetRotation(current: number, index: number, n: number) {
  const seg = 360 / n;
  const jitter = (Math.random() - 0.5) * seg * 0.6;
  const base = current - (((current % 360) + 360) % 360);
  return base + 360 * 6 + (360 - (index + 0.5) * seg) + jitter;
}
