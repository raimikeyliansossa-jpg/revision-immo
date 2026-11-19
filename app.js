// =============================================================
// Révision Immo
// Rôle de ce fichier : la navigation de l'appli.
//   Écran 1 « Accueil »  : les 5 matières.
//   Écran 2 « Matière »  : la liste de ses chapitres (thème, planning, progression).
//   Écran 3 « Chapitre » : le fil TikTok du chapitre (annonce → vidéos → examen).
// Les vidéos animées sont gérées dans video.js, l'examen dans examen.js,
// la mémoire de ta progression dans suivi.js.
// =============================================================

// Noms lisibles pour l'affichage (la clé = ce qui est écrit dans cards.json)
const NOMS_TYPES = {
  video: "🎬 Vidéo",
  examen: "📝 Examen",
  notion: "📘 Notion",
  quiz: "❓ Quiz",
  situation: "💼 Situation",
  piege: "⚠️ Piège",
};

const NOMS_MATIERES = {
  transaction: "Transaction",
  copropriete: "Copropriété",
  "gestion-locative": "Gestion locative",
  eco: "Économie",
  juridique: "Juridique",
};

const EMOJIS_MATIERES = {
  transaction: "🤝",
  copropriete: "🏢",
  "gestion-locative": "🔑",
  eco: "📈",
  juridique: "⚖️",
};

// Texte du bouton selon le type de carte
const TEXTE_BOUTON = {
  quiz: "👆 Tap pour voir la réponse",
  situation: "👆 Tap pour voir la solution",
  piege: "👆 Tap pour voir le piège",
};

// On récupère les éléments HTML dont on a besoin
const menu = document.getElementById("menu");
const entete = document.getElementById("entete");
const fil = document.getElementById("fil");
const compteur = document.getElementById("compteur");
const titreFil = document.getElementById("titre-fil");
brancherBoutonSon(document.getElementById("bouton-son"));

// -------------------------------------------------------------
// Petite fonction utilitaire : crée un élément HTML avec une
// classe et un texte. On utilise textContent (et pas innerHTML)
// pour que le texte des cartes soit toujours affiché tel quel.
// -------------------------------------------------------------
function creer(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte) el.textContent = texte;
  return el;
}

// -------------------------------------------------------------
// Les données, chargées au démarrage
// -------------------------------------------------------------
let toutesLesCartes = []; // cards.json : vidéos, examens, anciennes fiches
let chapitres = [];       // chapitres.json : la liste de tes chapitres du Drive
let planning = {};        // planning.json : ton planning de révision (tâche du matin)

// Les cartes d'un chapitre, dans l'ordre : vidéos, autres fiches, puis l'examen à la fin
function cartesDuChapitre(idChapitre) {
  const ordre = { video: 0, examen: 2 };
  return toutesLesCartes
    .filter((c) => c.chap === idChapitre)
    .sort((a, b) => (ordre[a.type] ?? 1) - (ordre[b.type] ?? 1));
}

// Les fiches d'une matière qui ne sont rattachées à aucun chapitre
function complementsDeLaMatiere(matiere) {
  return toutesLesCartes.filter((c) => c.matiere === matiere && !c.chap);
}

// -------------------------------------------------------------
// Où j'en suis ?
//  - « planning » : ce que disent tes tâches planifiées (niveau R0 à R6) ;
//  - « appli »    : vidéos vues et notes d'examen enregistrées ici (suivi.js).
// -------------------------------------------------------------

// "20/11/2026" → objet Date
function lireDate(texte) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texte || "");
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}

function aujourdhui() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Ce que dit le planning de révision pour un chapitre
function etatPlanning(chapitre) {
  const p = planning[chapitre.fichier];
  if (!p) return null;
  const niveau = Number(p.niveau) || 0;
  const date = lireDate(p.prochaine);
  const ecart = date ? Math.round((date - aujourdhui()) / 86400000) : null;

  let statut, classe;
  if (niveau >= 6) {
    statut = "✅ Maîtrisé (R6/6)";
    classe = "maitrise";
  } else if (niveau === 0) {
    statut = "⚪ Pas encore révisé";
    classe = "a-faire";
  } else {
    statut = "🟢 Révisé · R" + niveau + "/6";
    classe = "revise";
  }

  let prochaine = "";
  if (date && niveau < 6) {
    const quoi = niveau === 0 ? "Découverte" : "Prochaine révision";
    if (ecart < 0) prochaine = "⏰ " + quoi + " en retard (" + p.prochaine.slice(0, 5) + ")";
    else if (ecart === 0) prochaine = "📅 " + quoi + " aujourd'hui";
    else if (ecart === 1) prochaine = "📅 " + quoi + " demain";
    else prochaine = "📅 " + quoi + " le " + p.prochaine.slice(0, 5);
  }
  return { niveau, statut, classe, prochaine, ecart };
}

