# Révision Immo 📱

Appli web mobile style TikTok pour réviser le BTS Professions Immobilières.
Une carte par écran, on fait défiler pour passer à la suivante.

## Les fichiers

| Fichier      | Rôle                                                        |
|--------------|-------------------------------------------------------------|
| `index.html` | La structure de la page (le « squelette »)                  |
| `style.css`  | L'apparence : couleurs, plein écran, défilement aimanté     |
| `app.js`     | La logique : lit `cards.json` et fabrique les cartes        |
| `cards.json` | Les cartes de révision (c'est ici qu'on en ajoute)          |
| `manifest.json` + `icone-*.png` | Nom et icône de l'appli pour l'écran d'accueil Android |

## Lancer l'appli sur ton ordinateur

Le navigateur refuse de lire `cards.json` si tu ouvres `index.html` par un double-clic.
Il faut un petit serveur local. Dans un terminal, dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000. Pour voir le rendu téléphone dans Chrome :
F12 → icône téléphone → choisir un modèle « Samsung Galaxy ».

## Ajouter une carte

Copie un bloc dans `cards.json`, change l'`id` et le texte. N'oublie pas la virgule entre deux blocs.

```json
{
  "id": 11,
  "type": "quiz",
  "matiere": "copropriete",
  "chapitre": "Assemblée générale",
  "titre": "Titre court",
  "contenu": "La question ou le cas",
  "reponse": "La réponse"
}
```

- `type` : `notion`, `quiz`, `situation` ou `piege`
- `matiere` : `eco`, `juridique`, `transaction`, `copropriete` ou `gestion-locative`

## Filtrer par matière

Les boutons en haut de l'écran affichent seulement les cartes d'une matière (le chiffre = nombre de cartes).
Le dernier filtre choisi est retenu à la prochaine ouverture.

## Mélanger les cartes

Le bouton 🔀 **Mélanger** (sous les filtres) met les cartes dans un ordre aléatoire.
Il devient jaune quand il est activé. Un nouveau tirage est fait à chaque changement de filtre.
Pour re-mélanger : désactiver puis réactiver. Le choix est retenu à la prochaine ouverture.

## Mettre l'appli en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche `claude/tiktok-bts-revision-app-833uf4`, dossier `/ (root)` → **Save**.
3. Après 1 à 2 minutes, l'appli est sur : https://raimikeyliansossa-jpg.github.io/revision-immo/

⚠️ Avec un compte GitHub gratuit, Pages ne marche que si le dépôt est **public**
(Settings → General → Danger Zone → Change visibility).

Chaque `git push` sur la branche met le site à jour automatiquement.

### Installer sur Samsung

Ouvre l'adresse dans **Samsung Internet** ou **Chrome**, puis :
- Samsung Internet : menu ☰ → **Ajouter la page à** → **Écran d'accueil**
- Chrome : menu ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer l'application**)
