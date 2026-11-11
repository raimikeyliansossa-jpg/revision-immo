// =============================================================
// Révision Immo — Moteur des "vidéos" animées
// Une vidéo = un titre + une problématique, puis des scènes
// jouées par des petits personnages, puis "À retenir".
// Tout est dessiné par le navigateur (SVG) et raconté par la
// voix de synthèse du téléphone : aucun fichier vidéo à créer.
// =============================================================

// -------------------------------------------------------------
// 1. Les décors (dessins SVG de 360 x 300)
// -------------------------------------------------------------
const DECORS = {
  rue: `
    <rect width="360" height="300" fill="#7dd3fc"/>
    <circle cx="300" cy="45" r="22" fill="#fde047"/>
    <rect y="240" width="360" height="60" fill="#4ade80"/>
    <circle cx="45" cy="170" r="38" fill="#16a34a"/><rect x="40" y="195" width="10" height="50" fill="#78350f"/>
    <rect x="200" y="135" width="125" height="108" fill="#fde68a"/>
    <polygon points="190,140 262,82 335,140" fill="#b91c1c"/>
    <rect x="248" y="190" width="30" height="53" fill="#92400e"/>
    <rect x="212" y="158" width="26" height="24" fill="#bae6fd" stroke="#fff" stroke-width="3"/>
    <rect x="288" y="158" width="26" height="24" fill="#bae6fd" stroke="#fff" stroke-width="3"/>
    <rect x="150" y="190" width="4" height="55" fill="#57534e"/>
    <rect x="118" y="168" width="68" height="26" rx="3" fill="#ef4444"/>
    <text x="152" y="186" font-size="11" font-weight="800" fill="#fff" text-anchor="middle" font-family="sans-serif">À VENDRE</text>`,

  agence: `
    <rect width="360" height="300" fill="#e0e7ff"/>
    <rect y="240" width="360" height="60" fill="#a5b4fc"/>
    <rect x="80" y="18" width="200" height="36" rx="6" fill="#1e3a8a"/>
    <text x="180" y="42" font-size="16" font-weight="800" fill="#fff" text-anchor="middle" font-family="sans-serif">AGENCE IMMO</text>
    <g fill="#fff" stroke="#6366f1" stroke-width="2">
      <rect x="20" y="80" width="56" height="44"/><rect x="284" y="80" width="56" height="44"/>
    </g>
    <polygon points="34,112 48,96 62,112" fill="#f87171"/><rect x="38" y="112" width="20" height="8" fill="#fbbf24"/>
    <polygon points="298,112 312,96 326,112" fill="#60a5fa"/><rect x="302" y="112" width="20" height="8" fill="#fbbf24"/>
    <rect x="115" y="205" width="130" height="12" fill="#92400e"/>
    <rect x="125" y="217" width="8" height="25" fill="#78350f"/><rect x="227" y="217" width="8" height="25" fill="#78350f"/>
    <rect x="150" y="190" width="30" height="15" fill="#334155"/>
    <circle cx="25" cy="215" r="14" fill="#22c55e"/><rect x="18" y="225" width="14" height="17" fill="#b45309"/>`,

  banque: `
    <rect width="360" height="300" fill="#f1f5f9"/>
    <rect y="240" width="360" height="60" fill="#cbd5e1"/>
    <polygon points="100,62 180,20 260,62" fill="#0f766e"/>
    <rect x="100" y="62" width="160" height="26" fill="#0f766e"/>
    <text x="180" y="81" font-size="16" font-weight="800" fill="#fff" text-anchor="middle" font-family="sans-serif">BANQUE</text>
    <circle cx="180" cy="46" r="11" fill="#fde047"/>
    <text x="180" y="51" font-size="13" font-weight="800" fill="#0f766e" text-anchor="middle" font-family="sans-serif">€</text>
    <g fill="#e2e8f0" stroke="#94a3b8" stroke-width="2">
      <rect x="20" y="70" width="22" height="170"/><rect x="318" y="70" width="22" height="170"/>
    </g>
    <rect x="110" y="200" width="140" height="40" fill="#0f766e" opacity="0.85"/>`,

  notaire: `
    <rect width="360" height="300" fill="#fef3c7"/>
    <rect y="240" width="360" height="60" fill="#c08457"/>
    <rect x="60" y="18" width="240" height="36" rx="6" fill="#14532d"/>
    <text x="180" y="42" font-size="15" font-weight="800" fill="#fde68a" text-anchor="middle" font-family="sans-serif">ÉTUDE NOTARIALE</text>
    <rect x="12" y="70" width="70" height="170" fill="#78350f"/>
    <g>
      <rect x="18" y="80" width="10" height="34" fill="#dc2626"/><rect x="30" y="80" width="10" height="34" fill="#2563eb"/>
      <rect x="42" y="80" width="10" height="34" fill="#16a34a"/><rect x="54" y="80" width="10" height="34" fill="#ca8a04"/>
      <rect x="18" y="130" width="10" height="34" fill="#7c3aed"/><rect x="30" y="130" width="10" height="34" fill="#dc2626"/>
      <rect x="42" y="130" width="10" height="34" fill="#0891b2"/><rect x="54" y="130" width="10" height="34" fill="#16a34a"/>
    </g>
    <rect x="120" y="205" width="140" height="12" fill="#451a03"/>
    <rect x="130" y="217" width="8" height="25" fill="#451a03"/><rect x="242" y="217" width="8" height="25" fill="#451a03"/>
    <rect x="175" y="195" width="34" height="10" fill="#fff"/>`,

  appartement: `
    <rect width="360" height="300" fill="#fce7f3"/>
    <rect y="240" width="360" height="60" fill="#e7c9a9"/>
    <rect x="215" y="40" width="110" height="90" fill="#bfdbfe" stroke="#fff" stroke-width="6"/>
    <g fill="#64748b"><rect x="225" y="90" width="18" height="40"/><rect x="248" y="75" width="22" height="55"/><rect x="275" y="95" width="16" height="35"/><rect x="295" y="82" width="20" height="48"/></g>
    <line x1="270" y1="40" x2="270" y2="130" stroke="#fff" stroke-width="4"/>
    <rect x="20" y="190" width="120" height="40" rx="10" fill="#7c3aed"/>
    <rect x="12" y="175" width="22" height="60" rx="8" fill="#6d28d9"/><rect x="126" y="175" width="22" height="60" rx="8" fill="#6d28d9"/>
    <rect x="270" y="200" width="44" height="40" fill="#d97706"/><rect x="280" y="170" width="34" height="30" fill="#f59e0b"/>
    <line x1="270" y1="220" x2="314" y2="220" stroke="#92400e" stroke-width="2"/>`,
};

