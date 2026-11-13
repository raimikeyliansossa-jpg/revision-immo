# 💞 Notre point du dimanche

Application web (PWA) pour faire le point chaque dimanche soir à deux, en temps réel, chacun sur son téléphone.

- **App** : Next.js + Tailwind (dossier `src/`)
- **Base de données, connexion, photos, temps réel** : Supabase (dossier `supabase/`)
- **Hébergement** : Vercel (gratuit)

---

## 🧭 Guide de mise en ligne (pas à pas, sans être développeur)

Compte environ 20 minutes. Tu vas créer 2 comptes gratuits (Supabase et Vercel), et copier quelques clés de l'un vers l'autre.

### Étape 1 — Créer la base de données (Supabase)

1. Va sur **https://supabase.com** → **Start your project** → connecte-toi avec ton compte **GitHub**.
2. **New project** :
   - Name : `organisation-couple`
   - Database Password : clique sur **Generate a password** (tu n'en auras pas besoin ensuite, mais garde-le dans un coin)
   - Region : **West EU (Paris)**
   - → **Create new project** (patiente 1 à 2 minutes)
3. Dans le menu de gauche, ouvre **SQL Editor** → **New query**.
4. Ouvre le fichier [`supabase/migrations/20261112000000_init.sql`](supabase/migrations/20261112000000_init.sql) sur GitHub, clique sur l'icône **Copy raw file** (deux carrés), colle tout dans Supabase, puis clique sur **Run**.
   → Tu dois voir **« Success. No rows returned »**. Ça crée toutes les tables, la sécurité (personne d'autre que vous deux ne voit vos données) et le stockage privé des photos.
   Fais pareil ensuite avec [`supabase/migrations/20261113000000_outfits_par_date.sql`](supabase/migrations/20261113000000_outfits_par_date.sql) (date des outfits).
5. **Connexion par mot de passe** : menu **Authentication** → **Sign In / Providers** → **Email** → désactive **Confirm email** → **Save**. Chacun crée son compte directement dans l'app (e-mail + mot de passe), sans attendre d'e-mail.
6. Récupère tes clés : menu **Project Settings** (roue crantée) → **API Keys** (et **Data API** pour l'URL). Note dans un bloc-notes :
   - **Project URL** (ex. `https://abcdxyz.supabase.co`)
   - **Publishable key** (commence par `sb_publishable_…`, parfois appelée *anon key*)
   - **Secret key** (commence par `sb_secret_…`, parfois appelée *service_role*). ⚠️ Celle-ci est secrète : ne la partage avec personne.

### Étape 2 — Mettre l'app en ligne (Vercel)

1. Va sur **https://vercel.com** → **Sign Up** → **Continue with GitHub**.
2. **Add New… → Project** → à côté du dépôt **revision-immo**, clique sur **Import**.
3. **Root Directory** : clique sur **Edit** et choisis le dossier **`organisation-couple`**. C'est important.
4. Ouvre **Environment Variables** et ajoute ces 6 lignes (Name → Value) :

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | la *Project URL* de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la *Publishable key* |
   | `SUPABASE_SERVICE_ROLE_KEY` | la *Secret key* |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | la clé publique de notifications (donnée par Claude) |
   | `VAPID_PRIVATE_KEY` | la clé privée de notifications (donnée par Claude) |
   | `CRON_SECRET` | le mot secret du rappel du dimanche (donné par Claude) |

5. Clique sur **Deploy**. Au bout d'environ 1 minute, tu obtiens une adresse du type **`https://organisation-couple.vercel.app`**. Note-la.

> Si tu as oublié une variable : Vercel → ton projet → **Settings → Environment Variables**, ajoute-la, puis **Deployments → ⋯ → Redeploy**.

### Étape 3 — Dire à Supabase l'adresse de l'app

Supabase → **Authentication → URL Configuration** :
- **Site URL** : ton adresse Vercel (ex. `https://organisation-couple.vercel.app`)
- **Redirect URLs** → **Add URL** : `https://organisation-couple.vercel.app/**`
- **Save**

C'est en ligne ! 🎉

---

## 📲 Installer l'app sur vos téléphones

### Sur ton Samsung (Android)
1. Ouvre ton adresse Vercel dans **Chrome**.
2. Menu **⋮** (en haut à droite) → **Ajouter à l'écran d'accueil** (ou **Installer l'application**) → **Installer**.
   - Avec *Samsung Internet* : menu **≡** → **Ajouter la page à** → **Écran d'accueil**.
3. Ouvre l'app depuis la nouvelle icône 💗 → **Première fois ? Créer mon compte** → ton e-mail et un mot de passe.

### Sur son iPhone
1. Ouvre l'adresse dans **Safari** (obligatoire : pas Chrome, pas Instagram, pas WhatsApp).
2. Touche le bouton **Partager** (carré avec une flèche ↑) → fais défiler → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvre l'app **depuis l'icône** sur l'écran d'accueil → **Première fois ? Créer mon compte** → son e-mail et un mot de passe.

### Activer les notifications (chacun sur son téléphone)
Dans l'app : **⚙️ Réglages → 🔔 Activer les notifications** → **Autoriser**.
- Sur iPhone, ça ne marche que si l'app a été ouverte depuis l'écran d'accueil (iOS 16.4 minimum).
- Vous recevrez « C'est l'heure de notre point 💞 » le dimanche à 20 h, et une alerte quand l'autre poste un outfit.

---

## 💌 Inviter ta copine

1. **Toi** : ouvre l'app → **✨ Créer notre espace** (ton prénom *Sossa 🇧🇯❤️* est déjà rempli) → **Créer**.
2. L'accueil affiche un **code d'invitation** à 6 caractères → touche **Partager l'invitation** et envoie-le-lui par message.
3. **Elle** : installe l'app (voir plus haut), crée son compte → **💌 J'ai un code d'invitation** → entre le code (son prénom *Mansa 🇲🇱❤️* est déjà rempli) → **Rejoindre**.
4. C'est tout : l'espace est complet (2 personnes maximum, personne d'autre ne peut entrer).

Les prénoms et les emojis se changent à tout moment dans **⚙️ Réglages**.

---

## 🗓️ Le dimanche soir

Lancez le FaceTime, ouvrez l'app chacun de votre côté. L'un touche **Commencer notre point**, l'autre voit **Reprendre notre point**.
À chaque étape, vos réponses s'affichent côte à côte en direct. On passe à l'étape suivante quand les **deux** ont appuyé sur **Prêt ✓**. Si vous fermez l'app, vous reprenez exactement où vous en étiez.

---

## ❓ En cas de souci

- **Je ne reçois pas l'e-mail** : regarde dans les spams. Le service d'e-mail gratuit de Supabase est limité à quelques e-mails par heure : attends un peu avant de redemander un code. Une fois connecté, on reste connecté.
- **« Project paused » sur Supabase** : un projet gratuit se met en pause après 7 jours sans aucune utilisation. Va sur supabase.com → ton projet → **Restore project**. Avec un point chaque dimanche, ça ne devrait pas arriver.
- **Le rappel du dimanche arrive à 20 h 30** : sur l'offre gratuite de Vercel, les tâches planifiées partent « dans l'heure ». Il arrive donc entre 20 h et 21 h.

---

## 🛠️ Pour un développeur

```bash
npm install
npx supabase start                    # Supabase local (Docker)
cp .env.example .env.local            # puis remplir avec les clés locales
npm run dev
```

- Schéma, sécurité RLS, logique « Prêt ✓ » (`set_ready`, `go_to_step`) : `supabase/migrations/`
- Temps réel : un canal privé `couple:<id>` par couple. On y trouve la présence, « écrit… », la frappe en direct (broadcast) et les changements de la base (postgres_changes). Voir `src/components/Providers.tsx`.
- Chaque personne n'écrit que dans sa propre ligne (`point_answers`) : impossible d'écraser le texte de l'autre.
