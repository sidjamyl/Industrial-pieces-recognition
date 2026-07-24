import argparse

from PIL import Image

from embedding import DEVICE, cosine_similarity


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare two images with DINOv2.")
    parser.add_argument("left")
    parser.add_argument("right")
    args = parser.parse_args()

    with Image.open(args.left) as left, Image.open(args.right) as right:
        score = cosine_similarity(left, right)

    print(f"Device: {DEVICE}")
    print(f"Cosine similarity: {score:.4f}")
    print("This score is not a probability.")


if __name__ == "__main__":
    main()

