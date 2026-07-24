# ADR 0001 — Séparer le frontend et l’API

## Statut

Accepté

## Contexte

Le moteur de reconnaissance Python et DINOv2 existe déjà. Le nouveau frontend doit utiliser Next.js et être déployable sur un VPS.

## Décision

Déployer deux services Docker :

- `web` : interface Next.js et proxy serveur ;
- `api` : moteur Python, DINOv2 et catalogue.

Le navigateur ne contacte que Next.js. Next.js relaie les requêtes vers l’API sur le réseau Docker privé.

## Conséquences

- Aucun problème CORS.
- L’URL interne de l’API n’est pas exposée au navigateur.
- Le moteur peut passer du CPU au GPU plus tard sans modifier l’interface.
- Les deux services restent testables et remplaçables indépendamment.