// Ce que tu as fait dans l'appli pour un chapitre
function etatAppli(idChapitre) {
  const cartes = cartesDuChapitre(idChapitre);
  const videos = cartes.filter((c) => c.type === "video");
  const examen = cartes.find((c) => c.type === "examen");
  const suivi = lireSuivi();
  const vues = videos.filter((v) => suivi.videos[v.id] && suivi.videos[v.id].vue).length;
  const resultat = examen ? suivi.examens[examen.id] : null;
  return { cartes, videos, examen, vues, resultat };
}

// -------------------------------------------------------------
// ÉCRAN 1 : l'accueil, avec les 5 matières
// -------------------------------------------------------------
function afficherAccueil() {
  quitterFil();
  menu.textContent = "";
  menu.scrollTop = 0;

  const haut = creer("div", "menu-haut");
  haut.append(creer("h1", "menu-titre", "Révision Immo"), creer("p", "menu-sous-titre", "BTS Professions Immobilières · choisis ta matière"));
  menu.append(haut);

  // Ce que ton planning te demande aujourd'hui (ou ce qui est en retard)
  const duJour = chapitres
    .map((c) => ({ c, p: etatPlanning(c) }))
    .filter((x) => x.p && x.p.niveau < 6 && x.p.ecart !== null && x.p.ecart <= 0);
  if (duJour.length) {
    const bloc = creer("div", "bloc-jour");
    bloc.append(creer("p", "bloc-jour-titre", "📅 Au programme aujourd'hui"));
    duJour.forEach(({ c, p }) => {
      const b = creer("button", "ligne-jour");
      b.append(
        creer("span", "", EMOJIS_MATIERES[c.matiere] + " " + NOMS_MATIERES[c.matiere] + " · Ch. " + c.numero),
        creer("small", "", p.ecart < 0 ? "en retard" : p.niveau === 0 ? "découverte" : "R" + (p.niveau + 1) + "/6")
      );
      b.addEventListener("click", () => naviguer({ ecran: "chapitre", id: c.id }));
      bloc.append(b);
    });
    menu.append(bloc);
  }

  const grille = creer("div", "grille-matieres");
  Object.keys(NOMS_MATIERES).forEach((matiere) => {
    const chaps = chapitres.filter((c) => c.matiere === matiere);
    const revises = chaps.filter((c) => {
      const p = etatPlanning(c);
      return p && p.niveau > 0;
    }).length;
    let videos = 0;
    let vues = 0;
    chaps.forEach((c) => {
      const a = etatAppli(c.id);
      videos += a.videos.length;
      vues += a.vues;
    });

    const tuile = creer("button", "tuile-matiere m-" + matiere);
    tuile.append(
      creer("span", "tuile-emoji", EMOJIS_MATIERES[matiere]),
      creer("span", "tuile-nom", NOMS_MATIERES[matiere]),
      creer("span", "tuile-detail", chaps.length + " chapitres · " + revises + " révisé" + (revises > 1 ? "s" : "")),
      creer("span", "tuile-detail", videos ? "🎬 " + vues + "/" + videos + " vidéos vues" : "🎬 Vidéos bientôt")
    );
    const barre = creer("span", "jauge");
    const plein = creer("i");
    plein.style.width = (chaps.length ? (revises / chaps.length) * 100 : 0) + "%";
    barre.append(plein);
    tuile.append(barre);
    tuile.addEventListener("click", () => naviguer({ ecran: "matiere", matiere }));
    grille.append(tuile);
  });
  menu.append(grille);

  if (planning.maj) {
    menu.append(creer("p", "menu-note", "Planning de révision mis à jour le " + planning.maj.split("-").reverse().join("/") + " par ta tâche du matin."));
  }
}

