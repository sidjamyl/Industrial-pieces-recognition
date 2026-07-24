from functools import lru_cache
import os
import threading

import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
from torchvision import transforms
from torchvision.transforms import InterpolationMode

from coin_crop import crop_coin


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_LOCK = threading.Lock()

SPATIAL_PREPROCESS = transforms.Compose(
    [
        transforms.Resize(256, interpolation=InterpolationMode.BICUBIC),
        transforms.CenterCrop(224),
    ]
)

TENSOR_PREPROCESS = transforms.Compose(
    [
        transforms.ToTensor(),
        transforms.Normalize(
            mean=(0.485, 0.456, 0.406),
            std=(0.229, 0.224, 0.225),
        ),
    ]
)


def prepare_image(image: Image.Image) -> tuple[Image.Image, torch.Tensor]:
    """Return the exact RGB crop shown to DINOv2 and its normalized tensor."""
    return prepare_full_image(crop_coin(image))


def prepare_full_image(image: Image.Image) -> tuple[Image.Image, torch.Tensor]:
    """Prepare a complete photo without automatic object detection."""
    crop = SPATIAL_PREPROCESS(ImageOps.exif_transpose(image).convert("RGB"))
    return crop, TENSOR_PREPROCESS(crop)


@lru_cache(maxsize=1)
def load_model() -> torch.nn.Module:
    local_repo = os.environ.get("DINOV2_REPO")
    if local_repo:
        model = torch.hub.load(local_repo, "dinov2_vits14", source="local")
    else:
        model = torch.hub.load(
            "facebookresearch/dinov2",
            "dinov2_vits14",
            trust_repo=True,
        )
    return model.eval().to(DEVICE)


def embed(image: Image.Image) -> torch.Tensor:
    """Return one L2-normalized 384D DINOv2 embedding on the CPU."""
    return embed_many([image])


def embed_many(images: list[Image.Image]) -> torch.Tensor:
    """Return L2-normalized DINOv2 embeddings for a batch of images."""
    return embed_crops([crop_coin(image) for image in images])


def embed_crops(images: list[Image.Image]) -> torch.Tensor:
    """Embed images that have already been cropped around the object."""
    batch = torch.stack(
        [TENSOR_PREPROCESS(SPATIAL_PREPROCESS(image.convert("RGB"))) for image in images]
    )
    return embed_tensors(batch)


def embed_full_images(images: list[Image.Image]) -> torch.Tensor:
    """Embed complete photos with the same preprocessing as the upload app."""
    return embed_tensors(torch.stack([prepare_full_image(image)[1] for image in images]))


def embed_tensors(batch: torch.Tensor) -> torch.Tensor:
    """Embed one tensor or a batch already prepared for DINOv2."""
    if batch.ndim == 3:
        batch = batch.unsqueeze(0)
    batch = batch.to(DEVICE)
    with MODEL_LOCK, torch.inference_mode():
        vectors = load_model()(batch)
    return F.normalize(vectors, p=2, dim=1).cpu()


def cosine_similarity(left: Image.Image, right: Image.Image) -> float:
    """Compare two images; this score is a similarity, not a probability."""
    return float((embed(left) @ embed(right).T).item())
