# Direction visuelle

## Intention

Une interface industrielle premium, claire et calme, inspirée par la précision des produits Apple sans les imiter. Le produit doit donner confiance avant de chercher à impressionner.

## Langage visuel

- Fond ivoire très clair, surfaces blanches et texte graphite.
- Accent neutre bleu ardoise pour les actions et états actifs.
- Grands rayons continus, bordures fines et ombres diffuses.
- Une seule famille typographique sans-serif.
- Photographie au centre de l’expérience.
- Shader Paper Design très discret, réservé au fond d’ambiance.

## Mouvement

- Retour visuel immédiat à l’appui.
- Transitions Motion de 180 à 260 ms, ressorts peu rebondissants.
- Anime.js uniquement pour la révélation numérique des scores.
- Aucune animation décorative pendant une tâche importante.
- `prefers-reduced-motion` désactive les mouvements non essentiels.

## Composants

- Composants de base inspirés de shadcn/ui : Button, Badge et Progress.
- Zone de dépôt adaptée du composant Animated File Upload de SmoothUI.
- Paper Shaders pour l’atmosphère de fond.
- Kokonut UI n’est pas ajouté : il dupliquerait les primitives déjà couvertes.

## Accessibilité

- Cibles tactiles d’au moins 44 px.
- États de focus visibles.
- Utilisable au clavier.
- Statuts annoncés avec `aria-live`.
- Contrastes de texte conformes à un usage en environnement lumineux.
- Le recadrage conserve des contrôles explicites en plus des gestes.

