"""Precompute CLIP text embeddings for every keyboard emoji's name.

Run once. Re-run only if you change the model or the emoji source.

Outputs:
  data/emoji-embeddings.json  -> [{ "char": str, "name": str }] in vector order
  data/emoji-embeddings.bin   -> Float32 row-major (N x DIM), L2-normalized
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
import requests
import torch
from tqdm import tqdm
from transformers import CLIPTextModelWithProjection, CLIPTokenizer

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
EMOJI_URL = (
    "https://raw.githubusercontent.com/muan/unicode-emoji-json/main/data-by-emoji.json"
)
KEYWORDS_URL = (
    "https://raw.githubusercontent.com/muan/emojilib/main/dist/emoji-en-US.json"
)
MODEL_ID = "openai/clip-vit-base-patch32"
BATCH_SIZE = 64

SKIN_TONES = "\U0001F3FB\U0001F3FC\U0001F3FD\U0001F3FE\U0001F3FF"
SKIN_TONE_NAME = re.compile(
    r":\s*(?:light|medium-light|medium|medium-dark|dark)\s+skin tone",
    flags=re.IGNORECASE,
)


def has_skin_tone(char: str) -> bool:
    return any(c in SKIN_TONES for c in char)


def normalize_name(name: str) -> str:
    return SKIN_TONE_NAME.sub("", name).strip()


def fetch_emoji_data() -> list[dict]:
    print(f"fetching {EMOJI_URL}")
    r = requests.get(EMOJI_URL, timeout=30)
    r.raise_for_status()
    raw = r.json()
    print(f"fetching {KEYWORDS_URL}")
    kw = requests.get(KEYWORDS_URL, timeout=30)
    kw.raise_for_status()
    keywords_by_emoji = kw.json()

    items = []
    for char, meta in raw.items():
        if has_skin_tone(char):
            continue
        name = normalize_name(meta.get("name") or char)
        # emojilib's first entry is the slug-form name; keep the rest as keywords.
        kws = keywords_by_emoji.get(char, [])
        keywords = [k.replace("_", " ") for k in kws[1:]] if kws else []
        items.append({"char": char, "name": name, "keywords": keywords})
    print(f"kept {len(items)} emojis after dropping skin-tone variants")
    return items


def embedding_text(item: dict) -> str:
    """Pack name + keywords into the CLIP input. Keywords boost ranking quality
    since CLIP embeddings of bare nouns are noisy."""
    name = item["name"]
    kws = item.get("keywords", [])
    if not kws:
        return name
    return f"{name}. {', '.join(kws)}"


def pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def embed(items: list[dict]) -> np.ndarray:
    device = pick_device()
    print(f"loading {MODEL_ID} on {device}")
    tokenizer = CLIPTokenizer.from_pretrained(MODEL_ID)
    model = CLIPTextModelWithProjection.from_pretrained(MODEL_ID).to(device).eval()

    texts = [embedding_text(it) for it in items]
    dim = model.config.projection_dim
    out = np.zeros((len(texts), dim), dtype=np.float32)
    with torch.no_grad():
        for i in tqdm(range(0, len(texts), BATCH_SIZE), desc="embedding"):
            batch = texts[i : i + BATCH_SIZE]
            tok = tokenizer(batch, padding=True, truncation=True, return_tensors="pt").to(device)
            vecs = model(**tok).text_embeds
            vecs = torch.nn.functional.normalize(vecs, dim=-1)
            out[i : i + len(batch)] = vecs.cpu().numpy()
    return out


def main() -> int:
    items = fetch_emoji_data()
    embs = embed(items)
    DATA.mkdir(exist_ok=True)
    (DATA / "emoji-embeddings.json").write_text(
        json.dumps(items, ensure_ascii=False), encoding="utf-8"
    )
    (DATA / "emoji-embeddings.bin").write_bytes(embs.tobytes())
    print(
        f"wrote {len(items)} embeddings, dim={embs.shape[1]}, "
        f"bin={DATA / 'emoji-embeddings.bin'} ({embs.nbytes / 1e6:.2f} MB)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
