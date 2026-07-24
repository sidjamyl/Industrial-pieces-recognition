import argparse
from collections.abc import Callable
from pathlib import Path

import torch
from PIL import Image

from embedding import DEVICE, embed_crops


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def image_metadata(path: Path, root: Path) -> tuple[str, str, str]:
    parts = path.relative_to(root).parts
    if len(parts) == 2:
        reference, _ = parts
        return reference, reference, "vue"
    if len(parts) == 4 and parts[2] in {"recto", "verso"}:
        reference, specimen, side, _ = parts
        return reference, specimen, side
    raise ValueError(
        f"Invalid path: {path}. Expected reference/image.jpg or "
        "reference/specimen/recto-or-verso/image.jpg"
    )


def catalog_images(root: Path) -> list[Path]:
    files = sorted(path for path in root.rglob("*") if path.suffix.lower() in IMAGE_EXTENSIONS)
    if not files:
        raise ValueError(f"No images found in {root}")
    for path in files:
        image_metadata(path, root)
    return files


def build(
    root: Path,
    output: Path,
    batch_size: int,
    progress: Callable[[int, int], None] | None = None,
) -> None:
    files = catalog_images(root)
    embeddings = []

    for start in range(0, len(files), batch_size):
        batch_paths = files[start : start + batch_size]
        images = []
        for path in batch_paths:
            with Image.open(path) as image:
                images.append(image.convert("RGB"))
        embeddings.append(embed_crops(images))
        processed = min(start + batch_size, len(files))
        print(f"Processed {processed}/{len(files)} images")
        if progress:
            progress(processed, len(files))

    items = []
    for path in files:
        reference, specimen, side = image_metadata(path, root)
        items.append(
            {
                "reference": reference,
                "specimen": specimen,
                "side": side,
                "image_path": str(path.resolve()),
            }
        )

    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model": "dinov2_vits14",
            "embedding_dimension": 384,
            "embeddings": torch.cat(embeddings),
            "items": items,
        },
        output,
    )
    print(f"Saved {len(items)} images to {output}")
    print(f"Device used: {DEVICE}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the DINOv2 image catalog.")
    parser.add_argument("--data", type=Path, default=Path("data/cropped/catalog"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/catalog.pt"))
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()
    build(args.data, args.output, args.batch_size)


if __name__ == "__main__":
    main()
