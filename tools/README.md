# tools/

One-off scripts for authoring data, not run at game time.

## `embed_emojis.py`

Downloads `unicode-emoji-json/data-by-emoji.json`, drops skin-tone variants,
and runs every remaining emoji's name through CLIP's text tower
(`openai/clip-vit-base-patch32`) to produce L2-normalized 512-d vectors.

Outputs:

- `data/emoji-embeddings.json` — `[{ char, name }]`, vector order matches `.bin`.
- `data/emoji-embeddings.bin` — Float32 row-major buffer (`N × 512`).

The browser curator (`curator.html`) loads both at startup and ranks candidate
child emojis by cosine similarity. Re-run this script only if you change the
model or the source emoji list.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt
python tools/embed_emojis.py
```

First run pulls the CLIP model (~600 MB). MPS (Apple Silicon) and CUDA are
auto-detected; CPU also works but is slower.
