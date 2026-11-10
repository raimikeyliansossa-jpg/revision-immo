// =============================================================
// Révision Immo — V1
// Rôle de ce fichier : lire cards.json et fabriquer une carte
// plein écran pour chaque élément.
// =============================================================

// Noms lisibles pour l'affichage (la clé = ce qui est écrit dans cards.json)
const NOMS_TYPES = {
  notion: "📘 Notion",
  quiz: "❓ Quiz",
  situation: "💼 Situation",
  piege: "⚠️ Piège",
};

const NOMS_MATIERES = {
  eco: "Économie",
  juridique: "Juridique",
  transaction: "Transaction",
  copropriete: "Copropriété",
  "gestion-locative": "Gestion locative",
};

// Texte du bouton selon le type de carte
const TEXTE_BOUTON = {
  quiz: "👆 Tap pour voir la réponse",
  situation: "👆 Tap pour voir la solution",
  piege: "👆 Tap pour voir le piège",
};

// On récupère les éléments HTML dont on a besoin
const fil = document.getElementById("fil");
const compteur = document.getElementById("compteur");

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
// Fabrique UNE carte (une <section>) à partir d'un objet du JSON
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

    // Au tap, on ajoute la classe "revelee" : le CSS fait le reste
    bouton.addEventListener("click", () => {
      section.classList.add("revelee");
    });

    section.append(bouton, reponse);
  }

  return section;
}

// -------------------------------------------------------------
// Les variables qui décrivent "l'état" de l'appli
// -------------------------------------------------------------
let toutesLesCartes = [];   // toutes les cartes lues dans cards.json
let filtreActif = "tout";   // "tout" ou une clé de matière (ex: "juridique")
let observateur = null;     // surveille quelle carte est à l'écran
let melange = false;        // true = cartes dans un ordre aléatoire

const filtres = document.getElementById("filtres");
const boutonMelanger = document.getElementById("bouton-melanger");
const CLE_MEMOIRE = "revision-immo-filtre"; // nom de la "case" en mémoire du navigateur
const CLE_MELANGE = "revision-immo-melange";

// -------------------------------------------------------------
// Mélange une liste au hasard (méthode de Fisher-Yates).
// Idée : on part de la fin, et on échange chaque carte avec une
// carte tirée au sort parmi celles qui sont avant elle.
// -------------------------------------------------------------
function melanger(liste) {
  const copie = [...liste]; // on mélange une copie, l'original ne bouge pas
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // nombre au hasard entre 0 et i
    [copie[i], copie[j]] = [copie[j], copie[i]];   // on échange les deux cartes
  }
  return copie;
}

// Petite fonction pour écrire en mémoire sans planter si c'est bloqué
function memoriser(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch (e) {}
}

// -------------------------------------------------------------
// Met à jour le compteur "3 / 10" selon la carte visible.
// IntersectionObserver = le navigateur nous prévient quand
// une carte occupe la majorité de l'écran.
// -------------------------------------------------------------
function suivreCarteVisible(sections) {
  const total = sections.length;

  // Si on surveillait les anciennes cartes, on arrête
  if (observateur) observateur.disconnect();

  observateur = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          const numero = sections.indexOf(entree.target) + 1;
          compteur.textContent = numero + " / " + total;
        }
      });
    },
    { root: fil, threshold: 0.6 } // "visible" = au moins 60 % à l'écran
  );

  sections.forEach((s) => observateur.observe(s));
}

