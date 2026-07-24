# Glossaire

## Catalogue

Ensemble des photos de référence et de leurs vecteurs déjà calculés.

## Embedding

Vecteur de 384 nombres produit par DINOv2 pour représenter visuellement une image.

## Inférence

Passage d’une nouvelle photo dans DINOv2. Ce calcul a lieu à chaque analyse, sans entraîner le modèle.

## Similarité

Mesure cosinus entre deux embeddings. Elle sert au classement et ne représente pas une probabilité.

## Top 3

Les trois références dont les images sont les plus similaires à la photo analysée.

## Recadrage

Sélection de la zone contenant la pièce avant son passage dans DINOv2.

## Route pédagogique

Vue distincte qui expose le recadrage, le tenseur, l’embedding et les voisins utilisés pour expliquer le résultat.

