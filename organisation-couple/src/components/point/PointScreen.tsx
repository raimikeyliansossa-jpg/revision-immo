"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, errMsg } from "@/lib/supabase";
import type { Answer, AnswerField, Point, Profile } from "@/lib/types";
import { STEP_META } from "@/lib/constants";
import { useApp, useBroadcastField, useDebouncedSave, useTyping } from "../Providers";
import { Button, OnlineDot, Page, SaveBadge, cx, nameOf } from "../ui";
import { StepBody } from "./steps";

export type PointCtx = {
  point: Point;
  me: Profile;
  partner: Profile;
  mine: Answer;
  theirs: Answer;
  prev: { mine: Answer | null; theirs: Answer | null; exists: boolean };
  setMine: (field: AnswerField, value: Answer[AnswerField]) => void;
  partnerTyping: string | null;
};

export function PointScreen({ pointId }: { pointId: string | null }) {
  const router = useRouter();
  const app = useApp();
  const { me, partner, on, send, toast, track } = app;
  const sb = supabase();

  const [point, setPoint] = useState<Point | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [prev, setPrev] = useState<PointCtx["prev"]>({ mine: null, theirs: null, exists: false });
  const [edits, setEdits] = useState<Partial<Answer>>({});
  const [error, setError] = useState<string | null>(null);
  const [readyBusy, setReadyBusy] = useState(false);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const lastStep = useRef<number | null>(null);
  const broadcastField = useBroadcastField();
  const partnerTyping = useTyping(partner?.id);

  // ---------- Chargement ----------
  const load = useCallback(async () => {
    let p: Point | null = null;
    if (pointId) {
      const { data } = await sb.from("points").select("*").eq("id", pointId).maybeSingle();
      p = data;
    } else {
      const { data, error } = await sb.rpc("start_point");
      if (error) return setError(errMsg(error));
      p = data;
    }
    if (!p) return setError("Point introuvable");
    setPoint(p);
    const { data: ans } = await sb.from("point_answers").select("*").eq("point_id", p.id);
    setAnswers(Object.fromEntries((ans || []).map((a: Answer) => [a.user_id, a])));
    // point précédent (pour la relecture)
    const { data: prevPoint } = await sb
      .from("points")
      .select("id")
      .lt("week_date", p.week_date)
      .order("week_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prevPoint) {
      const { data: pa } = await sb.from("point_answers").select("*").eq("point_id", prevPoint.id);
      setPrev({
        exists: true,
        mine: (pa || []).find((a: Answer) => a.user_id === me?.id) || null,
        theirs: (pa || []).find((a: Answer) => a.user_id !== me?.id) || null,
      });
    } else setPrev({ mine: null, theirs: null, exists: false });
  }, [pointId, sb, me?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Temps réel ----------
  // Quand l'étape change, les anciens « Prêt » ne comptent plus
  const clearReady = useCallback(
    () => setAnswers((cur) => Object.fromEntries(Object.entries(cur).map(([k, a]) => [k, { ...a, ready_step: null }]))),
    [],
  );

  useEffect(() => {
    if (!point) return;
    const pid = point.id;
    const offs = [
      on("db:points", (p) => {
        if (p.new?.id !== pid) return;
        setPoint((cur) => {
          if (cur && cur.current_step !== p.new.current_step) clearReady();
          return cur ? { ...cur, ...p.new } : p.new;
        });
      }),
      on("db:point_answers", (p) => {
        if (p.new?.point_id === pid) setAnswers((cur) => ({ ...cur, [p.new.user_id]: p.new }));
      }),
      on("bc:step", (p) => {
        if (p.point_id !== pid) return;
        setPoint((cur) => {
          if (cur && cur.current_step !== p.current_step) clearReady();
          return cur ? { ...cur, current_step: p.current_step, max_step: p.max_step, status: p.status } : cur;
        });
      }),
      on("bc:ready", (p) => {
        if (p.point_id !== pid) return;
        setAnswers((cur) => (cur[p.user] ? { ...cur, [p.user]: { ...cur[p.user], ready_step: p.ready_step } } : cur));
      }),
      on("resync", () => load()),
    ];
    return () => offs.forEach((o) => o());
  }, [point?.id, on, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Direction de l'animation lors d'un changement d'étape
  useEffect(() => {
    if (!point) return;
    if (lastStep.current !== null && lastStep.current !== point.current_step) {
      setDir(point.current_step > lastStep.current ? "fwd" : "back");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    lastStep.current = point.current_step;
  }, [point?.current_step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Mes réponses ----------
  const { queue, flush } = useDebouncedSave<Partial<Answer>>((patch) =>
    sb
      .from("point_answers")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("point_id", point!.id)
      .eq("user_id", me!.id),
  );

  const setMine = useCallback(
    (field: AnswerField, value: Answer[AnswerField]) => {
      setEdits((e) => ({ ...e, [field]: value }));
      broadcastField(`ans:${field}`, value);
      queue({ [field]: value } as Partial<Answer>);
    },
    [broadcastField, queue],
  );

  const ctx = useMemo<PointCtx | null>(() => {
    if (!point || !me || !partner) return null;
    const base = answers[me.id];
    const theirs = answers[partner.id];
    if (!base || !theirs) return null;
    return { point, me, partner, mine: { ...base, ...edits }, theirs, prev, setMine, partnerTyping };
  }, [point, me, partner, answers, edits, prev, setMine, partnerTyping]);

  if (error)
    return (
      <Page className="flex flex-col items-center justify-center gap-4 text-center">
        <span className="text-5xl">🙈</span>
        <p>{error}</p>
        <Button onClick={() => router.push("/")}>Retour à l&apos;accueil</Button>
      </Page>
    );
  if (!ctx) return <Page className="flex items-center justify-center text-5xl">💞</Page>;

  const step = ctx.point.steps[ctx.point.current_step];
  const meta = STEP_META[step];
  const isRecap = step === "recap";
  const iAmReady = ctx.mine.ready_step === ctx.point.current_step;
  const partnerReady = ctx.theirs.ready_step === ctx.point.current_step;

  async function toggleReady() {
    if (!ctx) return;
    flush();
    const ready = !iAmReady;
    const stepIdx = ctx.point.current_step;
    setReadyBusy(true);
    setAnswers((cur) => ({ ...cur, [ctx.me.id]: { ...cur[ctx.me.id], ready_step: ready ? stepIdx : null } }));
    send("ready", { point_id: ctx.point.id, user: ctx.me.id, ready_step: ready ? stepIdx : null });
    const { data, error } = await track(sb.rpc("set_ready", { p_point: ctx.point.id, p_step: stepIdx, p_ready: ready }));
    setReadyBusy(false);
    if (error) return toast(errMsg(error));
    if (data) {
      setPoint(data);
      if (data.current_step !== stepIdx)
        send("step", { point_id: data.id, current_step: data.current_step, max_step: data.max_step, status: data.status });
    }
  }

  async function goTo(idx: number) {
    if (!ctx || idx === ctx.point.current_step || idx > ctx.point.max_step) return;
    flush();
    const { data, error } = await sb.rpc("go_to_step", { p_point: ctx.point.id, p_step: idx });
    if (error) return toast(errMsg(error));
    setPoint(data);
    setAnswers((cur) => Object.fromEntries(Object.entries(cur).map(([k, a]) => [k, { ...a, ready_step: null }])));
    send("step", { point_id: data.id, current_step: data.current_step, max_step: data.max_step, status: data.status });
  }

  const partnerOnline = app.online.has(ctx.partner.id);

  return (
    <Page className="flex flex-col" bottom={11}>
      {/* En-tête : progression */}
      <header className="safe-top sticky top-0 z-30 -mx-4 bg-cream/90 px-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            aria-label="Accueil"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg shadow-sm"
          >
            ‹
          </button>
          <div className="flex flex-1 items-center gap-1.5 text-xs text-muted">
            <OnlineDot userId={ctx.partner.id} />
            {nameOf(ctx.partner)} {partnerOnline ? "est là" : "n'est pas connecté·e"}
          </div>
          <SaveBadge />
        </div>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Étapes">
          {ctx.point.steps.map((s, i) => (
            <button
              key={s}
              onClick={() => goTo(i)}
              disabled={i > ctx.point.max_step}
              aria-label={STEP_META[s].title}
              className={cx(
                "h-2 flex-1 rounded-full transition-all",
                i === ctx.point.current_step ? "bg-rose" : i <= ctx.point.max_step ? "bg-peach/60" : "bg-line",
              )}
            />
          ))}
        </div>
      </header>

      <div key={ctx.point.current_step} className={dir === "fwd" ? "step-in" : "step-in-back"}>
        <div className="mb-4 mt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Étape {ctx.point.current_step + 1} / {ctx.point.steps.length}
          </p>
          <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight" data-testid="step-title">
            <span className="mr-1">{meta.emoji}</span> {meta.title}
          </h1>
          <p className="text-sm text-muted">{meta.hint}</p>
        </div>
        <StepBody step={step} ctx={ctx} />
      </div>

      {/* Barre « Prêt ✓ » */}
      {!isRecap ? (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-4 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className={cx("font-medium", iAmReady ? "text-good" : "text-muted")}>
                {iAmReady ? "✓ Tu es prêt·e" : "Pas encore prêt·e"}
              </span>
              <span className={cx("font-medium", partnerReady ? "text-good" : "text-muted")} data-testid="partner-ready">
                {partnerReady ? `✓ ${nameOf(ctx.partner)} est prêt·e` : `${nameOf(ctx.partner)} réfléchit…`}
              </span>
            </div>
            <div className="flex gap-2">
              {ctx.point.current_step > 0 && (
                <Button variant="soft" className="px-4" onClick={() => goTo(ctx.point.current_step - 1)} aria-label="Étape précédente">
                  ‹
                </Button>
              )}
              <Button
                className={cx("flex-1 text-lg", iAmReady && "!bg-good")}
                onClick={toggleReady}
                disabled={readyBusy}
                data-testid="ready-btn"
              >
                {iAmReady ? (partnerReady ? "C'est parti…" : `On attend ${nameOf(ctx.partner)} ⏳`) : "Prêt ✓"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-4 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl gap-2">
            <Button variant="soft" className="px-4" onClick={() => goTo(ctx.point.current_step - 1)} aria-label="Étape précédente">
              ‹
            </Button>
            <Button className="flex-1" onClick={() => router.push("/")}>
              Terminer 💞
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
