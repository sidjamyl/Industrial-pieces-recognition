import base64
import cgi
import io
import json
import os
import shutil
import threading
from uuid import uuid4
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PureWindowsPath
from urllib.parse import parse_qs, urlparse

from PIL import Image, ImageOps, UnidentifiedImageError

import torch

from build_catalog import IMAGE_EXTENSIONS
from coin_crop import find_coin_box
from embedding import DEVICE, embed_crops, embed_tensors, prepare_full_image
from search_catalog import load_catalog, rank_embeddings


ROOT = Path(__file__).resolve().parent
CATALOG_PATH = Path(
    os.environ.get("CATALOG_PATH", ROOT / "artifacts" / "catalog2.pt")
)
PAGE_PATH = ROOT / "index.html"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
ADMIN_MAX_UPLOAD_BYTES = 200 * 1024 * 1024
PENDING_DATA_PATH = Path(
    os.environ.get("PENDING_DATA_PATH", ROOT / "data" / "pending")
)
CATALOG = load_catalog(CATALOG_PATH)
ADMIN_LOCK = threading.Lock()
ADMIN_REBUILD = {
    "running": False,
    "processed": 0,
    "total": 0,
    "error": None,
}


def display_reference(reference: str) -> str:
    try:
        return f"{int(reference.split('_')[0])} DA"
    except ValueError:
        return reference.replace("_", " ")


def resolve_catalog_image(stored_path: str) -> Path:
    """Resolve catalog paths created on Windows after moving the app to Linux."""
    original = Path(stored_path)
    if original.is_file():
        return original

    parts = PureWindowsPath(stored_path).parts
    try:
        data_index = tuple(part.lower() for part in parts).index("data")
    except ValueError:
        return original
    return ROOT.joinpath(*parts[data_index:])


def jpeg_bytes(image: Image.Image, max_size: int | None = None) -> bytes:
    copy = image.convert("RGB")
    if max_size:
        copy.thumbnail((max_size, max_size))
    buffer = io.BytesIO()
    copy.save(buffer, format="JPEG", quality=88, optimize=True)
    return buffer.getvalue()


def catalog_overview() -> dict:
    indexed = {}
    for item in CATALOG["items"]:
        indexed[item["reference"]] = indexed.get(item["reference"], 0) + 1

    source = {}
    if PENDING_DATA_PATH.is_dir():
        for directory in PENDING_DATA_PATH.iterdir():
            if directory.is_dir():
                source[directory.name] = sum(
                    path.suffix.lower() in IMAGE_EXTENSIONS
                    for path in directory.rglob("*")
                    if path.is_file()
                )

    references = [
        {
            "name": reference,
            "source_images": source.get(reference, 0),
            "indexed_images": indexed.get(reference, 0),
            "pending": source.get(reference, 0) > 0,
        }
        for reference in sorted(set(source) | set(indexed))
    ]
    return {
        "references": references,
        "total_images": len(CATALOG["items"]),
        "total_references": len(indexed),
    }


def rebuild_status() -> dict:
    with ADMIN_LOCK:
        return dict(ADMIN_REBUILD)


