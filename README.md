# Industrial image recognition

Minimal DINOv2 baseline for turning images into normalized embeddings and comparing them with cosine similarity.

## Run on this machine (PowerShell)

```powershell
$python = "D:\AI\venvs\industrial-image-recognition\Scripts\python.exe"
$env:TORCH_HOME = "D:\AI\torch-cache"
$env:DINOV2_REPO = "D:\AI\models\dinov2"
& $python smoke_test.py
```

The environment and model cache live on `D:` because this machine's `C:` drive is nearly full. The source code remains in this project directory.

## Verify the model and GPU

The official DINOv2 repository is stored in `D:\AI\models\dinov2`; its ViT-S/14 weights are cached in `D:\AI\torch-cache`.

```powershell
& $python smoke_test.py
```

## Compare two images

```powershell
& $python compare.py path\to\first.jpg path\to\second.jpg
```

The cosine score is useful for ranking images but is not a calibrated probability.

## Build the catalog

After sorting images under `data/catalog/reference/specimen/recto-or-verso/`,
detect and crop the coins, then rebuild the embeddings:

```powershell
& $python coin_crop.py
& $python build_catalog.py
```

This creates inspectable derived images under `data/cropped/` and writes
`artifacts/catalog.pt` without modifying the source images.

The simplified industrial catalog under `data/catalog 2/reference/image.jpg`
can be built separately without overwriting the coin catalog:

```powershell
& $python build_catalog.py --data "data/catalog 2" --output "artifacts/catalog2.pt"
```

## Current scope

- Frozen DINOv2 ViT-S/14 backbone
- 384-dimensional L2-normalized embeddings
- Exact cosine comparison
- Automatic circle detection for the coin demonstration

The current known-image Top-1 result is 91.26% (94/103). Unknown rejection
still needs a representative unknown validation set.

For comparison, disabling object detection on the 116 original test photos
while keeping the cropped catalog lowers Top-1 accuracy to 53.45% (62/116).

The upload interface now proposes an automatic crop before inference. The
user can move and resize the square, then explicitly confirm it; `/predict`
only accepts a validated crop.

## Search one photo

```powershell
& $python search_catalog.py "path\to\photo.jpg"
```

## Evaluate all known test photos

```powershell
& $python evaluate.py
```

Unknown rejection is intentionally disabled until `data/validation/unknown` contains representative images.

## Launch the local interface

Double-click `launch_app.bat`, or run:

```powershell
.\launch_app.bat
```

The browser opens at `http://127.0.0.1:8000`. Images stay on this computer.

After each prediction, the **Mode pédagogique** shows the real processing data:
the 224 × 224 crop sent to DINOv2, tensor statistics, the 384-dimensional
embedding, the three nearest catalog images, and the final mean similarity.

For the coin demo, `coin_crop.py` detects the circular object before DINOv2.
Run it to regenerate inspectable crops under `data/cropped/`; original photos
are never modified.

## Next.js frontend

The production interface is now in `frontend/`.

- `/` contains the operator workflow: upload, crop confirmation, result and
  similarity ranking.
- `/pedagogy` adds the real crop, tensor, embedding and catalog neighbors. It
  is intentionally absent from the production navigation.
- `/admin` lets an administrator add a reference and its photos, then rebuild
  `catalog2.pt` from the server. It is intentionally not linked from the
  production navigation.
- `/api/*` is a server-side proxy to the Python API, so the browser never needs
  the API container address.

Adding photos does not change recognition immediately: use **Reconstruire
maintenant** in `/admin` once the reference is complete. Only those new photos
are embedded and appended to `catalog2.pt`; the original catalog photos are
not required on the server.

> `/admin` has **no authentication yet**. Do not expose it publicly until an
> authentication layer is added.

Run the Python API on port 8000, then start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The Next.js application is available at `http://127.0.0.1:3000`.

## Deploy to a CPU VPS with Docker

The deployment contains two services:

- `web`: standalone Next.js server;
- `api`: Python, OpenCV, DINOv2 ViT-S/14, the catalog and CPU PyTorch.

The ready-to-run public images are available on Docker Hub. Copy only
`docker-compose.yml` and `.env.example` to the VPS, then run:

```bash
cp .env.example .env
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f api web
```

The application is exposed on port `3000` by default. To choose another host
port, change `APP_PORT` in `.env`, then recreate the services:

```bash
docker compose up -d
```

For a public domain, place Caddy or Nginx in front of port 3000 to terminate
HTTPS. Do not publish the Python API port; it is intentionally reachable only
from the private Compose network.

Useful operations:

```bash
# Health from the VPS
curl http://127.0.0.1:3000/api/health

# Upgrade to the latest published images
docker compose pull
docker compose up -d

# Stop without deleting images
docker compose down
```

Compose keeps the pending admin uploads and `catalog2.pt` in named Docker
volumes. A successful admin rebuild appends the new embeddings to the catalog,
then removes the temporary uploaded photos.

The current image targets a CPU VPS and makes no latency guarantee. DINOv2 is
still used for every uploaded photo; only the reference embeddings are
precomputed in `catalog.pt`.