// -------------------------------------------------------------
// 2. Les personnages (dessin SVG d'un petit bonhomme de face)
// -------------------------------------------------------------

// On n'accepte que des couleurs du type "#a1b2c3" (sécurité)
function couleur(valeur, parDefaut) {
  return /^#[0-9a-f]{3,8}$/i.test(valeur || "") ? valeur : parDefaut;
}

function dessinerPerso(p) {
  const habit = couleur(p.couleur, "#3b82f6");
  const peau = couleur(p.peau, "#f1c27d");
  const cheveux = couleur(p.cheveux, "#3f2a14");

  // Cheveux longs (dessinés DERRIÈRE la tête) si style "femme"
  const cheveuxArriere =
    p.style === "femme" ? `<path d="M11 26 Q11 5 30 5 Q49 5 49 26 L51 52 L9 52Z" fill="${cheveux}"/>` : "";

  // Accessoires possibles : cravate, lunettes, badge, moustache
  const accessoires = {
    cravate: `<path d="M30 45 L26 51 L30 72 L34 51Z" fill="#facc15"/>`,
    lunettes: `<g fill="none" stroke="#111" stroke-width="1.6"><circle cx="24" cy="27" r="5"/><circle cx="36" cy="27" r="5"/><line x1="29" y1="27" x2="31" y2="27"/></g>`,
    badge: `<rect x="34" y="54" width="9" height="7" rx="1" fill="#fff"/>`,
    moustache: `<path d="M23 32 Q30 28 37 32 Q30 35 23 32Z" fill="${cheveux}"/>`,
  };

  return `
  <svg viewBox="0 0 60 120" aria-hidden="true">
    ${cheveuxArriere}
    <rect x="18" y="86" width="10" height="32" rx="4" fill="#1f2937"/>
    <rect x="32" y="86" width="10" height="32" rx="4" fill="#1f2937"/>
    <rect x="7" y="48" width="9" height="34" rx="4.5" fill="${habit}"/>
    <rect x="44" y="48" width="9" height="34" rx="4.5" fill="${habit}"/>
    <circle cx="11.5" cy="83" r="4.5" fill="${peau}"/><circle cx="48.5" cy="83" r="4.5" fill="${peau}"/>
    <rect x="14" y="43" width="32" height="49" rx="12" fill="${habit}"/>
    <circle cx="30" cy="26" r="17" fill="${peau}"/>
    <path d="M13 22 Q15 7 30 7 Q45 7 47 22 Q39 14 30 15 Q21 14 13 22Z" fill="${cheveux}"/>
    <circle cx="24" cy="27" r="2" fill="#111"/><circle cx="36" cy="27" r="2" fill="#111"/>
    <path class="bouche" d="M24 34 Q30 39 36 34" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${accessoires[p.accessoire] || ""}
  </svg>`;
}