// -------------------------------------------------------------
// ÉCRAN 2 : les chapitres d'une matière
// -------------------------------------------------------------
function afficherMatiere(matiere) {
  quitterFil();
  menu.textContent = "";
  menu.scrollTop = 0;

  const retour = creer("button", "bouton-retour", "← Matières");
  retour.addEventListener("click", () => history.back());
  const haut = creer("div", "menu-haut");
  haut.append(retour, creer("h1", "menu-titre", EMOJIS_MATIERES[matiere] + " " + NOMS_MATIERES[matiere]));
  menu.append(haut);

  chapitres
    .filter((c) => c.matiere === matiere)
    .sort((a, b) => a.numero - b.numero)
    .forEach((c) => {
      const p = etatPlanning(c);
      const a = etatAppli(c.id);
      const bloc = creer("button", "carte-chapitre" + (a.cartes.length ? "" : " vide") + (p ? " " + p.classe : ""));

      bloc.append(
        creer("span", "chapitre-numero", "CHAPITRE " + c.numero),
        creer("span", "chapitre-titre", c.titre),
        creer("span", "chapitre-theme", c.theme)
      );

      // Ligne 1 : le planning (tâches planifiées)
      if (p) {
        const ligne = creer("span", "chapitre-ligne");
        ligne.append(creer("b", "pastille " + p.classe, p.statut));
        if (p.prochaine) ligne.append(creer("span", "", p.prochaine));
        bloc.append(ligne);
      }

      // Ligne 2 : ce que tu as fait dans l'appli
      const ligneAppli = creer("span", "chapitre-ligne doux");
      if (a.videos.length) {
        ligneAppli.append(creer("span", "", (a.vues === a.videos.length ? "✓ " : "🎬 ") + a.vues + "/" + a.videos.length + " vidéos vues"));
      } else if (a.cartes.length) {
        ligneAppli.append(creer("span", "", "📘 " + a.cartes.length + " fiche" + (a.cartes.length > 1 ? "s" : "") + " · vidéos bientôt"));
      } else {
        ligneAppli.append(creer("span", "", "🎬 Vidéos bientôt"));
      }
      if (a.examen) {
        ligneAppli.append(creer("span", "", a.resultat ? "📝 Examen " + a.resultat.derniere.note + "/20" : "📝 Examen à passer"));
      }
      bloc.append(ligneAppli);

      if (a.cartes.length) bloc.addEventListener("click", () => naviguer({ ecran: "chapitre", id: c.id }));
      else bloc.disabled = true;
      menu.append(bloc);
    });

  // Les fiches qui ne sont dans aucun chapitre
  const plus = complementsDeLaMatiere(matiere);
  if (plus.length) {
    const bloc = creer("button", "carte-chapitre complements");
    bloc.append(
      creer("span", "chapitre-numero", "EN PLUS"),
      creer("span", "chapitre-titre", "Compléments"),
      creer("span", "chapitre-theme", plus.map((c) => c.titre).join(" · "))
    );
    bloc.addEventListener("click", () => naviguer({ ecran: "complements", matiere }));
    menu.append(bloc);
  }
}

// -------------------------------------------------------------
// ÉCRAN 3 : le fil TikTok d'un chapitre
// -------------------------------------------------------------
function creerCarte(carte) {
  // La classe du type (ex: "quiz") sert à choisir la couleur dans le CSS
  const section = creer("section", "carte " + carte.type);

  // Étiquettes : type + matière
  const etiquettes = creer("div", "etiquettes");
  etiquettes.append(
    creer("span", "etiquette type", NOMS_TYPES[carte.type] || carte.type),
    creer("span", "etiquette", NOMS_MATIERES[carte.matiere] || carte.matiere)
  );

  // Une vidéo plein écran : c'est video.js qui construit tout
  if (carte.type === "video") {
    ajouterVideo(section, carte, etiquettes);
    return section;
  }
  // Un examen de fin de chapitre : c'est examen.js
  if (carte.type === "examen") {
    ajouterExamen(section, carte, etiquettes);
    return section;
  }

  section.append(
    etiquettes,
    creer("p", "chapitre", carte.chapitre),
    creer("h2", "titre", carte.titre),
    creer("p", "contenu", carte.contenu)
  );

  if (carte.type === "notion") {
    // Une notion se lit directement : la réponse est visible tout de suite
    section.append(creer("p", "reponse", "💡 " + carte.reponse));
  } else {
    // Les autres types : bouton + réponse cachée
    const bouton = creer("button", "bouton-reveler", TEXTE_BOUTON[carte.type]);
    const reponse = creer("p", "reponse cachee", carte.reponse);
    bouton.addEventListener("click", () => section.classList.add("revelee"));
    section.append(bouton, reponse);
  }

  return section;
}

// La carte d'annonce, au début du fil : « Chapitre 1 · tel thème »
function creerAnnonce(chapitre, cartes) {
  const section = creer("section", "carte annonce m-" + chapitre.matiere);
  const nbVideos = cartes.filter((c) => c.type === "video").length;
  const examen = cartes.some((c) => c.type === "examen");
  const nbAutres = cartes.length - nbVideos - (examen ? 1 : 0);

  const contenu = [];
  if (nbVideos) contenu.push("🎬 " + nbVideos + " vidéo" + (nbVideos > 1 ? "s" : ""));
  if (nbAutres) contenu.push("📘 " + nbAutres + " fiche" + (nbAutres > 1 ? "s" : ""));
  if (examen) contenu.push("📝 examen en situation");

  section.append(
    creer("p", "annonce-matiere", EMOJIS_MATIERES[chapitre.matiere] + " " + NOMS_MATIERES[chapitre.matiere]),
    creer("p", "annonce-numero", chapitre.numero ? "CHAPITRE " + chapitre.numero : "EN PLUS"),
    creer("h2", "annonce-titre", chapitre.titre),
    creer("p", "annonce-theme", chapitre.theme),
    creer("p", "annonce-contenu", contenu.join(" · "))
  );

  const p = chapitre.fichier ? etatPlanning(chapitre) : null;
  if (p) section.append(creer("p", "pastille " + p.classe, p.statut + (p.prochaine ? " · " + p.prochaine : "")));

  // Le gros bouton jaune : ce tap "débloque" aussi le son du téléphone
  const go = creer("button", "bouton-commencer", "▶ Commencer");
  go.addEventListener("click", () => {
    const suivante = section.nextElementSibling;
    if (suivante) suivante.scrollIntoView({ behavior: "smooth" });
  });
  section.append(go, creer("div", "indice-swipe", "⬆️ ou swipe vers le haut"));
  return section;
}

