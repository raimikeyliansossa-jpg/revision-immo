"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Answer, AnswerField, Outing, OutingRating, Photo, Profile, StepKey } from "@/lib/types";
import { MOODS, REVIEW_OPTIONS, capitalize, formatDate, toIso } from "@/lib/constants";
import { useApp, useBroadcastField, useDebouncedSave, useLive, useTyping } from "../Providers";
import { Button, Card, Empty, Media, TypingIndicator, cx, fullName, nameOf } from "../ui";
import type { PointCtx } from "./PointScreen";
import { RdvStep } from "./Rdv";
import { Recap } from "./Recap";

export function StepBody({ step, ctx }: { step: StepKey; ctx: PointCtx }) {
  switch (step) {
    case "relecture":
      return <RelectureStep ctx={ctx} />;
    case "sortie":
      return <SortieStep ctx={ctx} />;
    case "humeur":
      return <HumeurStep ctx={ctx} />;
    case "objectifs":
      return (
        <DuoText ctx={ctx} field="goals_review" label="Mes objectifs : atteints ou pas, et pourquoi ?" placeholder="Cette semaine, j'ai…" rows={7} />
      );
    case "bilan":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="good_things" label="🌟 Ce qu'on a fait de bien (au moins un truc positif chez l'autre)" placeholder="J'ai adoré quand tu…" rows={5} />
          <DuoText ctx={ctx} field="less_good" label="🌧️ Ce qui a moins bien marché (en « je »)" placeholder="Je me suis senti·e…" rows={5} />
        </div>
      );
    case "prochaine":
      return (
        <div className="flex flex-col gap-5">
          <DuoText ctx={ctx} field="next_improvement" label="🛠️ Mon amélioration (une seule, concrète)" placeholder="Je vais…" rows={3} hint="Elle sera relue au prochain point 🔁" />
          <DuoText ctx={ctx} field="next_goals" label="🎯 Mes objectifs pour la semaine prochaine" placeholder="1. …" rows={5} />
        </div>
      );
    case "outfits":
      return <OutfitsStep ctx={ctx} />;
    case "rdv":
      return <RdvStep ctx={ctx} />;
    case "recap":
      return <Recap pointId={ctx.point.id} celebrate />;
  }
}

// ---------------------------------------------------------------------
// Deux colonnes côte à côte : moi | l'autre
// ---------------------------------------------------------------------