// -------------------------------------------------------------
// 3. La voix (synthèse vocale du téléphone)
// -------------------------------------------------------------
const CLE_SON = "revision-immo-son";
let sonActif = true;
try {
  sonActif = localStorage.getItem(CLE_SON) !== "non";
} catch (e) {}

const voixDisponible = "speechSynthesis" in window;
let videoEnCours = null; // la vidéo en train de jouer (une seule à la fois)

function attendre(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

// Durée estimée pour lire un texte (environ 14 caractères par seconde)
function dureeEstimee(texte) {
  return texte.length * 65;
}

// Lit un texte à voix haute. Renvoie une "promesse" qui se termine
// quand la voix a fini (ou après la durée estimée si le son est coupé).
function parler(texte) {
  const estime = Math.max(1500, dureeEstimee(texte));
  if (!sonActif || !voixDisponible) return attendre(estime);

  return new Promise((ok) => {
    let fini = false;
    const terminer = () => {
      if (!fini) {
        fini = true;
        clearTimeout(securite);
        ok();
      }
    };
    // Sécurité : certains téléphones oublient de signaler la fin
    const securite = setTimeout(terminer, estime * 1.8 + 2000);

    const phrase = new SpeechSynthesisUtterance(texte);
    phrase.lang = "fr-FR";
    phrase.rate = 1.1; // un peu plus rapide que la normale, façon TikTok
    const voixFr = speechSynthesis.getVoices().find((v) => v.lang.startsWith("fr"));
    if (voixFr) phrase.voice = voixFr;

    phrase.onend = terminer;
    phrase.onerror = (e) => {
      // Interrompue volontairement → on termine tout de suite.
      // Autre erreur (voix bloquée…) → on laisse le temps de lire le sous-titre.
      if (e.error === "interrupted" || e.error === "canceled") terminer();
      else setTimeout(terminer, estime);
    };
    speechSynthesis.speak(phrase);
  });
}

function couperVoix() {
  if (voixDisponible) speechSynthesis.cancel();
}

// Le navigateur n'autorise le son qu'après un premier tap de l'utilisateur
function aDejaTouche() {
  return navigator.userActivation ? navigator.userActivation.hasBeenActive : dejaTouche;
}
let dejaTouche = false;
document.addEventListener("click", () => (dejaTouche = true), { capture: true });

// -------------------------------------------------------------
// 4. Fabrication d'une vidéo dans une carte
// -------------------------------------------------------------
function ajouterVideo(section, carte) {
  const casting = carte.personnages || {};
  const scenes = carte.scenes || [];
  const aRetenir = (carte.reponse || "").split("\n").filter(Boolean);

  // La liste des étapes : intro, chaque scène, puis "à retenir"
  // "mini" = durée minimale de l'étape (pour avoir le temps de voir / lire)
  const etapes = [
    { type: "intro", texte: carte.contenu, mini: 3000 },
    ...scenes.map((s) => ({ type: "scene", scene: s, texte: s.narration, mini: 2500 })),
    { type: "fin", texte: "À retenir !", mini: 7000 },
  ];

  // --- Construction de l'écran ---
  const scene = creer("div", "scene");
  const decor = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  decor.setAttribute("viewBox", "0 0 360 300");
  decor.setAttribute("preserveAspectRatio", "xMidYMid slice");
  decor.classList.add("decor");

  const objet = creer("div", "objet");

  // Barre de progression découpée en segments (style "stories")
  const progression = creer("div", "progression");
  const segments = etapes.map(() => {
    const seg = creer("span", "segment");
    const remplissage = creer("i");
    seg.append(remplissage);
    progression.append(seg);
    return remplissage;
  });

  // Écran titre
  const ecranTitre = creer("div", "ecran ecran-titre");
  ecranTitre.append(
    creer("div", "ecran-icone", "🎬"),
    creer("p", "ecran-etiquette", "La question"),
    creer("h3", "ecran-gros", carte.contenu)
  );

  // Écran "À retenir"
  const ecranFin = creer("div", "ecran ecran-fin");
  const liste = creer("ul", "liste-retenir");
  aRetenir.forEach((ligne) => liste.append(creer("li", "", ligne)));
  const boutonRevoir = creer("button", "bouton-revoir", "↻ Revoir");
  ecranFin.append(creer("h3", "ecran-gros", "✅ À retenir"), liste, boutonRevoir);

  const boutonLecture = creer("button", "bouton-lecture", "▶");
  boutonLecture.setAttribute("aria-label", "Lancer la vidéo");

  scene.append(decor, objet, ecranTitre, ecranFin, progression, boutonLecture);

  // Un élément par personnage, caché au départ
  const persos = {};
  Object.entries(casting).forEach(([id, p]) => {
    const div = creer("div", "perso");
    div.innerHTML = dessinerPerso(p);
    const bulle = creer("div", "bulle");
    // Étiquette sous les pieds : prénom + rôle (sur 2 lignes)
    const nom = creer("span", "nom", p.nom || id);
    if (p.role) nom.append(creer("small", "", p.role));
    div.append(bulle, nom);
    scene.insertBefore(div, objet);
    persos[id] = { div, bulle, visible: false, x: 50 };
  });

  const sousTitre = creer("p", "sous-titre");
  section.append(scene, sousTitre);

  // --- Affichage d'une étape ---
  let decorActuel = null;

  function afficherEtape(i) {
    const etape = etapes[i];
    ecranTitre.classList.toggle("visible", etape.type === "intro");
    ecranFin.classList.toggle("visible", etape.type === "fin");
    sousTitre.textContent = etape.type === "scene" ? etape.texte : "";

    // Barre de progression : les étapes passées sont pleines
    segments.forEach((seg, j) => {
      seg.style.transition = "none";
      seg.style.width = j < i ? "100%" : "0%";
    });
    const actuel = segments[i];
    void actuel.offsetWidth; // force le navigateur à prendre en compte le 0 %
    const duree = Math.max(dureeEstimee(etape.texte), etape.mini);
    actuel.style.transition = `width ${duree}ms linear`;
    actuel.style.width = "100%";

    if (etape.type !== "scene") {
      Object.values(persos).forEach((p) => {
        p.div.classList.remove("visible", "parle");
        p.visible = false;
      });
      objet.classList.remove("visible");
      return;
    }

    const s = etape.scene;

    // Changement de décor en fondu
    if (s.decor !== decorActuel) {
      decorActuel = s.decor;
      decor.innerHTML = DECORS[s.decor] || DECORS.rue;
      decor.classList.remove("fondu");
      void decor.offsetWidth;
      decor.classList.add("fondu");
    }

    // Placement des personnages
    Object.entries(persos).forEach(([id, p]) => {
      const x = (s.persos || {})[id];
      if (x === undefined) {
        p.div.classList.remove("visible", "parle");
        p.visible = false;
        return;
      }
      if (!p.visible) {
        // Il apparaît : on le pose directement à sa place, sans glisser
        p.div.style.transition = "none";
        p.div.style.left = x + "%";
        void p.div.offsetWidth;
        p.div.style.transition = "";
      } else if (p.x !== x) {
        // Il se déplace : petite animation de marche pendant le trajet
        p.div.style.left = x + "%";
        p.div.classList.add("marche");
        setTimeout(() => p.div.classList.remove("marche"), 900);
      }
      p.x = x;
      p.visible = true;
      p.div.classList.add("visible");

      // Bulle de dialogue
      const parle = s.parle === id && s.bulle;
      p.div.classList.toggle("parle", !!parle);
      p.bulle.textContent = parle ? s.bulle : "";
      p.bulle.className = "bulle" + (x < 30 ? " gauche" : x > 70 ? " droite" : "");
    });

    // Objet qui "pop" (document, clés, euros…)
    if (s.objet) {
      objet.textContent = s.objet.emoji + " " + s.objet.texte;
      objet.classList.remove("visible");
      void objet.offsetWidth;
      objet.classList.add("visible");
    } else {
      objet.classList.remove("visible");
    }
  }

  // --- Lecture ---
  let jeton = 0;     // change à chaque arrêt : les anciennes lectures s'arrêtent
  let index = 0;     // étape en cours
  let etat = "arret"; // "arret", "lecture", "pause" ou "fini"

  async function derouler(depuis) {
    const monJeton = ++jeton;
    etat = "lecture";
    scene.classList.remove("en-pause");
    for (let i = depuis; i < etapes.length; i++) {
      index = i;
      afficherEtape(i);
      // On attend la voix ET un minimum de temps pour voir l'animation
      await Promise.all([parler(etapes[i].texte), attendre(etapes[i].mini)]);
      if (monJeton !== jeton) return; // quelqu'un a arrêté la vidéo
      if (i < etapes.length - 1) await attendre(400);
      if (monJeton !== jeton) return;
    }
    etat = "fini";
  }

  const controle = {
    section,

    jouer() {
      if (videoEnCours && videoEnCours !== controle) videoEnCours.arreter();
      videoEnCours = controle;
      couperVoix();
      // Sans tap préalable, le téléphone bloque le son : on affiche ▶
      if (sonActif && voixDisponible && !aDejaTouche()) {
        afficherEtape(0);
        boutonLecture.classList.add("visible");
        return;
      }
      boutonLecture.classList.remove("visible");
      derouler(0);
    },

    arreter() {
      jeton++;
      etat = "arret";
      if (videoEnCours === controle) {
        couperVoix();
        videoEnCours = null;
      }
      scene.classList.remove("en-pause");
      afficherEtape(0);
    },

    // Rejoue l'étape en cours (utile quand on coupe/remet le son)
    relancerEtape() {
      if (etat !== "lecture") return;
      jeton++;
      couperVoix();
      derouler(index);
    },
  };

  boutonLecture.addEventListener("click", (e) => {
    e.stopPropagation();
    boutonLecture.classList.remove("visible");
    videoEnCours = controle;
    derouler(0);
  });

  boutonRevoir.addEventListener("click", (e) => {
    e.stopPropagation();
    derouler(0);
  });

  // Tap sur l'écran = pause / reprise
  scene.addEventListener("click", () => {
    if (etat === "lecture") {
      jeton++;
      etat = "pause";
      couperVoix();
      scene.classList.add("en-pause");
      // On fige la barre de progression là où elle en est
      const seg = segments[index];
      const largeur = getComputedStyle(seg).width;
      seg.style.transition = "none";
      seg.style.width = largeur;
    } else if (etat === "pause") {
      derouler(index);
    }
  });

  afficherEtape(0);
  section.video = controle;
}

// -------------------------------------------------------------
// 5. Fonctions utilisées par app.js
// -------------------------------------------------------------

// Appelée quand une carte devient visible à l'écran
function carteVisible(section) {
  if (videoEnCours && videoEnCours.section !== section) videoEnCours.arreter();
  if (section.video) section.video.jouer();
}

function arreterVideos() {
  if (videoEnCours) videoEnCours.arreter();
}

// Bouton 🔊 / 🔇 dans la barre du haut
function brancherBoutonSon(bouton) {
  const maj = () => {
    bouton.textContent = sonActif ? "🔊" : "🔇";
    bouton.setAttribute("aria-label", sonActif ? "Couper le son" : "Activer le son");
  };
  maj();
  bouton.addEventListener("click", () => {
    sonActif = !sonActif;
    try {
      localStorage.setItem(CLE_SON, sonActif ? "oui" : "non");
    } catch (e) {}
    maj();
    if (videoEnCours) videoEnCours.relancerEtape();
  });
}
