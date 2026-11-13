"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Couple, Profile } from "@/lib/types";

type Listener = (payload: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
export type SaveState = "idle" | "saving" | "saved" | "error";
export type ThemePref = "auto" | "clair" | "sombre";

type Ctx = {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  me: Profile | null;
  partner: Profile | null;
  couple: Couple | null;
  pointsDone: number;
  online: Set<string>;
  connected: boolean;
  reload: () => Promise<void>;
  on: (event: string, cb: Listener) => () => void;
  send: (event: string, payload: Record<string, unknown>) => void;
  /** Prévient l'autre téléphone qu'une table a changé (plus rapide que l'événement de la base). */
  hint: (table: string, payload?: Record<string, unknown>) => void;
  saveState: SaveState;
  track: <T>(p: PromiseLike<T>) => Promise<T>;
  toast: (msg: string) => void;
  themePref: ThemePref;
  setThemePref: (t: ThemePref) => void;
  dark: boolean;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp hors du Provider");
  return c;
}

const TABLES = ["points", "point_answers", "outings", "outing_ratings", "outfits", "outfit_reactions", "memories", "activities", "profiles"];

export function Providers({ children }: { children: React.ReactNode }) {
  const sb = supabase();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [pointsDone, setPointsDone] = useState(0);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [themePref, setThemePrefState] = useState<ThemePref>("auto");
  const [dark, setDark] = useState(false);

  const listeners = useRef(new Map<string, Set<Listener>>());
  const toasted = useRef(new Set<string>());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inflight = useRef(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = session?.user.id ?? null;
  const meRef = useRef<Profile | null>(null);
  const partnerRef = useRef<Profile | null>(null);
  meRef.current = me;
  partnerRef.current = partner;

  const emit = useCallback((event: string, payload: unknown) => {
    listeners.current.get(event)?.forEach((cb) => cb(payload));
  }, []);

  const on = useCallback((event: string, cb: Listener) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event)!.add(cb);
    return () => {
      listeners.current.get(event)?.delete(cb);
    };
  }, []);

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const hint = useCallback(
    (table: string, payload?: Record<string, unknown>) => send("db-hint", { table, payload: payload ?? { hint: true } }),
    [send],
  );

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const track = useCallback(async <T,>(p: PromiseLike<T>): Promise<T> => {
    inflight.current++;
    setSaveState("saving");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    try {
      const r = await p;
      const err = (r as { error?: unknown } | null)?.error;
      inflight.current--;
      if (err) {
        setSaveState("error");
        return r;
      }
      if (inflight.current === 0) setSaveState("saved");
      return r;
    } catch (e) {
      inflight.current--;
      setSaveState("error");
      throw e;
    }
  }, []);

  // ---------- Thème ----------
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme") as ThemePref | null;
      if (t === "clair" || t === "sombre" || t === "auto") setThemePrefState(t);
    } catch {}
  }, []);
  const setThemePref = useCallback((t: ThemePref) => {
    setThemePrefState(t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, []);
  useEffect(() => {
    const compute = () => {
      if (themePref === "clair") return false;
      if (themePref === "sombre") return true;
      const now = new Date();
      const sundayEvening = now.getDay() === 0 && now.getHours() >= 18;
      return sundayEvening || window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const apply = () => {
      const d = compute();
      setDark(d);
      document.documentElement.classList.toggle("dark", d);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", d ? "#1E1517" : "#FFF8F0");
    };
    apply();
    const i = setInterval(apply, 60_000);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => {
      clearInterval(i);
      mq.removeEventListener("change", apply);
    };
  }, [themePref]);

  // ---------- Service worker ----------
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // ---------- Authentification ----------
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession((prev) => (prev?.access_token === s?.access_token ? prev : s));
      if (!s) {
        setMe(null);
        setPartner(null);
        setCouple(null);
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const { data: profiles } = await sb.from("profiles").select("*");
    const mine = (profiles || []).find((p) => p.id === userId) || null;
    setMe(mine);
    if (mine?.couple_id) {
      setPartner((profiles || []).find((p) => p.id !== userId && p.couple_id === mine.couple_id) || null);
      const { data: c } = await sb.from("couples").select("*").eq("id", mine.couple_id).maybeSingle();
      setCouple(c);
      const { count } = await sb
        .from("points")
        .select("id", { count: "exact", head: true })
        .eq("status", "termine");
      setPointsDone(count || 0);
    } else {
      setPartner(null);
      setCouple(null);
    }
    setReady(true);
  }, [sb, userId]);

  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  // ---------- Canal temps réel du couple ----------
  const coupleId = couple?.id;
  useEffect(() => {
    if (!coupleId || !userId) return;
    let cancelled = false;
    let ch: RealtimeChannel | null = null;
    (async () => {
      await sb.realtime.setAuth();
      if (cancelled) return;
      ch = sb.channel(`couple:${coupleId}`, {
        config: { private: true, presence: { key: userId }, broadcast: { self: false } },
      });
      for (const table of TABLES) {
        ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `couple_id=eq.${coupleId}` }, (p) =>
          emit(`db:${table}`, p),
        );
      }
      ch.on("postgres_changes", { event: "*", schema: "public", table: "couples", filter: `id=eq.${coupleId}` }, (p) =>
        emit("db:couples", p),
      );
      ch.on("broadcast", { event: "*" }, (msg) => {
        if (msg.event === "db-hint") emit(`db:${msg.payload.table}`, msg.payload.payload);
        else emit(`bc:${msg.event}`, msg.payload);
      });
      ch.on("presence", { event: "sync" }, () => {
        const ids = Object.keys(ch!.presenceState());
        setOnline(new Set(ids));
        // Quelqu'un de nouveau est connecté (ex : ta moitié vient de rejoindre) → on recharge les profils
        if (ids.some((id) => id !== userId && id !== partnerRef.current?.id)) emit("unknown-presence", null);
      });
      ch.subscribe(async (status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          await ch!.track({ since: Date.now() });
          emit("resync", null);
        }
      });
      channelRef.current = ch;
    })();
    return () => {
      cancelled = true;
      if (ch) sb.removeChannel(ch);
      channelRef.current = null;
      setConnected(false);
    };
  }, [coupleId, userId, sb, emit]);

  // Profils / couple / compteur mis à jour en direct
  useEffect(() => {
    const offs = [
      on("db:profiles", () => reload()),
      on("unknown-presence", () => reload()),
      on("db:couples", () => reload()),
      on("db:points", (p) => {
        if (p.new?.status !== p.old?.status) reload();
      }),
      on("db:outfits", (p) => {
        if (p.eventType === "INSERT" && p.new.user_id !== meRef.current?.id && !toasted.current.has(p.new.id)) {
          toasted.current.add(p.new.id);
          const who = partnerRef.current;
          toast(`👗 ${who?.display_name || "Ta moitié"} vient de poster un outfit !`);
        }
      }),
      on("db:outfit_reactions", (p) => {
        const n = p.new;
        if (!n || n.user_id === meRef.current?.id || (p.eventType !== "INSERT" && p.eventType !== "UPDATE")) return;
        const key = `${n.outfit_id}:${n.emoji}:${n.comment}`;
        if (toasted.current.has(key) || (!n.emoji && !n.comment)) return;
        toasted.current.add(key);
        const who = partnerRef.current;
        toast(`${n.emoji || "💬"} ${who?.display_name || "Ta moitié"} a réagi à ton outfit !`);
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [on, reload, toast]);

  // Retour au premier plan (iPhone) : on resynchronise
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        emit("resync", null);
        reload();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [emit, reload]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      session,
      userId,
      me,
      partner,
      couple,
      pointsDone,
      online,
      connected,
      reload,
      on,
      send,
      hint,
      saveState,
      track,
      toast,
      themePref,
      setThemePref,
      dark,
    }),
    [ready, session, userId, me, partner, couple, pointsDone, online, connected, reload, on, send, hint, saveState, track, toast, themePref, setThemePref, dark],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast pointer-events-auto rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-cream shadow-lg">
            {t.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}

// ---------------------------------------------------------------------
// Petits hooks temps réel
// ---------------------------------------------------------------------

/** Valeur d'un champ de l'autre : la frappe en direct (broadcast) prime quelques secondes sur la base. */
export function useLive<T>(userId: string | undefined, key: string, dbValue: T): T {
  const { on } = useApp();
  const [live, setLive] = useState<{ v: T; ts: number } | null>(null);
  useEffect(
    () =>
      on("bc:field", (p: { user: string; key: string; value: T }) => {
        if (p.user === userId && p.key === key) setLive({ v: p.value, ts: Date.now() });
      }),
    [on, userId, key],
  );
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setLive(null), 3000);
    return () => clearTimeout(t);
  }, [live]);
  return live ? live.v : dbValue;
}

