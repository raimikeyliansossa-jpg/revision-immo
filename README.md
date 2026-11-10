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

## Lancer l'appli sur ton ordinateur

Le navigateur refuse de lire `cards.json` si tu ouvres `index.html` par un double-clic.
Il faut un petit serveur local. Dans un terminal, dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000. Pour voir le rendu iPhone dans Chrome :
F12 → icône téléphone → choisir « iPhone ».

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
