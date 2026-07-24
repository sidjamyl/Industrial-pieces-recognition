# ADR 0003 — Séparer production et pédagogie

## Statut

Accepté

## Décision

- `/` contient uniquement le flux de reconnaissance et les scores.
- `/pedagogy` conserve l’explication détaillée.
- Aucun lien vers `/pedagogy` n’apparaît sur la route principale.

## Note

Une route non liée est discrète, mais n’est pas sécurisée. Une authentification devra être ajoutée si son contenu devient sensible.

