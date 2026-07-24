import argparse
from pathlib import Path

import torch
from PIL import Image

from embedding import embed, embed_many


def load_catalog(path: Path) -> dict:
    catalog = torch.load(path, map_location="cpu", weights_only=False)
    if catalog["embeddings"].ndim != 2 or len(catalog["items"]) != len(catalog["embeddings"]):
        raise ValueError(f"Invalid catalog: {path}")
    return catalog


def rank_embeddings(
    queries: torch.Tensor, catalog: dict, neighbors: int = 3
) -> list[list[tuple[str, float]]]:
    image_scores = queries @ catalog["embeddings"].T
    references = sorted({item["reference"] for item in catalog["items"]})
    reference_scores = []

    for reference in references:
        indices = [
            index for index, item in enumerate(catalog["items"]) if item["reference"] == reference
        ]
        scores = image_scores[:, indices]
        k = min(neighbors, len(indices))
        reference_scores.append(scores.topk(k, dim=1).values.mean(dim=1))

    stacked = torch.stack(reference_scores, dim=1)
    rankings = []
    for row in stacked:
        order = row.argsort(descending=True)
        rankings.append([(references[index], float(row[index])) for index in order])
    return rankings


def main() -> None:
    parser = argparse.ArgumentParser(description="Find the closest catalog references.")
    parser.add_argument("image", type=Path)
    parser.add_argument("--catalog", type=Path, default=Path("artifacts/catalog.pt"))
    parser.add_argument("--neighbors", type=int, default=3)
    args = parser.parse_args()

    catalog = load_catalog(args.catalog)
    with Image.open(args.image) as image:
        ranking = rank_embeddings(embed(image), catalog, args.neighbors)[0]

    for position, (reference, score) in enumerate(ranking[:3], start=1):
        print(f"{position}. {reference}: {score:.4f}")
    if len(ranking) > 1:
        print(f"Margin over second: {ranking[0][1] - ranking[1][1]:.4f}")
    print("Scores are similarities, not probabilities.")


if __name__ == "__main__":
    main()
