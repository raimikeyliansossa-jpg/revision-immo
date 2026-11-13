"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/photos";
import { useApp } from "./Providers";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "ghost" | "peach" | "danger" }) {
  const styles = {
    primary: "bg-rose text-white shadow-[0_6px_20px_-6px_var(--rose)] active:scale-[0.97]",
    peach: "bg-peach text-white shadow-[0_6px_20px_-6px_var(--peach)] active:scale-[0.97]",
    soft: "bg-rose-soft text-rose active:scale-[0.97]",
    ghost: "bg-transparent text-muted active:bg-line/50",
    danger: "bg-transparent text-[#c0392b] active:bg-line/50",
  }[variant];
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold transition disabled:opacity-50 disabled:active:scale-100",
        styles,
        className,
      )}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("rounded-3xl border border-line bg-card p-4 shadow-[0_2px_12px_-6px_rgba(74,44,42,0.15)]", className)} />;
}

export function PageHeader({ title, emoji, back = "/", right }: { title: string; emoji?: string; back?: string | null; right?: React.ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 bg-cream/90 px-4 pb-3 backdrop-blur">
      {back !== null && (
        <Link href={back} aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-xl shadow-sm">
          ‹
        </Link>
      )}
      <h1 className="flex-1 truncate text-2xl font-semibold">
        {emoji && <span className="mr-1">{emoji}</span>}
        {title}
      </h1>
      {right}
    </header>
  );
}

export function Page({ children, className, bottom = 2.5 }: { children: React.ReactNode; className?: string; bottom?: number }) {
  return (
    <main
      className={cx("mx-auto min-h-dvh w-full max-w-xl px-4", className)}
      style={{ paddingBottom: `calc(${bottom}rem + env(safe-area-inset-bottom))` }}
    >
      {children}
    </main>
  );
}

export function SaveBadge() {
  const { saveState } = useApp();
  if (saveState === "idle") return null;
  return (
    <span
      className={cx(
        "rounded-full px-2.5 py-1 text-xs font-medium transition",
        saveState === "saving" && "bg-line text-muted",
        saveState === "saved" && "bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-good",
        saveState === "error" && "bg-[#fde2e2] text-[#c0392b]",
      )}
    >
      {saveState === "saving" && "Enregistrement…"}
      {saveState === "saved" && "✓ Enregistré"}
      {saveState === "error" && "⚠️ Pas enregistré"}
    </span>
  );
}

export function OnlineDot({ userId }: { userId?: string | null }) {
  const { online } = useApp();
  const on = !!userId && online.has(userId);
  return (
    <span
      title={on ? "Connecté·e" : "Hors ligne"}
      className={cx("inline-block h-2.5 w-2.5 rounded-full", on ? "bg-good pulse-ring" : "bg-line")}
    />
  );
}

export function TypingIndicator({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-rose">
      ✍️ {name} écrit
      <span className="typing-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </span>
  );
}

export function PhotoImg({ path, alt = "", className }: { path: string; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let ok = true;
    signedUrl(path).then((u) => ok && setUrl(u));
    return () => {
      ok = false;
    };
  }, [path]);
  if (!url) return <div className={cx("animate-pulse bg-line", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cx("object-cover", className)} loading="lazy" />;
}

/** Affiche une vidéo stockée (aperçu muet dans la grille, lecteur complet en grand). */
export function VideoClip({ path, className, full = false }: { path: string; className?: string; full?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let ok = true;
    signedUrl(path).then((u) => ok && setUrl(u));
    return () => {
      ok = false;
    };
  }, [path]);
  if (!url) return <div className={cx("animate-pulse bg-line", className)} />;
  if (full) return <video src={url} className={className} controls autoPlay playsInline />;
  // "#t=0.1" force l'affichage de la première image comme vignette (iPhone compris)
  return <video src={`${url}#t=0.1`} className={cx("object-cover", className)} muted playsInline preload="metadata" />;
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="safe-bottom pop max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-cream p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {title && <h2 className="mb-3 text-xl font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-2xl bg-line/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 rounded-xl px-2 py-2 text-sm font-medium transition",
            value === o.value ? "bg-card text-ink shadow-sm" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-muted">
      <span className="text-5xl">{emoji}</span>
      <div className="max-w-xs text-sm">{children}</div>
    </div>
  );
}

export function nameOf(p: { display_name?: string; emoji?: string } | null | undefined, fallback = "Ta moitié") {
  if (!p) return fallback;
  return p.display_name || fallback;
}

export function fullName(p: { display_name?: string; emoji?: string } | null | undefined, fallback = "Ta moitié") {
  if (!p) return fallback;
  return `${p.display_name || fallback} ${p.emoji || ""}`.trim();
}
