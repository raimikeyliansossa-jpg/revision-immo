# Brief complet — Appli de révision « style TikTok » pour le BTS Professions Immobilières

> Récapitulatif de tout ce qui a été demandé et construit, à réutiliser pour démarrer un nouveau projet.

---

## 1. L'idée en une phrase

Une appli web mobile pour réviser le **BTS Professions Immobilières** comme on scrolle TikTok : un fil vertical plein écran, **une vidéo courte animée par notion**, on swipe pour passer à la suivante. L'effet recherché, c'est le côté addictif de TikTok, mais pour apprendre ses cours.

**Pas** de likes, de commentaires ni de partage : seulement des vidéos courtes qui expliquent une notion, puis la suivante, puis la suivante…

---

## 2. Profil et contraintes

- Je débute en code : **chaque étape doit être expliquée simplement**, en français.
- Téléphone : **Samsung (Android)**. Au départ, l'appli était pensée pour iPhone ; il faut l'adapter à Android (Samsung Internet et Chrome).
- Technique : **HTML / CSS / JavaScript sans framework**, simple à comprendre.
- Les données sont dans des fichiers JSON (au départ `cards.json`).
- L'appli doit pouvoir être **mise en ligne** (GitHub Pages) et **installée sur l'écran d'accueil** du téléphone : manifeste et icône.
- Mes cours sont dans **Google Drive**, rangés par matière et par chapitre (Google Docs).

---

## 3. Matières du BTS

`eco` (économie), `juridique`, `transaction`, `copropriete`, `gestion-locative`

---

## 4. La vision des vidéos (le cœur du projet)

Je veux des vidéos **exactement dans le style des vidéos TikTok « explainer » / storytelling animées** :

### Format
- **Plein écran vertical** (9:16), la vidéo occupe tout l'écran.
- **20 à 60 secondes** par vidéo.
- Structure : **Titre / accroche → problématique → déroulé animé → « À retenir »**.
- Ton **storytelling** : on raconte une histoire. Exemple : « Voici Martin. Il veut vendre sa maison. Mais il n'a aucune idée de comment faire… »

