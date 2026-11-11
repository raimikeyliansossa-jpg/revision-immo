// =============================================================
// Révision Immo — Moteur des vidéos "explainer" animées
//
// Une vidéo = une accroche, puis une suite de PLANS très courts,
// puis "À retenir". Chaque plan est l'un de ces types :
//   - "scene"    : des personnages dans un décor (avec émotions,
//                  gros plans, pop-up, bulle)
//   - "document" : une feuille (mandat, lettre…) avec une ligne surlignée
//   - "loi"      : un extrait de texte officiel surligné
//   - "etapes"   : une liste numérotée, l'étape en cours en évidence
//   - "chiffre"  : un chiffre clé en très gros
//   - "calcul"   : des lignes qui s'additionnent jusqu'au TOTAL
//   - "versus"   : deux colonnes face à face (ne pas confondre…)
// La voix off s'affiche en sous-titres de 2-3 mots ; les mots
// entre *astérisques* dans la narration sont mis en couleur.
// Tout est dessiné par le navigateur : aucun fichier vidéo.
// =============================================================

const NB = " "; // espace insécable

// -------------------------------------------------------------
// 1. Les décors — format vertical 360 x 640 (le sol vers y = 470)
// -------------------------------------------------------------

// Lampe suspendue avec un halo lumineux
function lampe(x, y) {
  return `
    <line x1="${x}" y1="0" x2="${x}" y2="${y - 14}" stroke="#2a1a12" stroke-width="2"/>
    <circle cx="${x}" cy="${y}" r="80" fill="url(#halo)"/>
    <path d="M${x - 18} ${y} Q${x} ${y - 26} ${x + 18} ${y}Z" fill="#3b2a20"/>
    <circle cx="${x}" cy="${y + 3}" r="6" fill="#fff4c2"/>`;
}

const DEFS = `
  <defs>
    <radialGradient id="halo"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.75"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="couchant" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8c58c"/><stop offset="1" stop-color="#f19a6b"/></linearGradient>
    <linearGradient id="nuit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2140"/><stop offset="1" stop-color="#3a3f6b"/></linearGradient>
  </defs>`;

