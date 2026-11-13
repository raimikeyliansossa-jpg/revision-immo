"use client";
import { useState } from "react";
import { supabase, errMsg } from "@/lib/supabase";
import { useApp } from "./Providers";
import { Button, Card, Page } from "./ui";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session, me, couple } = useApp();
  if (!ready) return <Splash />;
  if (!session) return <Login />;
  if (!me?.couple_id || !couple) return <Onboarding />;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="pop text-6xl">💞</span>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(errMsg(error));
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("Code incorrect ou expiré. Réessaie 🙏");
  }

  return (
    <Page className="flex flex-col justify-center gap-6 py-10">
      <div className="text-center">
        <div className="pop mb-3 text-6xl">💞</div>
        <h1 className="text-4xl font-semibold leading-tight">Notre point du dimanche</h1>
        <p className="mt-2 text-muted">Chaque semaine, on fait le point. Ensemble.</p>
      </div>
      <Card className="p-5">
        {!sent ? (
          <form onSubmit={sendLink} className="flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor="email">
              Ton adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.fr"
              className="rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-rose"
            />
            <Button disabled={busy}>{busy ? "Envoi…" : "Recevoir mon code ✉️"}</Button>
            <p className="text-xs text-muted">Pas de mot de passe : tu reçois un code (et un lien magique) par e-mail.</p>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-3">
            <p className="text-sm">
              E-mail envoyé à <b>{email}</b> 💌
            </p>
            <label className="text-sm font-medium" htmlFor="code">
              Tape le code reçu
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="123456"
              className="rounded-2xl border border-line bg-cream px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-rose"
            />
            <Button disabled={busy || code.length < 6}>{busy ? "Vérification…" : "Me connecter"}</Button>
            <p className="text-xs text-muted">
              Sur iPhone avec l&apos;app installée, utilise le code plutôt que le lien (le lien ouvrirait Safari).
            </p>
            <button type="button" className="text-sm text-rose underline" onClick={() => { setSent(false); setCode(""); }}>
              Changer d&apos;adresse
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-[#c0392b]">{error}</p>}
      </Card>
    </Page>
  );
}

function Onboarding() {
  const { reload } = useApp();
  const [mode, setMode] = useState<"choix" | "creer" | "rejoindre">("choix");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(m: "creer" | "rejoindre") {
    setMode(m);
    // Valeurs par défaut (modifiables ici et dans ⚙️ Réglages)
    if (m === "creer") {
      setName("Sossa");
      setEmoji("🇧🇯❤️");
    } else {
      setName("Mansa");
      setEmoji("🇲🇱❤️");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = supabase();
    const { error } =
      mode === "creer"
        ? await sb.rpc("create_couple", { p_name: name.trim(), p_emoji: emoji.trim() || "❤️" })
        : await sb.rpc("join_couple", { p_code: code, p_name: name.trim(), p_emoji: emoji.trim() || "❤️" });
    setBusy(false);
    if (error) setError(errMsg(error));
    else await reload();
  }

  return (
    <Page className="flex flex-col justify-center gap-6 py-10">
      <div className="text-center">
        <div className="pop mb-3 text-6xl">🏡</div>
        <h1 className="text-3xl font-semibold">Notre espace couple</h1>
        <p className="mt-2 text-muted">Un espace privé, rien qu&apos;à vous deux.</p>
      </div>

      {mode === "choix" ? (
        <div className="flex flex-col gap-3">
          <Button onClick={() => pick("creer")}>✨ Créer notre espace</Button>
          <Button variant="soft" onClick={() => pick("rejoindre")}>
            💌 J&apos;ai un code d&apos;invitation
          </Button>
          <button className="mt-4 text-sm text-muted underline" onClick={() => supabase().auth.signOut()}>
            Se déconnecter
          </button>
        </div>
      ) : (
        <Card className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-3">
            {mode === "rejoindre" && (
              <>
                <label className="text-sm font-medium" htmlFor="code">
                  Code d&apos;invitation
                </label>
                <input
                  id="code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  className="rounded-2xl border border-line bg-cream px-4 py-3 text-center text-2xl tracking-[0.3em] outline-none focus:border-rose"
                />
              </>
            )}
            <label className="text-sm font-medium" htmlFor="name">
              Ton prénom
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-rose"
            />
            <label className="text-sm font-medium" htmlFor="emoji">
              Ton emoji
            </label>
            <input
              id="emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="rounded-2xl border border-line bg-cream px-4 py-3 text-2xl outline-none focus:border-rose"
            />
            <Button disabled={busy}>{busy ? "Un instant…" : mode === "creer" ? "Créer notre espace 💞" : "Rejoindre 💞"}</Button>
            <button type="button" className="text-sm text-muted underline" onClick={() => setMode("choix")}>
              Retour
            </button>
            {error && <p className="text-sm text-[#c0392b]">{error}</p>}
          </form>
        </Card>
      )}
    </Page>
  );
}
