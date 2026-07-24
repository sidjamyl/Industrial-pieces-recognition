from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def find_coin_box(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Find the strongest circular object and return a padded square box."""
    rgb = np.asarray(ImageOps.exif_transpose(image).convert("RGB"))
    height, width = rgb.shape[:2]
    scale = min(1.0, 480 / max(height, width))
    resized = cv2.resize(
        rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA
    )
    gray = cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY)
    gray = cv2.medianBlur(gray, 7)
    short_side = min(gray.shape)

    circles = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=short_side * 0.08,
        param1=110,
        param2=24,
        minRadius=max(6, int(short_side * 0.018)),
        maxRadius=int(short_side * 0.18),
    )
    if circles is None:
        return None

    gradient_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0)
    gradient_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1)
    gradient = cv2.magnitude(gradient_x, gradient_y)
    yy, xx = np.ogrid[: gray.shape[0], : gray.shape[1]]

    def score(circle: np.ndarray) -> float:
        x, y, radius = circle
        distance = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
        inside = resized[distance < radius * 0.72]
        outside = resized[(distance > radius * 1.08) & (distance < radius * 1.35)]
        edge = gradient[(distance > radius * 0.9) & (distance < radius * 1.1)]
        if not len(inside) or not len(outside) or not len(edge):
            return -1
        color_difference = np.linalg.norm(inside.mean(0) - outside.mean(0)) / 255
        return float(color_difference + edge.mean() / 255)

    x, y, radius = max(circles[0], key=score) / scale
    half = radius * 1.4
    size = min(width, height, int(half * 2))
    left = min(max(0, int(x - size / 2)), width - size)
    top = min(max(0, int(y - size / 2)), height - size)
    right = left + size
    bottom = top + size
    return left, top, right, bottom


def crop_coin(image: Image.Image) -> Image.Image:
    transposed = ImageOps.exif_transpose(image)
    box = find_coin_box(transposed)
    if box is None:
        raise ValueError("Aucune pièce circulaire détectée dans l’image.")
    return transposed.convert("RGB").crop(box)


def crop_tree(source: Path, destination: Path) -> int:
    files = sorted(
        path
        for path in source.rglob("*")
        if path.suffix.lower() in IMAGE_EXTENSIONS
    )
    failures = []
    for index, path in enumerate(files, start=1):
        output = destination / path.relative_to(source)
        try:
            with Image.open(path) as image:
                cropped = crop_coin(image)
            output.parent.mkdir(parents=True, exist_ok=True)
            cropped.save(output, quality=92)
        except (OSError, ValueError) as error:
            output.unlink(missing_ok=True)
            failures.append((path, str(error)))
        print(f"Recadrage {index}/{len(files)}", end="\r")

    print(f"\nRecadrages créés : {len(files) - len(failures)}/{len(files)}")
    for path, error in failures:
        print(f"ÉCHEC {path}: {error}")
    return len(failures)


if __name__ == "__main__":
    failure_count = crop_tree(Path("data/catalog"), Path("data/cropped/catalog"))
    failure_count += crop_tree(Path("data/test"), Path("data/cropped/test"))
    raise SystemExit(bool(failure_count))