const DECORS = {
  rue: `
    <rect width="360" height="640" fill="url(#couchant)"/>
    <circle cx="90" cy="150" r="60" fill="#ffe2a0" opacity="0.8"/>
    <g fill="#d98a6a" opacity="0.6"><rect x="0" y="260" width="60" height="210"/><rect x="60" y="300" width="50" height="170"/><rect x="110" y="240" width="40" height="230"/></g>
    <rect x="160" y="250" width="200" height="220" fill="#f3d9a4" stroke="#2a1a12" stroke-width="3"/>
    <polygon points="145,258 260,170 375,258" fill="#b5462f" stroke="#2a1a12" stroke-width="3"/>
    <rect x="235" y="370" width="50" height="100" fill="#7a4428" stroke="#2a1a12" stroke-width="3"/>
    <circle cx="276" cy="420" r="3" fill="#f6c453"/>
    <rect x="180" y="290" width="40" height="44" fill="#ffe7a6" stroke="#2a1a12" stroke-width="3"/>
    <rect x="300" y="290" width="40" height="44" fill="#ffe7a6" stroke="#2a1a12" stroke-width="3"/>
    <rect y="470" width="360" height="170" fill="#b98b62"/>
    <rect y="470" width="360" height="14" fill="#8fae5d"/>
    <rect x="128" y="380" width="6" height="95" fill="#4a3426"/>
    <rect x="92" y="350" width="80" height="38" rx="4" fill="#d9442e" stroke="#2a1a12" stroke-width="3"/>
    <text x="132" y="375" font-size="15" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">À VENDRE</text>`,

  agence: `
    <rect width="360" height="640" fill="#e8d2a8"/>
    <rect y="380" width="360" height="90" fill="#b98a5a"/>
    <rect y="470" width="360" height="170" fill="#7d4f33"/>
    <g stroke="#6a412a" stroke-width="2"><line x1="0" y1="520" x2="360" y2="520"/><line x1="0" y1="580" x2="360" y2="580"/></g>
    <rect x="70" y="140" width="220" height="46" rx="6" fill="#23345e" stroke="#2a1a12" stroke-width="3"/>
    <text x="180" y="171" font-size="20" font-weight="900" fill="#ffe7a6" text-anchor="middle" font-family="sans-serif">AGENCE IMMO</text>
    <g stroke="#2a1a12" stroke-width="3" fill="#fff8e6">
      <rect x="22" y="220" width="74" height="96"/><rect x="264" y="220" width="74" height="96"/>
    </g>
    <polygon points="38,275 59,250 80,275" fill="#d9442e"/><rect x="44" y="275" width="30" height="20" fill="#f3c86b"/>
    <polygon points="280,275 301,250 322,275" fill="#3d7dbf"/><rect x="286" y="275" width="30" height="20" fill="#f3c86b"/>
    <rect x="110" y="410" width="140" height="16" fill="#5a3522" stroke="#2a1a12" stroke-width="3"/>
    <rect x="122" y="426" width="10" height="44" fill="#5a3522"/><rect x="228" y="426" width="10" height="44" fill="#5a3522"/>
    ${lampe(180, 70)}`,

  banque: `
    <rect width="360" height="640" fill="#cfe0d8"/>
    <rect y="470" width="360" height="170" fill="#8a9a94"/>
    <g fill="#e9f1ec" stroke="#2a1a12" stroke-width="3"><rect x="18" y="190" width="34" height="280"/><rect x="308" y="190" width="34" height="280"/></g>
    <polygon points="70,190 180,130 290,190" fill="#1f5f55" stroke="#2a1a12" stroke-width="3"/>
    <rect x="70" y="190" width="220" height="40" fill="#1f5f55" stroke="#2a1a12" stroke-width="3"/>
    <text x="180" y="218" font-size="20" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">BANQUE</text>
    <circle cx="180" cy="168" r="14" fill="#f6c453" stroke="#2a1a12" stroke-width="2"/>
    <text x="180" y="174" font-size="16" font-weight="900" fill="#1f5f55" text-anchor="middle" font-family="sans-serif">€</text>
    <rect x="90" y="400" width="180" height="70" fill="#2c6e63" stroke="#2a1a12" stroke-width="3"/>
    ${lampe(180, 70)}`,

  notaire: `
    <rect width="360" height="640" fill="#ead3a0"/>
    <rect y="470" width="360" height="170" fill="#8b5a3c"/>
    <rect x="16" y="200" width="96" height="270" fill="#6b3f26" stroke="#2a1a12" stroke-width="3"/>
    <g stroke="#2a1a12" stroke-width="1.5">
      <rect x="24" y="215" width="14" height="50" fill="#b5462f"/><rect x="40" y="215" width="14" height="50" fill="#3d7dbf"/><rect x="56" y="215" width="14" height="50" fill="#5f8f4a"/><rect x="72" y="215" width="14" height="50" fill="#d9a23b"/>
      <rect x="24" y="290" width="14" height="50" fill="#7b4fa0"/><rect x="40" y="290" width="14" height="50" fill="#b5462f"/><rect x="56" y="290" width="14" height="50" fill="#2f8f9a"/><rect x="72" y="290" width="14" height="50" fill="#5f8f4a"/>
    </g>
    <rect x="60" y="130" width="240" height="44" rx="6" fill="#23462f" stroke="#2a1a12" stroke-width="3"/>
    <text x="180" y="160" font-size="18" font-weight="900" fill="#f6dd8f" text-anchor="middle" font-family="sans-serif">ÉTUDE NOTARIALE</text>
    <rect x="250" y="210" width="70" height="56" fill="#fff8e6" stroke="#2a1a12" stroke-width="3"/>
    <line x1="262" y1="230" x2="308" y2="230" stroke="#b58b5a" stroke-width="3"/><line x1="262" y1="244" x2="300" y2="244" stroke="#b58b5a" stroke-width="3"/>
    <rect x="120" y="410" width="160" height="16" fill="#4a2a18" stroke="#2a1a12" stroke-width="3"/>
    <rect x="132" y="426" width="10" height="44" fill="#4a2a18"/><rect x="258" y="426" width="10" height="44" fill="#4a2a18"/>
    ${lampe(200, 70)}`,

  cci: `
    <rect width="360" height="640" fill="#d6dde6"/>
    <rect y="470" width="360" height="170" fill="#6b7a8c"/>
    <g stroke="#56657a" stroke-width="2"><line x1="0" y1="530" x2="360" y2="530"/><line x1="120" y1="470" x2="80" y2="640"/><line x1="240" y1="470" x2="280" y2="640"/></g>
    <rect x="50" y="130" width="260" height="56" rx="6" fill="#1e3a6b" stroke="#2a1a12" stroke-width="3"/>
    <text x="180" y="158" font-size="22" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">CCI</text>
    <text x="180" y="177" font-size="10" font-weight="700" fill="#cfe0ff" text-anchor="middle" font-family="sans-serif">CHAMBRE DE COMMERCE ET D'INDUSTRIE</text>
    <rect x="20" y="230" width="90" height="70" fill="#fff" stroke="#2a1a12" stroke-width="3"/>
    <text x="65" y="262" font-size="11" font-weight="800" fill="#1e3a6b" text-anchor="middle" font-family="sans-serif">CARTE PRO</text>
    <text x="65" y="280" font-size="10" fill="#555" text-anchor="middle" font-family="sans-serif">T · G · S</text>
    <rect x="250" y="220" width="80" height="60" rx="4" fill="#2a1a12"/>
    <text x="290" y="258" font-size="22" font-weight="900" fill="#f6c453" text-anchor="middle" font-family="sans-serif">A12</text>
    <rect x="80" y="390" width="200" height="80" fill="#e9eef4" stroke="#2a1a12" stroke-width="3"/>
    <rect x="80" y="380" width="200" height="14" fill="#1e3a6b" stroke="#2a1a12" stroke-width="3"/>
    ${lampe(180, 70)}`,

  appartement: `
    <rect width="360" height="640" fill="#d9b07c"/>
    <rect y="470" width="360" height="170" fill="#7a4a30"/>
    <rect x="200" y="160" width="120" height="150" fill="url(#nuit)" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="290" cy="195" r="14" fill="#fff1b8"/>
    <g fill="#141830"><rect x="210" y="260" width="22" height="50"/><rect x="236" y="242" width="26" height="68"/><rect x="266" y="268" width="20" height="42"/><rect x="290" y="254" width="24" height="56"/></g>
    <g fill="#f6d77a"><rect x="242" y="252" width="5" height="6"/><rect x="252" y="272" width="5" height="6"/><rect x="296" y="266" width="5" height="6"/></g>
    <line x1="260" y1="160" x2="260" y2="310" stroke="#2a1a12" stroke-width="4"/>
    <rect x="30" y="220" width="110" height="8" fill="#5a3522"/>
    <g stroke="#2a1a12" stroke-width="2"><rect x="40" y="192" width="14" height="28" fill="#d9442e"/><rect x="60" y="200" width="12" height="20" fill="#f6c453"/><rect x="78" y="188" width="14" height="32" fill="#5f8f4a"/><rect x="98" y="198" width="12" height="22" fill="#d9442e"/></g>
    <rect x="16" y="400" width="130" height="50" rx="14" fill="#8a4a63" stroke="#2a1a12" stroke-width="3"/>
    <rect x="16" y="440" width="130" height="30" fill="#6e3a4f" stroke="#2a1a12" stroke-width="3"/>
    <rect x="250" y="410" width="80" height="60" fill="#c98a4a" stroke="#2a1a12" stroke-width="3"/>
    <line x1="250" y1="440" x2="330" y2="440" stroke="#2a1a12" stroke-width="2"/>
    ${lampe(110, 80)}`,
};

