import argparse
from collections import Counter
from pathlib import Path

from PIL import Image

from build_catalog import IMAGE_EXTENSIONS
from embedding import DEVICE, embed_crops, embed_full_images
from search_catalog import load_catalog, rank_embeddings


def test_images(root: Path) -> list[Path]:
    files = sorted(path for path in root.rglob("*") if path.suffix.lower() in IMAGE_EXTENSIONS)
    known = []
    for path in files:
        parts = path.relative_to(root).parts
        if parts[0] == "unknown":
            continue
        if len(parts) != 4 or parts[2] not in {"recto", "verso"}:
            raise ValueError(f"Invalid test path: {path}")
        known.append(path)
    if not known:
        raise ValueError(f"No known test images found in {root}")
    return known


def evaluate(
    root: Path,
    catalog_path: Path,
    batch_size: int,
    neighbors: int,
    full_images: bool = False,
) -> None:
    catalog = load_catalog(catalog_path)
    files = test_images(root)
    predictions = []

    for start in range(0, len(files), batch_size):
        batch_paths = files[start : start + batch_size]
        images = []
        for path in batch_paths:
            with Image.open(path) as image:
                images.append(image.convert("RGB"))
        embedder = embed_full_images if full_images else embed_crops
        rankings = rank_embeddings(embedder(images), catalog, neighbors)
        predictions.extend(zip(batch_paths, rankings))
        print(f"Processed {min(start + batch_size, len(files))}/{len(files)} images")

    totals = Counter()
    correct = Counter()
    confusion = Counter()
    margins = []

    for path, ranking in predictions:
        expected = path.relative_to(root).parts[0]
        predicted = ranking[0][0]
        totals[expected] += 1
        correct[expected] += predicted == expected
        confusion[(expected, predicted)] += 1
        margins.append(ranking[0][1] - ranking[1][1])

    total = sum(totals.values())
    total_correct = sum(correct.values())
    print("\nResults")
    print(f"Top-1: {total_correct}/{total} = {100 * total_correct / total:.2f}%")
    print(f"Average top-1 margin: {sum(margins) / len(margins):.4f}")
    for reference in sorted(totals):
        print(
            f"{reference}: {correct[reference]}/{totals[reference]} "
            f"= {100 * correct[reference] / totals[reference]:.2f}%"
        )

    mistakes = [(path, ranking) for path, ranking in predictions if ranking[0][0] != path.relative_to(root).parts[0]]
    if mistakes:
        print("\nMistakes")
        for path, ranking in mistakes:
            print(f"{path}: predicted {ranking[0][0]} ({ranking[0][1]:.4f})")
    else:
        print("No classification mistakes.")
    print(f"Device used: {DEVICE}")
    print("Unknown rejection is not evaluated until validation/unknown contains images.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate known references one image at a time.")
    parser.add_argument("--data", type=Path, default=Path("data/cropped/test"))
    parser.add_argument("--catalog", type=Path, default=Path("artifacts/catalog.pt"))
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--neighbors", type=int, default=3)
    parser.add_argument(
        "--full-images",
        action="store_true",
        help="Evaluate original photos without automatic object cropping.",
    )
    args = parser.parse_args()
    evaluate(args.data, args.catalog, args.batch_size, args.neighbors, args.full_images)


if __name__ == "__main__":
    main()