let observateur = null; // surveille quelle carte est à l'écran

// Met à jour le compteur "3 / 9" et lance la vidéo visible
function suivreCarteVisible(sections) {
  if (observateur) observateur.disconnect();
  observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          const numero = sections.indexOf(entree.target);
          compteur.textContent = numero === 0 ? "Intro" : numero + " / " + (sections.length - 1);
          carteVisible(entree.target); // lance la vidéo si c'en est une
        }
      });
    },
    { root: fil, threshold: 0.6 } // "visible" = au moins 60 % à l'écran
  );
  sections.forEach((s) => observateur.observe(s));
}

function ouvrirFil(chapitre, cartes) {
  arreterVideos();
  menu.hidden = true;
  entete.hidden = false;
  fil.hidden = false;
  fil.textContent = "";
  fil.scrollTop = 0;
  titreFil.textContent = NOMS_MATIERES[chapitre.matiere] + (chapitre.numero ? " · Ch. " + chapitre.numero : " · Compléments");

  const sections = [creerAnnonce(chapitre, cartes), ...cartes.map(creerCarte)];
  sections.forEach((s) => fil.append(s));
  suivreCarteVisible(sections);
}

function quitterFil() {
  arreterVideos();
  if (observateur) observateur.disconnect();
  fil.textContent = "";
  fil.hidden = true;
  entete.hidden = true;
  menu.hidden = false;
}

// ✕ = fermer le chapitre (comme le bouton retour du téléphone)
document.getElementById("bouton-fermer").addEventListener("click", () => history.back());

// -------------------------------------------------------------
// La navigation entre les écrans.
// On utilise l'historique du navigateur : le bouton « retour »
// du téléphone ferme le chapitre au lieu de quitter l'appli.
// -------------------------------------------------------------
function afficher(etat) {
  if (etat && etat.ecran === "matiere" && NOMS_MATIERES[etat.matiere]) return afficherMatiere(etat.matiere);
  if (etat && etat.ecran === "chapitre") {
    const c = chapitres.find((x) => x.id === etat.id);
    if (c) return ouvrirFil(c, cartesDuChapitre(c.id));
  }
  if (etat && etat.ecran === "complements" && NOMS_MATIERES[etat.matiere]) {
    const faux = { matiere: etat.matiere, titre: "Compléments", theme: "Les fiches en plus, hors chapitre." };
    return ouvrirFil(faux, complementsDeLaMatiere(etat.matiere));
  }
  afficherAccueil();
}

function naviguer(etat) {
  // Depuis l'accueil, on passe d'abord par la matière : « retour » y ramène
  if (etat.ecran === "chapitre" && (!history.state || history.state.ecran !== "matiere")) {
    const c = chapitres.find((x) => x.id === etat.id);
    if (c) history.pushState({ ecran: "matiere", matiere: c.matiere }, "");
  }
  history.pushState(etat, "");
  afficher(etat);
}

window.addEventListener("popstate", (e) => afficher(e.state));

// -------------------------------------------------------------
// Point de départ : on charge les 3 fichiers puis on affiche l'accueil
// -------------------------------------------------------------
async function chargerJSON(fichier, parDefaut) {
  try {
    const r = await fetch(fichier, { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } catch (e) {
    if (parDefaut !== undefined) return parDefaut;
    throw e;
  }
}

async function demarrer() {
  try {
    toutesLesCartes = await chargerJSON("cards.json");
    chapitres = await chargerJSON("chapitres.json");
    const p = await chargerJSON("planning.json", {}); // pas grave s'il manque
    planning = p.chapitres || {};
    planning.maj = p.maj;
    await voixPretes; // la liste des voix enregistrées (video.js)

    history.replaceState({ ecran: "accueil" }, "");
    afficherAccueil();
  } catch (erreur) {
    console.error(erreur);
    menu.textContent = "";
    menu.append(
      creer(
        "p",
        "chargement",
        "Impossible de charger les cartes. Ouvre l'appli via un petit serveur local (voir README), pas en double-cliquant sur le fichier."
      )
    );
  }
}

demarrer();