def pending_images() -> list[Path]:
    return sorted(
        path
        for path in PENDING_DATA_PATH.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def rebuild_catalog() -> None:
    global CATALOG
    temporary_path = CATALOG_PATH.with_suffix(".next.pt")

    def update_progress(processed: int, total: int) -> None:
        with ADMIN_LOCK:
            ADMIN_REBUILD["processed"] = processed
            ADMIN_REBUILD["total"] = total

    try:
        files = pending_images()
        if not files:
            return
        with ADMIN_LOCK:
            ADMIN_REBUILD.update(processed=0, total=len(files), error=None)

        embeddings = []
        for start in range(0, len(files), 16):
            batch_paths = files[start : start + 16]
            images = []
            for path in batch_paths:
                with Image.open(path) as image:
                    images.append(image.convert("RGB"))
            embeddings.append(embed_crops(images))
            update_progress(min(start + 16, len(files)), len(files))

        new_items = [
            {
                "reference": path.relative_to(PENDING_DATA_PATH).parts[0],
                "specimen": "admin",
                "side": "vue",
                "image_path": "",
            }
            for path in files
        ]
        torch.save(
            {
                **CATALOG,
                "embeddings": torch.cat([CATALOG["embeddings"], *embeddings]),
                "items": [*CATALOG["items"], *new_items],
            },
            temporary_path,
        )
        rebuilt_catalog = load_catalog(temporary_path)
        temporary_path.replace(CATALOG_PATH)
        CATALOG = rebuilt_catalog
        shutil.rmtree(PENDING_DATA_PATH, ignore_errors=True)
    except Exception as error:
        temporary_path.unlink(missing_ok=True)
        with ADMIN_LOCK:
            ADMIN_REBUILD["error"] = str(error)
    finally:
        with ADMIN_LOCK:
            ADMIN_REBUILD["running"] = False


def start_rebuild() -> bool:
    with ADMIN_LOCK:
        if ADMIN_REBUILD["running"]:
            return False
        ADMIN_REBUILD.update(running=True, processed=0, total=0, error=None)
    threading.Thread(target=rebuild_catalog, daemon=True).start()
    return True


def valid_reference_name(value: str) -> str:
    reference = " ".join(value.split())
    if (
        not reference
        or len(reference) > 80
        or reference in {".", ".."}
        or any(character in reference for character in '\\\\/:*?"<>|')
    ):
        raise ValueError("Le nom de référence est invalide.")
    return reference


def save_reference(form: cgi.FieldStorage) -> tuple[str, int]:
    reference = valid_reference_name(form.getvalue("reference", ""))
    fields = form["images"] if "images" in form else []
    images = fields if isinstance(fields, list) else [fields]
    if not images or not all(getattr(image, "file", None) for image in images):
        raise ValueError("Ajoutez au moins une photo.")

    destination = PENDING_DATA_PATH / reference
    destination.mkdir(parents=True, exist_ok=True)
    saved = 0
    for field in images:
        suffix = Path(field.filename or "").suffix.lower()
        if suffix not in IMAGE_EXTENSIONS:
            raise ValueError("Utilisez uniquement des images JPEG, PNG ou WebP.")
        raw = field.file.read(MAX_UPLOAD_BYTES + 1)
        if not raw or len(raw) > MAX_UPLOAD_BYTES:
            raise ValueError("Chaque photo doit peser au maximum 20 Mo.")
        with Image.open(io.BytesIO(raw)) as image:
            image.verify()
        (destination / f"{uuid4().hex}{suffix}").write_bytes(raw)
        saved += 1
    return reference, saved


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/admin/catalog":
            self.send_json(200, {**catalog_overview(), "rebuild": rebuild_status()})
            return

        if parsed.path == "/admin/status":
            self.send_json(200, rebuild_status())
            return

        if parsed.path == "/health":
            self.send_json(
                200,
                {
                    "status": "ok",
                    "device": str(DEVICE),
                    "catalog_items": len(CATALOG["items"]),
                },
            )
            return

        if parsed.path == "/":
            page = PAGE_PATH.read_text(encoding="utf-8").replace(
                "__CATALOG_SIZE__", str(len(CATALOG["items"]))
            )
            body = page.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if parsed.path == "/catalog-image":
            try:
                index = int(parse_qs(parsed.query).get("index", [""])[0])
                if index < 0:
                    raise ValueError
                item = CATALOG["items"][index]
                image_path = resolve_catalog_image(item["image_path"])
                if not image_path.is_file():
                    raise ValueError
                with Image.open(image_path) as image:
                    body = jpeg_bytes(image, max_size=480)
            except (ValueError, IndexError, KeyError, OSError, UnidentifiedImageError):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Cache-Control", "private, max-age=3600")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if parsed.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404)

    def do_POST(self) -> None:
        if self.path == "/admin/rebuild":
            if not start_rebuild():
                self.send_json(409, {"error": "Une reconstruction est déjà en cours."})
                return
            self.send_json(202, {"message": "Reconstruction lancée."})
            return

        if self.path not in {"/detect", "/predict", "/admin/reference"}:
            self.send_error(404)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        maximum = (
            ADMIN_MAX_UPLOAD_BYTES if self.path == "/admin/reference" else MAX_UPLOAD_BYTES
        )
        if not 0 < content_length <= maximum:
            self.send_json(400, {"error": "Image absente ou supérieure à 20 Mo."})
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            },
        )
        if self.path == "/admin/reference":
            try:
                reference, saved = save_reference(form)
            except (ValueError, UnidentifiedImageError, OSError) as error:
                self.send_json(400, {"error": str(error)})
                return
            self.send_json(
                201,
                {
                    "message": f"{saved} photo(s) ajoutée(s) à {reference}.",
                    "reference": reference,
                    "saved": saved,
                },
            )
            return

        if "image" not in form or not getattr(form["image"], "file", None):
            self.send_json(400, {"error": "Aucune image reçue."})
            return

        raw = form["image"].file.read(MAX_UPLOAD_BYTES + 1)
        if len(raw) > MAX_UPLOAD_BYTES:
            self.send_json(400, {"error": "L’image dépasse 20 Mo."})
            return

        try:
            with Image.open(io.BytesIO(raw)) as image:
                image.load()
                oriented = ImageOps.exif_transpose(image).convert("RGB")
                source_size = list(oriented.size)

                if self.path == "/detect":
                    box = find_coin_box(oriented)
                    detected = box is not None
                    if box is None:
                        width, height = oriented.size
                        side = int(min(width, height) * 0.6)
                        box = (
                            (width - side) // 2,
                            (height - side) // 2,
                            (width + side) // 2,
                            (height + side) // 2,
                        )
                    self.send_json(
                        200,
                        {
                            "detected": detected,
                            "image_size": source_size,
                            "box": list(box),
                        },
                    )
                    return

                crop_fields = ("crop_x", "crop_y", "crop_width", "crop_height")
                if any(form.getvalue(name) is None for name in crop_fields):
                    raise ValueError("La zone de recadrage est absente.")
                values = [int(float(form.getvalue(name))) for name in crop_fields]
                x, y, width, height = values
                if (
                    width < 32
                    or height < 32
                    or x < 0
                    or y < 0
                    or x + width > oriented.width
                    or y + height > oriented.height
                ):
                    raise ValueError("La zone de recadrage est invalide.")
                selected = oriented.crop((x, y, x + width, y + height))
                crop, tensor = prepare_full_image(selected)
                catalog = CATALOG
                query = embed_tensors(tensor)
                ranking = rank_embeddings(query, catalog)[0]
        except (UnidentifiedImageError, OSError):
            self.send_json(400, {"error": "Le fichier n’est pas une image lisible."})
            return
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        except Exception as error:
            self.send_json(500, {"error": f"Erreur pendant l’analyse : {error}"})
            return

        image_scores = (query @ catalog["embeddings"].T)[0]
        winner_reference = ranking[0][0]
        winner_indices = [
            index
            for index, item in enumerate(catalog["items"])
            if item["reference"] == winner_reference
        ]
        nearest_indices = sorted(
            winner_indices, key=lambda index: float(image_scores[index]), reverse=True
        )[:3]
        crop_data_url = "data:image/jpeg;base64," + base64.b64encode(
            jpeg_bytes(crop)
        ).decode("ascii")

        self.send_json(
            200,
            {
                "winner": display_reference(winner_reference),
                "margin": ranking[0][1] - ranking[1][1],
                "ranking": [
                    {
                        "reference": display_reference(reference),
                        "score": round(score, 4),
                    }
                    for reference, score in ranking[:3]
                ],
                "pedagogy": {
                    "source_size": source_size,
                    "crop_size": list(crop.size),
                    "crop_data_url": crop_data_url,
                    "tensor": {
                        "shape": list(tensor.shape),
                        "minimum": round(float(tensor.min()), 4),
                        "maximum": round(float(tensor.max()), 4),
                        "mean": round(float(tensor.mean()), 4),
                    },
                    "embedding": {
                        "dimensions": int(query.shape[1]),
                        "norm": round(float(query.norm()), 4),
                        "values": [round(float(value), 5) for value in query[0]],
                    },
                    "neighbors": [
                        {
                            "image_url": f"/catalog-image?index={index}",
                            "reference": display_reference(
                                catalog["items"][index]["reference"]
                            ),
                            "specimen": catalog["items"][index]["specimen"],
                            "side": catalog["items"][index]["side"],
                            "similarity": round(float(image_scores[index]), 4),
                        }
                        for index in nearest_indices
                    ],
                    "score_formula": "moyenne des 3 meilleures similarités",
                    "final_score": round(ranking[0][1], 4),
                },
            },
        )

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[interface] {format % args}")


def main() -> None:
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    browser_host = "127.0.0.1" if host == "0.0.0.0" else host
    url = f"http://{browser_host}:{port}"
    print(f"Interface prête : {url}")
    print(f"Catalogue : {len(CATALOG['items'])} images · Appareil : {DEVICE}")
    print("Appuyez sur Ctrl+C pour arrêter.")
    if os.environ.get("NO_BROWSER") != "1":
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nInterface arrêtée.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