### Mise en scène
- **Petits personnages animés** qui jouent une **mise en situation**. Exemple : une personne qui veut acheter un bien, l'agent immobilier, puis tout le trajet jusqu'à l'achat (mandat → visite → offre → compromis → prêt → notaire → clés).
- **Émotions** sur les visages : content, triste, surpris, en larmes, fâché, joues rouges.
- **Caméra vivante** : gros plans sur les visages avec **arrière-plan flou**, léger zoom continu, **plans très courts** (l'image change toutes les 1 à 3 secondes).
- **Ambiance chaude** : lampes qui brillent, bords de l'image assombris.
- **Décors** : rue (maison à vendre), agence immobilière, banque, étude notariale, appartement, CCI…

### Infographies entre les scènes (comme dans les vidéos de référence)
- **Document** à l'écran (mandat, lettre, devis…) avec une **ligne surlignée au stabilo jaune** et un **tampon** qui s'écrase (« SIGNÉ », « ART. 72 »…).
- **Extrait de loi / texte officiel** surligné.
- **Liste d'étapes numérotées** (1, 2, 3…) qui se cochent au fur et à mesure.
- **Chiffre clé énorme** (« 10 JOURS », « 3 ANS »…).
- **Calcul ligne par ligne** jusqu'au **TOTAL** en gros.
- **« Versus »** : deux colonnes face à face pour les pièges « à ne pas confondre ».
- **Pop-ups** qui surgissent (📄 Mandat, 🔑 Les clés, 💶 Prêt accepté…).

### Sous-titres
- **2 à 3 mots à la fois**, **énormes**, blancs avec **contour noir**.
- Le **mot clé en couleur** (jaune).
- Synchronisés avec la voix.

### La voix ⚠️ (point très important)
- La voix doit être **comme dans les vidéos TikTok de référence** : **voix d'homme, grave, chaude, posée, style narrateur** (analyse des vidéos de référence : fréquence ≈ 125-140 Hz).
- **Refusé** : la voix de synthèse du téléphone (« horrible ») et la voix open source Kokoro (« trop robotique »).
- Piste retenue : **ElevenLabs** (voix IA premium, offre gratuite de 10 000 caractères/mois), modèle multilingue, voix française masculine de type narrateur. Prévoir de faire écouter 2-3 voix avant de tout générer.
- Les voix sont générées à l'avance en **fichiers MP3** (un par plan), et l'appli les joue. La voix du téléphone reste seulement en secours.
- On ne copie pas la voix exacte d'un créateur existant : on prend une voix du même style.
- ✅ **Voix validée (19/11/2026) : Lily** (ElevenLabs, voice_id `pFZP5JQG7iQjIQuC4Bku`), voix **féminine douce et posée** : finalement préférée à une voix d'homme, car plus agréable pour rester concentré. Réglages : stability 0.55, style 0.15. Testées puis écartées : Daniel, Brian, George, Bill, Matilda, Alice.

### Les vidéos de référence envoyées
1. Animation 2D storytelling : un monde où chaque mensonge fait grandir le nez. Plans courts, gros plans, éclairage chaud, sous-titres mot par mot.
2. Explainer avec cartes : maps, labels, chiffres qui poppent, photos, mots clés en couleur.
3. **Explainer « permis B en candidat libre »** : *le modèle le plus proche de ce que je veux*. Un personnage, un devis, un tableau de calcul jusqu'au TOTAL, une liste « 1 · 2 · 3 », un document avec la date entourée, un extrait officiel surligné en jaune, un fond sombre avec un spot de lumière.
4. Storytelling 3D avec personnages (ingénieur des chemins de fer).

---

## 5. Fonctionnalités demandées

### Le fil
- Fil vertical **plein écran**, **une carte par écran**, **scroll-snap** (on swipe vers le haut pour passer à la suivante).
- **Lecture automatique** de la vidéo quand elle arrive à l'écran ; arrêt quand on la quitte.
- Au tout premier lancement, un **gros bouton ▶ jaune** (le téléphone bloque le son tant qu'on n'a pas touché l'écran). *J'aime beaucoup ce bouton jaune.*
- **Compteur** « 3 / 20 » en haut.
- **Filtre par matière** : boutons « Tout · 20 », « Transaction · 11 »… (le chiffre = nombre de cartes). Le dernier filtre est retenu.
- **🔀 Mélanger** : ordre aléatoire (on/off, retenu).
- **🔊 / 🔇** : couper ou remettre le son.

### Pendant la vidéo
- **Barre de progression** en petits traits en bas (un trait par plan).
- **Avancer / reculer sans recommencer depuis le début** :
  - tap à **gauche** = plan précédent ;
  - tap à **droite** = plan suivant ;
  - tap au **milieu** = pause ;
  - tap sur **un trait** de la barre = aller directement à ce moment.
- En bas à gauche, comme une description TikTok : matière + titre + suivi.

### Après la vidéo
- Écran **« À retenir »** : l'essentiel en quelques lignes, mots clés surlignés.
- Bouton **🧠 Quiz** (3 questions) pour vérifier qu'on a bien compris la vidéo : bonne réponse en vert, erreur en rouge avec l'explication, score final, boutons « Vidéo suivante » et « Revoir la vidéo ».
- Bouton **↻ Revoir**.

### Fin de chapitre
- Un **examen de mise en situation** par chapitre (environ 10 situations concrètes : « Tu es en agence, un client… que fais-tu ? »).
- **Note sur 20** + mention + liste « À revoir » avec les bonnes réponses.
- On peut le repasser.

### Suivi de progression
- Quand je reviens, je dois voir **ce que j'ai déjà travaillé** et **la note obtenue la dernière fois** :
  - sous chaque vidéo : « ✓ Déjà vue · Quiz 2/3 (le 11/11) » ;
  - sur l'examen : dernière note, meilleure note, nombre d'essais.
- (Actuellement stocké dans la mémoire du navigateur du téléphone. À améliorer si possible pour ne pas perdre le suivi.)

### Anciens types de cartes (V1, toujours présents)
- **notion** (définition/loi courte), **quiz** (question → tap pour la réponse), **situation** (cas pro + réponse), **piege** (confusion classique).
- Champs : `id`, `type`, `matiere`, `chapitre`, `titre`, `contenu`, `reponse`.

---

## 6. Contenu : à partir de mes cours (Google Drive)

**Méthode** : je donne un chapitre de mon Drive → il est découpé en **plusieurs vidéos courtes** (une par notion clé) + un quiz par vidéo + un examen de fin de chapitre.

**Exemple fait : Transaction, chapitre 1, « Le métier d'agent immobilier et la transaction immobilière »** (dossier Drive « cour de Transaction immobiliére »), découpé en 7 vidéos :

| # | Vidéo | Notions |
|---|---|---|
| 1 | Agent immobilier : tu sers à quoi ? | définition, missions vendeur / acquéreur / bailleur / locataire, neutralité |
| 2 | Loi Hoguet : la loi qui t'autorise à bosser | loi Hoguet (2/01/1970), décret (20/07/1972), ALUR (24/03/2014), Macron (6/08/2015), cartes T/G/S, CCI |
| 3 | Carte pro : qui a le droit de l'avoir ? | aptitude (BTS PI / Bac+3 direct, Bac 3 ans, sans diplôme 4 ou 10 ans), RCS, RCP, garantie financière, dispense, 3 ans, 42 h de formation |
| 4 | Les 7 documents de la transaction | mandat, reconnaissance de visite, offre d'achat, avant-contrat / mandat, bail, état des lieux |
| 5 | Registre des mandats ou registre-répertoire ? | art. 72 vs art. 86, compte spécial, reçu, archivage 10 ans |
| 6 | Cash, prix, contrôles | TRACFIN, affichage des prix TTC / % du prix, déontologie (28/08/2015), CNTGI, DGCCRF |
| 7 | Responsabilité : moyens ou résultat ? | civile / pénale, contractuelle / extracontractuelle, moyens / résultat, retrait de la carte |

+ **Examen du chapitre 1** : 10 mises en situation, note sur 20.

Deux autres vidéos d'exemple existent : « Du mandat aux clés : le parcours d'une vente » et « Le préavis en zone tendue ».

**Points du cours à faire vérifier par le prof :**
- Le transfert de la délivrance des cartes aux CCI est en général attribué à la **loi ALUR** (effectif en juillet 2015), alors que mon cours l'attribue à la loi Macron.
- La formation continue comprend aussi, depuis 2020, **2 h sur la non-discrimination** dans l'accès au logement (pas dans mon cours).

**Mes autres chapitres dans Drive** (à transformer ensuite) :
- Transaction : ch. 2 (agence : structures, mercatique, statuts), ch. 3 (négociateur), ch. 4 (acteurs de l'immobilier), ch. 5 (marché de l'agence : offre et demande)
- Copropriété : ch. 1 à 5 (copropriété, qui gère, documents et AG, syndic en action…)
- Gestion locative : ch. 1 (régimes juridiques et mandat de gestion), ch. 2 (local loué), ch. 4 (estimation du loyer, entrée du mandat de location)
- Économie : ch. 1 à 4 (cadre réglementaire et déontologie, offre et demande, banques et financement, indicateurs immobiliers)
- Juridique : ch. 1 (encadrement juridique de la transaction), ch. 3 (droit de propriété et droit au logement)

---

## 7. Format technique d'une vidéo (ce qui a été construit)

Une vidéo = une carte `"type": "video"` décrite comme un **scénario** (pas de logiciel de montage) :

```json
{
  "id": 101, "type": "video", "matiere": "transaction",
  "chapitre": "Ch. 1 · Le métier d'agent immobilier",
  "titre": "Agent immobilier : tu sers à quoi ?",
  "contenu": "Accroche lue au début, avec *mots clés* entre astérisques",
  "reponse": "Point à retenir 1\nPoint à retenir 2",
  "personnages": { "sophie": { "nom": "Sophie", "role": "agente", "style": "femme", "couleur": "#10b981", "peau": "#8d5524", "cheveux": "#1c1917", "accessoire": "badge" } },
  "scenes": [
    { "decor": "agence", "persos": { "sophie": { "x": 70, "emotion": "content" } }, "gros_plan": "sophie",
      "objet": { "emoji": "📄", "texte": "Mandat" }, "parle": "sophie", "bulle": "Bonjour !",
      "narration": "Sophie lui fait signer un *mandat écrit*." },
    { "type": "chiffre", "texte": "10 JOURS", "sous": "pour se rétracter", "narration": "Léa a *10 jours* pour changer d'avis." }
  ],
  "quiz": [ { "question": "…", "choix": ["A", "B", "C"], "bonne": 1, "explication": "…" } ]
}
```

- Types de plans : `scene`, `document`, `loi`, `etapes`, `chiffre`, `calcul`, `versus`.
- Décors : `rue`, `agence`, `banque`, `notaire`, `appartement`, `cci`.
- Émotions : `neutre`, `content`, `rougit`, `triste`, `pleure`, `surpris`, `fache`.
- Examen : carte `"type": "examen"` avec `questions` (`situation`, `question`, `choix`, `bonne`, `explication`).
- Voix : `outils/generer_voix.py` génère un MP3 par étape avec ElevenLabs → `audio/<id>/NN.mp3` + `audio/voix.json`.

Fichiers : `index.html`, `style.css`, `app.js` (fil, filtres, mélange), `video.js` (moteur des vidéos), `examen.js`, `suivi.js`, `cards.json`, `manifest.json` + icônes, `outils/generer_voix.py`.

---

## 8. État actuel et prochaines étapes

**En ligne** : https://raimikeyliansossa-jpg.github.io/revision-immo/
(dépôt `raimikeyliansossa-jpg/revision-immo`, branche `claude/tiktok-bts-revision-app-833uf4`)

**Navigation (19/11/2026)** : accueil = 5 matières → liste des chapitres (numéro, thème, état du planning de révision « Révisé R3/6 · prochaine révision le… », vidéos vues, note d'examen) → fil TikTok du chapitre (carte d'annonce + bouton ▶ jaune, vidéos, examen en situation). Le planning vient du doc « Suivi révisions immo » (tâches planifiées) via `planning.json`.
**Transaction ch. 2 (19/11/2026)** : 6 vidéos (201 à 206 : formes d'agence, réseaux, besoin/désir/demande, mercatique des services, 3 statuts du négociateur, obligations de l'agent commercial) + examen 299 (10 situations). Voix Lily à générer au renouvellement du forfait (en attendant : voix du téléphone).
**Voix** : clé ElevenLabs OK (enregistrée dans l'environnement « revision-immo »). Vidéos 101 à 105 générées avec Lily.
**Reste à faire au renouvellement du forfait** (≈ 2 400 caractères) : vidéos 106, 107, 11 et 12 (encore avec Daniel), via
`ELEVENLABS_API_KEY=proxy-injected python3 outils/generer_voix.py pFZP5JQG7iQjIQuC4Bku --video <id>`.

**Ensuite** :
- transformer les autres chapitres de mon Drive en vidéos + quiz + examens ;
- éventuellement : musique de fond douce, suivi qui ne se perd pas, et un rendu encore plus proche des vidéos de référence.