// -------------------------------------------------------------
// 2. Les personnages (grosse tête, contour foncé, émotions)
// -------------------------------------------------------------

// On n'accepte que des couleurs du type "#a1b2c3" (sécurité)
function couleur(valeur, parDefaut) {
  return /^#[0-9a-f]{3,8}$/i.test(valeur || "") ? valeur : parDefaut;
}

const TRAIT = `stroke="#2a1a12" stroke-width="2.5" stroke-linejoin="round"`;

// Le visage change selon l'émotion :
// neutre, content, rougit, triste, pleure, surpris, fache
function visage(emotion, cheveux) {
  const yeux = (r) =>
    `<ellipse cx="39" cy="54" rx="${r}" ry="${r + 1}" fill="#2a1a12"/><ellipse cx="61" cy="54" rx="${r}" ry="${r + 1}" fill="#2a1a12"/>
     <circle cx="40.2" cy="52.5" r="1.1" fill="#fff"/><circle cx="62.2" cy="52.5" r="1.1" fill="#fff"/>`;
  const sourcilsTristes = `<path d="M32 46 L44 42 M56 42 L68 46" stroke="${cheveux}" stroke-width="3" stroke-linecap="round"/>`;
  const sourcilsHauts = `<path d="M33 41 Q39 37 45 41 M55 41 Q61 37 67 41" stroke="${cheveux}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const joues = (o) =>
    `<ellipse cx="31" cy="65" rx="6" ry="3.5" fill="#f2777a" opacity="${o}"/><ellipse cx="69" cy="65" rx="6" ry="3.5" fill="#f2777a" opacity="${o}"/>`;
  const nez = `<path d="M50 57 Q54 62 49 64" stroke="#2a1a12" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const bouche = (d) => `<path class="bouche" d="${d}" stroke="#2a1a12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  switch (emotion) {
    case "content":
      return `<path d="M34 55 Q39 49 44 55 M56 55 Q61 49 66 55" stroke="#2a1a12" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${joues(0.6)}${nez}<path class="bouche" d="M41 68 Q50 79 59 68Z" fill="#7a2a22" ${TRAIT}/>`;
    case "rougit":
      return `${yeux(3)}${joues(0.95)}${nez}${bouche("M44 70 Q50 74 56 70")}`;
    case "triste":
      return `${yeux(3)}${sourcilsTristes}${joues(0.3)}${nez}${bouche("M43 73 Q50 67 57 73")}`;
    case "pleure":
      return `${yeux(3)}${sourcilsTristes}${joues(0.3)}${nez}
        <path class="larme" d="M37 60 Q35 68 38 72 Q41 68 39 60Z" fill="#7cc4f2"/>${bouche("M43 74 Q50 67 57 74")}`;
    case "surpris":
      return `${yeux(4)}${sourcilsHauts}${joues(0.3)}${nez}<ellipse class="bouche" cx="50" cy="71" rx="4.5" ry="6" fill="#7a2a22" ${TRAIT}/>`;
    case "fache":
      return `${yeux(3)}<path d="M32 42 L44 47 M56 47 L68 42" stroke="${cheveux}" stroke-width="3.5" stroke-linecap="round"/>
        <g class="colere"><path d="M80 18 l6 -6 M84 24 l8 -2 M74 14 l2 -8" stroke="#d9442e" stroke-width="3" stroke-linecap="round"/></g>
        ${joues(0.5)}${nez}<path class="bouche" d="M43 72 L57 72" stroke="#2a1a12" stroke-width="3" stroke-linecap="round"/>`;
    default:
      return `${yeux(3)}${joues(0.35)}${nez}${bouche("M44 69 Q50 73 56 69")}`;
  }
}

function dessinerPerso(p, emotion) {
  const habit = couleur(p.couleur, "#3b82f6");
  const peau = couleur(p.peau, "#f1c27d");
  const cheveux = couleur(p.cheveux, "#3f2a14");
  const femme = p.style === "femme";

  const cheveuxArriere = femme
    ? `<path d="M16 52 Q12 12 50 12 Q88 12 84 52 L86 96 Q70 102 66 84 L34 84 Q30 102 14 96Z" fill="${cheveux}" ${TRAIT}/>`
    : "";
  const cheveuxAvant = femme
    ? `<path d="M18 48 Q20 14 50 14 Q80 14 82 48 Q68 30 50 33 Q32 30 18 48Z" fill="${cheveux}" ${TRAIT}/>`
    : `<path d="M18 46 L21 24 L30 31 L35 13 L44 25 L51 8 L58 24 L68 12 L70 29 L80 21 L82 46 Q66 31 50 33 Q34 31 18 46Z" fill="${cheveux}" ${TRAIT}/>`;

  const accessoires = {
    cravate: `<path d="M50 88 L45 95 L50 126 L55 95Z" fill="#e0a72e" ${TRAIT}/>`,
    lunettes: `<g fill="rgba(255,255,255,0.25)" stroke="#2a1a12" stroke-width="2.2"><circle cx="39" cy="54" r="8"/><circle cx="61" cy="54" r="8"/><line x1="47" y1="54" x2="53" y2="54"/></g>`,
    badge: `<rect x="58" y="100" width="12" height="9" rx="2" fill="#fff" ${TRAIT}/>`,
    moustache: `<path d="M38 64 Q50 58 62 64 Q50 68 38 64Z" fill="${cheveux}" ${TRAIT}/>`,
  };

  return `
  <svg viewBox="0 0 100 200" aria-hidden="true" overflow="visible">
    <ellipse cx="50" cy="196" rx="28" ry="5" fill="rgba(0,0,0,0.25)"/>
    ${cheveuxArriere}
    <rect x="35" y="140" width="12" height="52" rx="5" fill="#2e2a3a" ${TRAIT}/>
    <rect x="53" y="140" width="12" height="52" rx="5" fill="#2e2a3a" ${TRAIT}/>
    <ellipse cx="40" cy="193" rx="9" ry="4.5" fill="#1d1a1a"/><ellipse cx="60" cy="193" rx="9" ry="4.5" fill="#1d1a1a"/>
    <rect x="17" y="92" width="13" height="46" rx="6.5" fill="${habit}" ${TRAIT}/>
    <rect x="70" y="92" width="13" height="46" rx="6.5" fill="${habit}" ${TRAIT}/>
    <circle cx="23.5" cy="140" r="6" fill="${peau}" ${TRAIT}/><circle cx="76.5" cy="140" r="6" fill="${peau}" ${TRAIT}/>
    <rect x="26" y="84" width="48" height="66" rx="16" fill="${habit}" ${TRAIT}/>
    <circle cx="18" cy="56" r="6" fill="${peau}" ${TRAIT}/><circle cx="82" cy="56" r="6" fill="${peau}" ${TRAIT}/>
    <circle cx="50" cy="52" r="32" fill="${peau}" ${TRAIT}/>
    ${cheveuxAvant}
    ${visage(emotion, cheveux)}
    ${accessoires[p.accessoire] || ""}
  </svg>`;
}

// -------------------------------------------------------------
// 3. Texte : mots clés *en couleur* et sous-titres en morceaux
// -------------------------------------------------------------

// Ajoute dans "el" un texte où les passages *entre astérisques*
// deviennent des <mark> (surlignés). Pas d'innerHTML : sécurité.
function ecrireSurligne(el, texte) {
  (texte || "").split(/\*(.+?)\*/).forEach((morceau, i) => {
    if (!morceau) return;
    if (i % 2 === 1) el.append(creer("mark", "", morceau));
    else el.append(document.createTextNode(morceau));
  });
}

// Découpe une narration en petits morceaux de 1 à 3 mots.
// Renvoie le texte à lire (sans astérisques) et les morceaux.
function decouper(narration) {
  const mots = [];
  let enCouleur = false;
  // On coupe sur les espaces normaux seulement : une espace insécable
  // (devant « : », « ! »…) garde le signe collé à son mot.
  (narration || "").split(/[ \t\n]+/).filter(Boolean).forEach((brut) => {
    if (brut.startsWith("*")) enCouleur = true;
    const fort = enCouleur;
    if (/\*[^\wÀ-ÿ]*$/.test(brut)) enCouleur = false;
    const propre = brut.replace(/\*/g, "");
    if (propre) mots.push({ texte: propre, fort });
  });

  const voix = mots.map((m) => m.texte).join(" ");
  const morceaux = [];
  let courant = [];
  let pos = 0;
  let debut = 0;
  mots.forEach((m, i) => {
    if (courant.length === 0) debut = pos;
    courant.push(m);
    pos += m.texte.length + 1;
    const longueur = courant.reduce((s, x) => s + x.texte.length + 1, 0);
    const finPhrase = /[.,;:!?»…]$/.test(m.texte);
    if (courant.length === 3 || finPhrase || longueur > 14 || i === mots.length - 1) {
      morceaux.push({ mots: courant, debut });
      courant = [];
    }
  });
  return { voix, morceaux };
}

// -------------------------------------------------------------
// 4. La voix off
// -------------------------------------------------------------
const CLE_SON = "revision-immo-son";
let sonActif = true;
try {
  sonActif = localStorage.getItem(CLE_SON) !== "non";
} catch (e) {}

const voixDisponible = "speechSynthesis" in window;
let videoEnCours = null; // une seule vidéo joue à la fois

function attendre(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

// Durée estimée pour lire un texte à voix haute
function dureeEstimee(texte) {
  return Math.max(1200, texte.length * 62);
}

// Lit la narration et appelle surMorceau(k) quand le k-ième morceau
// de sous-titre doit s'afficher. Deux façons de le savoir :
//  - le téléphone indique le mot prononcé (événement "boundary") ;
//  - sinon, on répartit les morceaux sur la durée estimée.
function parler(decoupage, surMorceau) {
  const { voix, morceaux } = decoupage;
  const estime = dureeEstimee(voix);
  let parLaVoix = false;
  const minuteurs = [];
  let t = 0;
  morceaux.forEach((m, k) => {
    minuteurs.push(setTimeout(() => !parLaVoix && surMorceau(k), t));
    const lettres = m.mots.reduce((s, x) => s + x.texte.length + 1, 0);
    t += (lettres / (voix.length + 1)) * estime;
  });

  return new Promise((ok) => {
    let fini = false;
    const terminer = () => {
      if (fini) return;
      fini = true;
      minuteurs.forEach(clearTimeout);
      clearTimeout(securite);
      ok();
    };
    const avecVoix = sonActif && voixDisponible && voix.length > 0;
    const securite = setTimeout(terminer, avecVoix ? estime * 1.8 + 2000 : estime);
    if (!avecVoix) return;

    const phrase = new SpeechSynthesisUtterance(voix);
    phrase.lang = "fr-FR";
    phrase.rate = 1.1;
    const voixFr = speechSynthesis.getVoices().find((v) => v.lang.startsWith("fr"));
    if (voixFr) phrase.voice = voixFr;

    phrase.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      parLaVoix = true;
      let k = 0;
      while (k + 1 < morceaux.length && morceaux[k + 1].debut <= e.charIndex) k++;
      surMorceau(k);
    };
    phrase.onend = terminer;
    phrase.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") terminer();
      else setTimeout(terminer, estime); // voix bloquée : on laisse le temps de lire
    };
    speechSynthesis.speak(phrase);
  });
}

function couperVoix() {
  if (voixDisponible) speechSynthesis.cancel();
}

// Le téléphone n'autorise le son qu'après un premier tap
let dejaTouche = false;
document.addEventListener("click", () => (dejaTouche = true), { capture: true });
function aDejaTouche() {
  return navigator.userActivation ? navigator.userActivation.hasBeenActive : dejaTouche;
}

// -------------------------------------------------------------
// 5. Les plans "infographie"
// -------------------------------------------------------------
const INFOGRAPHIES = {
  // Une feuille de papier, une ligne surlignée, un tampon
  document(p) {
    const feuille = creer("div", "papier");
    feuille.append(creer("h4", "", p.titre || ""));
    (p.lignes || []).forEach((ligne) => {
      const l = creer("p");
      ecrireSurligne(l, ligne);
      feuille.append(l);
    });
    if (p.tampon) {
      feuille.classList.add("avec-tampon"); // laisse de la place en bas pour le tampon
      feuille.append(creer("div", "tampon", p.tampon));
    }
    return feuille;
  },

  // Un extrait de texte officiel, avec le passage clé surligné
  loi(p) {
    const extrait = creer("div", "extrait");
    extrait.append(creer("p", "extrait-source", "⚖️ " + (p.source || "")));
    const texte = creer("p", "extrait-texte");
    ecrireSurligne(texte, p.texte);
    extrait.append(texte);
    return extrait;
  },

  // Une liste numérotée : les étapes passées sont cochées
  etapes(p) {
    const panneau = creer("div", "panneau");
    panneau.append(creer("p", "panneau-titre", p.titre || ""));
    const liste = creer("ol", "liste-etapes");
    (p.items || []).forEach((item, i) => {
      const actif = p.actif ?? 0;
      const li = creer("li", i < actif ? "passee" : i === actif ? "active" : "");
      li.append(creer("span", "puce", i < actif ? "✓" : String(i + 1)), creer("span", "", item));
      liste.append(li);
    });
    panneau.append(liste);
    return panneau;
  },

  // Un chiffre clé en énorme
  chiffre(p) {
    const bloc = creer("div", "chiffre");
    bloc.append(creer("p", "chiffre-gros", p.texte || ""));
    if (p.sous) bloc.append(creer("p", "chiffre-sous", p.sous));
    return bloc;
  },

  // Deux colonnes face à face : idéal pour "ne pas confondre"
  versus(p) {
    const bloc = creer("div", "versus");
    [p.gauche, p.droite].forEach((col, i) => {
      if (!col) return;
      const c = creer("div", "versus-col " + (i === 0 ? "gauche" : "droite"));
      c.append(creer("p", "versus-titre", col.titre || ""));
      (col.lignes || []).forEach((l) => {
        const ligne = creer("p");
        ecrireSurligne(ligne, l);
        c.append(ligne);
      });
      bloc.append(c);
      if (i === 0) bloc.append(creer("div", "versus-vs", "VS"));
    });
    return bloc;
  },

  // Des lignes qui apparaissent une à une, puis le total
  calcul(p) {
    const panneau = creer("div", "panneau calcul");
    panneau.append(creer("p", "panneau-titre", p.titre || ""));
    (p.lignes || []).forEach(([libelle, valeur], i) => {
      const l = creer("p", "calcul-ligne");
      l.style.animationDelay = 0.3 + i * 0.5 + "s";
      l.append(creer("span", "", libelle), creer("b", "", valeur));
      panneau.append(l);
    });
    if (p.total) {
      const t = creer("p", "calcul-total");
      t.style.animationDelay = 0.3 + (p.lignes || []).length * 0.5 + 0.2 + "s";
      t.append(creer("span", "", p.total[0]), creer("b", "", p.total[1]));
      panneau.append(t);
    }
    return panneau;
  },
};

// -------------------------------------------------------------
// 6. Fabrication d'une vidéo dans une carte
// -------------------------------------------------------------
function ajouterVideo(section, carte, etiquettes) {
  const casting = carte.personnages || {};
  const plans = carte.scenes || [];
  const aRetenir = (carte.reponse || "").split("\n").filter(Boolean);
  const premiereScene = plans.find((p) => !p.type || p.type === "scene");

  // La suite des étapes : accroche, chaque plan, puis "à retenir"
  const etapes = [
    { type: "intro", texte: decouper(carte.contenu), mini: 2500 },
    ...plans.map((p) => ({ type: "plan", plan: p, texte: decouper(p.narration), mini: 1700 })),
    { type: "fin", texte: decouper("À retenir" + NB + "!"), mini: 7000 },
  ];

  // --- Construction de l'écran ---
  const scene = creer("div", "scene");
  const monde = creer("div", "monde");             // ce que filme la "caméra"
  const travelling = creer("div", "travelling");   // léger zoom continu
  const decor = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  decor.setAttribute("viewBox", "0 0 360 640");
  decor.setAttribute("preserveAspectRatio", "xMidYMax slice");
  decor.classList.add("decor");
  travelling.append(decor);
  monde.append(travelling);

  const persos = {};
  Object.entries(casting).forEach(([id, p]) => {
    const div = creer("div", "perso");
    const bulle = creer("div", "bulle");
    div.append(bulle);
    travelling.append(div);
    persos[id] = { div, bulle, infos: p, emotion: null, x: 50 };
  });

  const graphique = creer("div", "graphique");     // plans infographie
  const lumiere = creer("div", "lumiere");         // bords assombris
  const popup = creer("div", "popup");
  const sousTitre = creer("div", "sous-titre");

  const ecranTitre = creer("div", "ecran ecran-titre");
  ecranTitre.append(creer("p", "ecran-etiquette", "🎬 " + carte.titre));

  const ecranFin = creer("div", "ecran ecran-fin");
  const carteFin = creer("div", "carte-fin");
  const liste = creer("ul", "liste-retenir");
  aRetenir.forEach((ligne) => {
    const li = creer("li");
    ecrireSurligne(li, ligne);
    liste.append(li);
  });
  const boutonRevoir = creer("button", "bouton-revoir", "↻ Revoir");
  carteFin.append(creer("h3", "", "✅ À retenir"), liste, boutonRevoir);
  ecranFin.append(carteFin);

  // Infos en bas à gauche, comme la description d'un TikTok
  const infos = creer("div", "infos");
  infos.append(etiquettes, creer("p", "infos-titre", carte.titre));

  // Barre de progression en segments, tout en bas
  const progression = creer("div", "progression");
  const segments = etapes.map(() => {
    const seg = creer("span", "segment");
    const remplissage = creer("i");
    seg.append(remplissage);
    progression.append(seg);
    return remplissage;
  });

  const boutonLecture = creer("button", "bouton-lecture", "▶");
  boutonLecture.setAttribute("aria-label", "Lancer la vidéo");

  scene.append(monde, graphique, lumiere, popup, ecranTitre, ecranFin, sousTitre, infos, progression, boutonLecture);
  section.append(scene);

  // --- La caméra ---
  // Plan large : on voit tout. Gros plan : on zoome sur la tête d'un
  // personnage et on floute le reste, comme une vraie caméra.
  function cadrer(cible) {
    Object.values(persos).forEach((q) => q.div.classList.remove("flou"));
    if (!cible || !persos[cible]) {
      monde.style.transform = "";
      monde.classList.remove("gros-plan");
      return;
    }
    const W = scene.clientWidth;
    const H = scene.clientHeight;
    const p = persos[cible];
    const hauteurPerso = W * 0.32 * 2;
    const tete = { x: (p.x / 100) * W, y: H * 0.8 - hauteurPerso * 0.74 };
    const zoom = 2.2;
    monde.style.transform = `translate(${W / 2 - zoom * tete.x}px, ${H * 0.42 - zoom * tete.y}px) scale(${zoom})`;
    monde.classList.add("gros-plan");
    Object.entries(persos).forEach(([id, q]) => q.div.classList.toggle("flou", id !== cible));
  }

  // --- Affichage d'une étape ---
  let decorActuel = null;

  function afficherScene(plan, avecPersos) {
    if (plan.decor !== decorActuel) {
      decorActuel = plan.decor;
      decor.innerHTML = DEFS + (DECORS[plan.decor] || DECORS.rue);
    }
    Object.entries(persos).forEach(([id, p]) => {
      const reglage = avecPersos ? (plan.persos || {})[id] : undefined;
      if (reglage === undefined) {
        p.div.classList.remove("visible", "parle");
        return;
      }
      // Valeur = 40   ou   { "x": 40, "emotion": "triste" }
      const x = typeof reglage === "number" ? reglage : reglage.x;
      const emotion = (typeof reglage === "object" && reglage.emotion) || "neutre";
      if (emotion !== p.emotion) {
        p.div.querySelector("svg")?.remove();
        p.div.insertAdjacentHTML("afterbegin", dessinerPerso(p.infos, emotion));
        p.emotion = emotion;
      }
      p.x = x;
      p.div.style.left = x + "%";
      p.div.classList.add("visible");
      const parle = plan.parle === id && !!plan.bulle;
      p.div.classList.toggle("parle", parle);
      p.bulle.textContent = parle ? plan.bulle : "";
      p.bulle.className = "bulle" + (x < 30 ? " gauche" : x > 70 ? " droite" : "");
    });
    cadrer(avecPersos ? plan.gros_plan : null);
  }

  function afficherEtape(i) {
    const etape = etapes[i];
    ecranTitre.classList.toggle("visible", etape.type === "intro");
    ecranFin.classList.toggle("visible", etape.type === "fin");
    sousTitre.textContent = "";

    // Barre de progression
    segments.forEach((seg, j) => {
      seg.style.transition = "none";
      seg.style.width = j < i ? "100%" : "0%";
    });
    const actuel = segments[i];
    void actuel.offsetWidth;
    actuel.style.transition = `width ${Math.max(dureeEstimee(etape.texte.voix), etape.mini)}ms linear`;
    actuel.style.width = "100%";

    // "Coupe" : à chaque plan, on relance le léger zoom continu
    [travelling, graphique].forEach((el) => {
      el.classList.remove("zoom-lent");
      void el.offsetWidth;
      el.classList.add("zoom-lent");
    });

    const plan = etape.type === "plan" ? etape.plan : null;
    const type = plan ? plan.type || "scene" : null;

    // Décor : celui du plan, ou celui de la 1re scène pendant l'accroche
    if (type === "scene") afficherScene(plan, true);
    else if (etape.type === "intro" && premiereScene) afficherScene(premiereScene, false);

    // Infographie (les sous-titres descendent pour ne pas la cacher)
    sousTitre.classList.toggle("bas", !!plan && type !== "scene");
    graphique.textContent = "";
    graphique.classList.toggle("visible", !!plan && type !== "scene");
    if (plan && INFOGRAPHIES[type]) graphique.append(INFOGRAPHIES[type](plan));

    // Pop-up (seulement sur les scènes)
    const objet = type === "scene" && plan.objet;
    popup.textContent = objet ? (objet.emoji ? objet.emoji + " " : "") + objet.texte : "";
    popup.classList.remove("visible");
    if (objet) {
      void popup.offsetWidth;
      popup.classList.add("visible");
    }
  }

  // Affiche le k-ième morceau de sous-titre (mots clés en couleur)
  function montrerMorceau(decoupage, k) {
    const morceau = decoupage.morceaux[k];
    if (!morceau) return;
    sousTitre.textContent = "";
    morceau.mots.forEach((m, j) => {
      if (j > 0) sousTitre.append(" ");
      sousTitre.append(creer(m.fort ? "mark" : "span", "", m.texte));
    });
    sousTitre.classList.remove("pop");
    void sousTitre.offsetWidth;
    sousTitre.classList.add("pop");
  }

  // --- Lecture ---
  let jeton = 0;      // change à chaque arrêt : les anciennes lectures s'arrêtent
  let index = 0;      // étape en cours
  let etat = "arret"; // "arret", "lecture", "pause" ou "fini"

  async function derouler(depuis) {
    const monJeton = ++jeton;
    etat = "lecture";
    scene.classList.remove("en-pause");
    for (let i = depuis; i < etapes.length; i++) {
      index = i;
      afficherEtape(i);
      const etape = etapes[i];
      const surMorceau = (k) => {
        if (monJeton === jeton && etape.type !== "fin") montrerMorceau(etape.texte, k);
      };
      await Promise.all([parler(etape.texte, surMorceau), attendre(etape.mini)]);
      if (monJeton !== jeton) return;
      await attendre(120); // coupe sèche entre deux plans, comme au montage
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
// 7. Fonctions utilisées par app.js
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
