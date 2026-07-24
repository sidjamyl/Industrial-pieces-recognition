# ADR 0002 — Cibler un VPS CPU

## Statut

Accepté

## Contexte

Le GPU accélère DINOv2, mais il n’est pas obligatoire pour une seule inférence. Le temps réel dépendra du processeur du VPS.

## Décision

Le conteneur API utilise PyTorch CPU. Aucune garantie de latence n’est intégrée au périmètre ; le temps sera mesuré sur le VPS cible.

## Conséquences

- Le déploiement fonctionne sur un VPS Docker standard.
- Le modèle reste nécessaire à l’exécution pour encoder chaque nouvelle photo.
- Une image GPU pourra être ajoutée ultérieurement si la charge le justifie.

