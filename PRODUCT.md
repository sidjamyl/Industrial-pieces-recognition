# Global Cluster Image Recognition

## Mission

Permettre à un opérateur d’identifier rapidement une référence industrielle à partir d’une seule photo, tout en restant prudent lorsque plusieurs références se ressemblent.

## Utilisateur principal

Un opérateur en usine, principalement sur téléphone, qui connaît peu ou mal le catalogue de pièces.

## Expérience principale

1. L’opérateur charge ou photographie une pièce.
2. L’application propose une zone autour de la pièce.
3. L’opérateur peut corriger cette zone et confirme.
4. L’application affiche la meilleure référence et les deux alternatives les plus proches.
5. L’opérateur peut recommencer immédiatement.

## Principes produit

- Une action principale par écran.
- Le classement est présenté comme une similarité, jamais comme une probabilité.
- L’interface reste prudente et montre les alternatives.
- Les détails pédagogiques ne parasitent pas l’usage de production.
- Les images ne sont pas conservées par l’interface.
- L’expérience est mobile-first, mais reste excellente sur ordinateur.

## Périmètre actuel

- Démonstration sur les pièces de 5, 50 et 200 DA.
- Catalogue DINOv2 existant.
- Recadrage automatique assisté et correction manuelle.
- Résultat Top 3 et scores de similarité.
- Route pédagogique séparée et absente de la navigation principale.

## Hors périmètre

- Authentification et gestion des rôles.
- Rejet fiable des pièces inconnues.
- Historique des analyses.
- Personnalisation Coca-Cola.
- Garantie contractuelle sur le temps d’inférence.

