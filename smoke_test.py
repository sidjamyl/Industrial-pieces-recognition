import torch
from PIL import Image, ImageDraw

from embedding import DEVICE, cosine_similarity, embed


def make_shape(kind: str) -> Image.Image:
    image = Image.new("RGB", (320, 320), "#e7e1d5")
    draw = ImageDraw.Draw(image)
    if kind == "circle":
        draw.ellipse((60, 60, 260, 260), fill="#b94b3b", outline="#50231d", width=10)
    else:
        draw.rectangle((60, 60, 260, 260), fill="#277da1", outline="#133c4c", width=10)
    return image


def main() -> None:
    circle = make_shape("circle")
    square = make_shape("square")

    vector = embed(circle)
    same_score = cosine_similarity(circle, circle.copy())
    different_score = cosine_similarity(circle, square)

    assert vector.shape == (1, 384), vector.shape
    assert torch.allclose(vector.norm(dim=1), torch.ones(1), atol=1e-5)
    assert same_score > different_score

    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"Device used: {DEVICE}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"Embedding shape: {tuple(vector.shape)}")
    print(f"Same image similarity: {same_score:.4f}")
    print(f"Different image similarity: {different_score:.4f}")
    print("Smoke test passed.")


if __name__ == "__main__":
    main()

