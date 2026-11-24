"use client";
import type { AnswerField, Profile } from "@/lib/types";
import { useLive } from "../Providers";
import { TypingIndicator, cx, fullName, nameOf } from "../ui";
import type { PointCtx } from "./PointScreen";

// ---------------------------------------------------------------------
// Deux colonnes côte à côte : moi | l'autre
// ---------------------------------------------------------------------

export function Duo({
  ctx,
  mine,
  theirs,
  label,
  typingKey,
}: {
  ctx: PointCtx;
  mine: React.ReactNode;
  theirs: React.ReactNode;
  label?: string;
  typingKey?: string;
}) {
  return (
    <section>
      {label && <h2 className="mb-2 font-sans text-[0.95rem] font-semibold leading-snug">{label}</h2>}
      <div className="grid grid-cols-2 gap-2">
        <Column profile={ctx.me} mine>
          {mine}
        </Column>
        <Column profile={ctx.partner} typing={!!typingKey && ctx.partnerTyping === typingKey}>
          {theirs}
        </Column>
      </div>
    </section>
  );
}

export function Column({ profile, mine, typing, children }: { profile: Profile; mine?: boolean; typing?: boolean; children: React.ReactNode }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-2 rounded-3xl border p-3", mine ? "border-rose/40 bg-card" : "border-line bg-peach-soft/50")}>
      <div className="flex min-h-5 items-center justify-between gap-1 text-xs font-semibold">
        <span className="truncate">{fullName(profile)}</span>
      </div>
      {children}
      <div className="min-h-4">{typing && <TypingIndicator name={nameOf(profile)} />}</div>
    </div>
  );
}

export function DuoText({
  ctx,
  field,
  label,
  placeholder,
  rows = 4,
  hint,
}: {
  ctx: PointCtx;
  field: AnswerField;
  label: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  const theirs = useLive(ctx.partner.id, `ans:${field}`, ctx.theirs[field] as string);
  return (
    <div>
      <Duo
        ctx={ctx}
        label={label}
        typingKey={`ans:${field}`}
        mine={
          <textarea
            value={(ctx.mine[field] as string) || ""}
            onChange={(e) => ctx.setMine(field, e.target.value)}
            placeholder={placeholder}
            rows={rows}
            data-testid={`mine-${field}`}
            className="w-full rounded-2xl bg-cream px-3 py-2 leading-snug outline-none ring-rose/40 focus:ring-2"
          />
        }
        theirs={
          <div
            className="min-h-[3rem] whitespace-pre-wrap break-words px-1 py-1 text-[15px] leading-snug"
            data-testid={`theirs-${field}`}
            style={{ minHeight: `${rows * 1.35}rem` }}
          >
            {theirs ? theirs : <span className="text-muted italic">…</span>}
          </div>
        }
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ScoreInput({ value, onChange, testId }: { value: number | null; onChange: (v: number) => void; testId?: string }) {
  return (
    <div>
      <p className="text-center font-display text-3xl font-semibold text-rose">
        {value ?? "–"}
        <span className="text-base text-muted">/10</span>
      </p>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={testId}
        className="w-full"
      />
    </div>
  );
}