// -------------------------------------------------------------
// Affiche dans le fil uniquement les cartes du filtre choisi
// -------------------------------------------------------------
function afficherFil() {
  // .filter() garde seulement les cartes qui passent le test
  let cartes =
    filtreActif === "tout"
      ? toutesLesCartes
      : toutesLesCartes.filter((c) => c.matiere === filtreActif);

  // Si le mélange est activé, on tire un nouvel ordre au hasard
  if (melange) cartes = melanger(cartes);

  fil.innerHTML = ""; // on vide le fil
  fil.scrollTop = 0;  // et on remonte tout en haut

  if (cartes.length === 0) {
    fil.append(creer("p", "chargement", "Aucune carte pour cette matière… pour l'instant !"));
    compteur.textContent = "0 / 0";
    return;
  }

  const sections = cartes.map(creerCarte);
  sections.forEach((s) => fil.append(s));

  // Indice "swipe" uniquement sur la première carte, s'il y en a une suivante
  if (sections.length > 1) {
    sections[0].append(creer("div", "indice-swipe", "⬆️ Swipe vers le haut pour continuer"));
  }

  compteur.textContent = "1 / " + sections.length;
  suivreCarteVisible(sections);
}

// -------------------------------------------------------------
// Crée la rangée de boutons : "Tout", puis une par matière
// -------------------------------------------------------------
function creerFiltres() {
  // Liste des choix : [clé, nom affiché]
  const choix = [["tout", "Tout"], ...Object.entries(NOMS_MATIERES)];

  choix.forEach(([cle, nom]) => {
    // Combien de cartes dans cette matière ?
    const nombre =
      cle === "tout"
        ? toutesLesCartes.length
        : toutesLesCartes.filter((c) => c.matiere === cle).length;

    const bouton = creer("button", "filtre", nom + " · " + nombre);
    bouton.dataset.cle = cle; // on range la clé dans le bouton pour la retrouver
    if (cle === filtreActif) bouton.classList.add("actif");

    bouton.addEventListener("click", () => choisirFiltre(cle));
    filtres.append(bouton);
  });
}

// Fait défiler la rangée pour que le bouton actif soit bien visible
function centrerFiltreActif() {
  const actif = filtres.querySelector(".filtre.actif");
  if (actif) actif.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}

// -------------------------------------------------------------
// Quand on tape sur un filtre
// -------------------------------------------------------------
function choisirFiltre(cle) {
  filtreActif = cle;

  // Le bouton choisi devient "actif", les autres non
  filtres.querySelectorAll(".filtre").forEach((b) => {
    b.classList.toggle("actif", b.dataset.cle === cle);
  });
  centrerFiltreActif();

  // On retient le choix pour la prochaine ouverture de l'appli
  memoriser(CLE_MEMOIRE, cle);

  afficherFil();
}

// -------------------------------------------------------------
// Bouton "Mélanger" : un tap = on, un autre tap = off
// -------------------------------------------------------------
function mettreAJourBoutonMelanger() {
  boutonMelanger.classList.toggle("actif", melange);
  boutonMelanger.setAttribute("aria-pressed", melange);
}

boutonMelanger.addEventListener("click", () => {
  melange = !melange; // "!" inverse : true devient false, false devient true
  mettreAJourBoutonMelanger();
  memoriser(CLE_MELANGE, melange ? "oui" : "non");
  afficherFil(); // on réaffiche : mélangé, ou de nouveau dans l'ordre
});

// -------------------------------------------------------------
// Point de départ : on charge cards.json puis on affiche tout
// -------------------------------------------------------------
async function demarrer() {
  try {
    const reponse = await fetch("cards.json");
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);
    toutesLesCartes = await reponse.json();

    // On reprend le dernier filtre choisi, s'il existe encore
    try {
      const memo = localStorage.getItem(CLE_MEMOIRE);
      if (memo && (memo === "tout" || NOMS_MATIERES[memo])) filtreActif = memo;
      melange = localStorage.getItem(CLE_MELANGE) === "oui";
    } catch (e) {}

    mettreAJourBoutonMelanger();
    creerFiltres();
    centrerFiltreActif();
    afficherFil();
  } catch (erreur) {
    console.error(erreur);
    fil.innerHTML = "";
    fil.append(
      creer(
        "p",
        "chargement",
        "Impossible de charger cards.json. Ouvre l'appli via un petit serveur local (voir README), pas en double-cliquant sur le fichier."
      )
    );
  }
}

demarrer();