/** Indique si l'autre est en train d'écrire (renvoie la clé du champ ou null). */
export function useTyping(userId: string | undefined): string | null {
  const { on } = useApp();
  const [key, setKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () =>
      on("bc:typing", (p: { user: string; key: string }) => {
        if (p.user !== userId) return;
        setKey(p.key);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setKey(null), 2500);
      }),
    [on, userId],
  );
  return key;
}

/** Envoie ma frappe en direct + signal « écrit… » (limité à 1 / 300 ms). */
export function useBroadcastField() {
  const { send, userId } = useApp();
  const lastTyping = useRef(0);
  return useCallback(
    (key: string, value: unknown) => {
      send("field", { user: userId, key, value });
      const now = Date.now();
      if (now - lastTyping.current > 800) {
        lastTyping.current = now;
        send("typing", { user: userId, key });
      }
    },
    [send, userId],
  );
}

/** Sauvegarde différée : regroupe les modifications et enregistre après une pause. */
export function useDebouncedSave<P extends Record<string, unknown>>(
  saveFn: (patch: P) => PromiseLike<{ error: unknown }>,
  delay = 500,
) {
  const { track } = useApp();
  const patchRef = useRef<Partial<P>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(saveFn);
  fnRef.current = saveFn;

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = patchRef.current;
    if (Object.keys(patch).length === 0) return;
    patchRef.current = {};
    track(Promise.resolve(fnRef.current(patch as P)));
  }, [track]);

  const queue = useCallback(
    (patch: Partial<P>) => {
      patchRef.current = { ...patchRef.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(() => () => flush(), [flush]);
  return { queue, flush };
}