function Duo({
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

function Column({ profile, mine, typing, children }: { profile: Profile; mine?: boolean; typing?: boolean; children: React.ReactNode }) {
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

function DuoText({
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

// ---------------------------------------------------------------------
// 1. Relecture
// ---------------------------------------------------------------------

function RelectureStep({ ctx }: { ctx: PointCtx }) {
  const theirsStatus = useLive(ctx.partner.id, "ans:review_status", ctx.theirs.review_status);
  if (!ctx.prev.exists)
    return (
      <Card className="py-10 text-center">
        <div className="pop text-6xl">🎉</div>
        <p className="mt-3 font-display text-2xl font-semibold">Rien à relire, bienvenue !</p>
        <p className="mt-1 text-sm text-muted">C&apos;est votre tout premier point. Que l&apos;aventure commence 💞</p>
      </Card>
    );

  const block = (a: Answer | null) => (
    <div className="flex flex-col gap-2 text-sm">
      <div>
        <p className="text-xs font-semibold text-muted">🛠️ Amélioration</p>
        <p className="whitespace-pre-wrap break-words">{a?.next_improvement || <i className="text-muted">Aucune</i>}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">🎯 Objectifs</p>
        <p className="whitespace-pre-wrap break-words">{a?.next_goals || <i className="text-muted">Aucun</i>}</p>
      </div>
    </div>
  );

  const choices = (value: Answer["review_status"], onPick?: (v: Answer["review_status"]) => void) => (
    <div className="flex flex-col gap-1.5">
      {REVIEW_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(o.value)}
          data-testid={onPick ? `review-${o.value}` : undefined}
          className={cx(
            "rounded-xl px-2 py-2 text-left text-sm font-medium transition",
            value === o.value ? "bg-rose text-white" : "bg-cream text-ink",
            !onPick && value !== o.value && "opacity-40",
          )}
        >
          {o.emoji} {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Duo ctx={ctx} label="Ce que vous vous étiez fixé" mine={block(ctx.prev.mine)} theirs={block(ctx.prev.theirs)} />
      <Duo
        ctx={ctx}
        label="Mon amélioration, je l'ai…"
        mine={choices(ctx.mine.review_status, (v) => ctx.setMine("review_status", v))}
        theirs={choices(theirsStatus)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// 2. Notre dernière sortie
// ---------------------------------------------------------------------

function SortieStep({ ctx }: { ctx: PointCtx }) {
  const { on } = useApp();
  const [outings, setOutings] = useState<Outing[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase()
      .from("outings")
      .select("*")
      .not("activity_id", "is", null)
      .or(`and(status.eq.prevue,date.lte.${ctx.point.week_date}),reviewed_point_id.eq.${ctx.point.id}`)
      .order("date");
    setOutings((data || []).filter((o: Outing) => o.status !== "prevue" || o.point_id !== ctx.point.id));
  }, [ctx.point.id, ctx.point.week_date]);
  useEffect(() => {
    load();
    const offs = [on("db:outings", load), on("resync", load)];
    return () => offs.forEach((o) => o());
  }, [load, on]);

  if (!outings) return null;
  if (outings.length === 0) return <Empty emoji="🎟️">Pas de sortie à relire cette fois-ci.</Empty>;
  return (
    <div className="flex flex-col gap-4">
      {outings.map((o) => (
        <OutingReview key={o.id} outing={o} ctx={ctx} />
      ))}
    </div>
  );
}

function OutingReview({ outing, ctx }: { outing: Outing; ctx: PointCtx }) {
  const { on, track, userId, hint } = useApp();
  const sb = supabase();
  const [ratings, setRatings] = useState<Record<string, OutingRating>>({});
  const [mine, setMineState] = useState<{ score: number | null; comment: string } | null>(null);
  const broadcast = useBroadcastField();

  const load = useCallback(async () => {
    const { data } = await sb.from("outing_ratings").select("*").eq("outing_id", outing.id);
    const map = Object.fromEntries((data || []).map((r: OutingRating) => [r.user_id, r]));
    setRatings(map);
    setMineState((cur) => cur ?? { score: map[userId!]?.score ?? null, comment: map[userId!]?.comment ?? "" });
  }, [outing.id, sb, userId]);

  useEffect(() => {
    load();
    return on("db:outing_ratings", (p) => {
      if (p.new?.outing_id === outing.id) setRatings((cur) => ({ ...cur, [p.new.user_id]: p.new }));
    });
  }, [load, on, outing.id]);

  const { queue } = useDebouncedSave<{ score?: number | null; comment?: string }>((patch) =>
    sb.from("outing_ratings").upsert({
      outing_id: outing.id,
      user_id: userId,
      couple_id: outing.couple_id,
      score: patch.score !== undefined ? patch.score : (mineRef.score ?? null),
      comment: patch.comment !== undefined ? patch.comment : mineRef.comment,
      updated_at: new Date().toISOString(),
    }),
  );
  const mineRef = mine || { score: null, comment: "" };

  function edit(patch: { score?: number; comment?: string }) {
    const next = { ...mineRef, ...patch };
    setMineState(next);
    for (const [k, v] of Object.entries(patch)) broadcast(`rating:${outing.id}:${k}`, v);
    queue(next);
  }

  const theirsDb = ratings[ctx.partner.id];
  const theirScore = useLive(ctx.partner.id, `rating:${outing.id}:score`, theirsDb?.score ?? null);
  const theirComment = useLive(ctx.partner.id, `rating:${outing.id}:comment`, theirsDb?.comment ?? "");
  const typing = useTyping(ctx.partner.id);

  async function setStatus(status: Outing["status"]) {
    await track(
      Promise.resolve(
        sb
          .from("outings")
          .update({ status, reviewed_point_id: status === "prevue" ? null : ctx.point.id })
          .eq("id", outing.id),
      ),
    );
    hint("outings");
  }

  return (
    <Card className="p-4">
      <p className="text-[15px]">
        <b>{capitalize(formatDate(outing.date))}</b> vous aviez prévu :
      </p>
      <p className="my-2 font-display text-2xl font-semibold">
        {outing.activity_name} {outing.activity_emoji}
      </p>
      {outing.status === "prevue" && (
        <>
          <p className="mb-3 text-muted">C&apos;était comment ?</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setStatus("faite")} data-testid="outing-done">
              On l&apos;a faite ✅
            </Button>
            <Button variant="soft" className="flex-1" onClick={() => setStatus("pas_faite")}>
              Pas faite
            </Button>
          </div>
        </>
      )}
      {outing.status === "pas_faite" && (
        <div className="rounded-2xl bg-cream p-3 text-sm">
          🎡 Pas faite : l&apos;activité retourne dans la roulette.
          <button className="ml-2 text-rose underline" onClick={() => setStatus("prevue")}>
            Annuler
          </button>
        </div>
      )}
      {outing.status === "faite" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Column profile={ctx.me} mine>
              <ScoreInput value={mineRef.score} onChange={(v) => edit({ score: v })} />
              <textarea
                rows={3}
                placeholder="Un petit mot…"
                value={mineRef.comment}
                onChange={(e) => edit({ comment: e.target.value })}
                className="w-full rounded-2xl bg-cream px-3 py-2 text-[15px] outline-none ring-rose/40 focus:ring-2"
              />
            </Column>
            <Column profile={ctx.partner} typing={typing === `rating:${outing.id}:comment`}>
              <p className="text-center font-display text-3xl font-semibold text-rose">
                {theirScore ?? "–"}
                <span className="text-base text-muted">/10</span>
              </p>
              <p className="whitespace-pre-wrap break-words text-[15px]">{theirComment || <i className="text-muted">…</i>}</p>
            </Column>
          </div>
          <p className="text-xs text-muted">
            ✓ Ajoutée à l&apos;historique de vos sorties.{" "}
            <button className="text-rose underline" onClick={() => setStatus("prevue")}>
              Annuler
            </button>
          </p>
        </div>
      )}
    </Card>
  );
}

function ScoreInput({ value, onChange, testId }: { value: number | null; onChange: (v: number) => void; testId?: string }) {
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

// ---------------------------------------------------------------------
// 3. Humeur et note
// ---------------------------------------------------------------------

function HumeurStep({ ctx }: { ctx: PointCtx }) {
  const theirMood = useLive(ctx.partner.id, "ans:mood", ctx.theirs.mood);
  const theirScore = useLive(ctx.partner.id, "ans:week_score", ctx.theirs.week_score);
  return (
    <div className="flex flex-col gap-4">
      <Duo
        ctx={ctx}
        label="Mon humeur"
        mine={
          <div className="grid grid-cols-4 gap-1">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => ctx.setMine("mood", m)}
                data-testid={`mood-${m}`}
                className={cx(
                  "aspect-square rounded-xl text-2xl transition",
                  ctx.mine.mood === m ? "scale-110 bg-rose-soft ring-2 ring-rose" : "bg-cream",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        }
        theirs={
          <div className="flex h-full items-center justify-center py-2 text-6xl" data-testid="theirs-mood">
            {theirMood ? <span key={theirMood} className="pop">{theirMood}</span> : <span className="text-2xl text-muted">…</span>}
          </div>
        }
      />
      <Duo
        ctx={ctx}
        label="Ma note de la semaine"
        mine={<ScoreInput value={ctx.mine.week_score} onChange={(v) => ctx.setMine("week_score", v)} testId="mine-score" />}
        theirs={
          <p className="py-2 text-center font-display text-4xl font-semibold text-rose" data-testid="theirs-score">
            {theirScore ?? "–"}
            <span className="text-base text-muted">/10</span>
          </p>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// 7. Outfits de la semaine
// ---------------------------------------------------------------------

function OutfitsStep({ ctx }: { ctx: PointCtx }) {
  const { on } = useApp();
  const [outfits, setOutfits] = useState<Photo[]>([]);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const load = useCallback(async () => {
    // La semaine du point : du lundi au dimanche du point, selon le jour où la tenue a été portée
    const start = new Date(ctx.point.week_date + "T12:00:00");
    start.setDate(start.getDate() - 6);
    const { data } = await supabase()
      .from("outfits")
      .select("*")
      .gte("worn_on", toIso(start))
      .lte("worn_on", ctx.point.week_date)
      .order("worn_on")
      .order("created_at");
    setOutfits(data || []);
  }, [ctx.point.week_date]);
  useEffect(() => {
    load();
    return on("db:outfits", load);
  }, [load, on]);

  return (
    <div className="flex flex-col gap-5">
      {[ctx.me, ctx.partner].map((p) => {
        const list = outfits.filter((o) => o.user_id === p.id);
        return (
          <section key={p.id}>
            <h2 className="mb-2 text-lg font-semibold">{fullName(p)}</h2>
            {list.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted">Pas d&apos;outfit posté cette semaine 👀</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {list.map((o) => (
                  <button key={o.id} onClick={() => setZoom(o)} className="overflow-hidden rounded-2xl">
                    <Media path={o.path} className="aspect-[3/4] w-full" />
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {zoom && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Media path={zoom.path} full className="max-h-[80dvh] w-auto max-w-full rounded-2xl !object-contain" />
          </div>
          {zoom.caption && <p className="mt-3 text-white">{zoom.caption}</p>}
          <p className="mt-1 text-sm text-white/70">{capitalize(formatDate(zoom.worn_on || zoom.created_at))}</p>
        </div>
      )}
    </div>
  );
}
