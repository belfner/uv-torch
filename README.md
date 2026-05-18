# uv-torch

A small web app that generates `uv` / `pyproject.toml` configuration for installing PyTorch against the correct wheel index for your platform (CUDA / ROCm / XPU / CPU, Python version, OS).

Pick your torch version and compute backend in the UI, and it produces the `[tool.uv]` source/index configuration to drop into your `pyproject.toml`.

## Public site

Use it directly in your browser: **https://belfner.github.io/uv-torch/**

## How it works

Two services share a Docker volume:

- **backend/** (Python 3.13 + `uv`): a cron-like worker. It scrapes `download.pytorch.org/whl/` on start and hourly thereafter, resolves the official torch↔torchvision pairings, and writes `pytorch_info.json`. No HTTP surface.
- **frontend/** (Vite + Bootstrap → nginx): a static UI that reads `pytorch_info.json` and renders the selectors and generated TOML. nginx serves whatever the backend most recently wrote.

## Running it

Docker workflow from the repo root (how prod runs):

```bash
make build   # docker compose build
make run     # docker compose up (foreground)
make rund    # detached
```

### Frontend local dev (from `frontend/`)

```bash
npm install        # once
npm run dev        # Vite dev server on port 8080
npm run build
npm run preview
```

The dev server serves the checked-in snapshot at `public/pytorch_info.json`. To test against live data, run the backend and copy or symlink its output into `public/`.

### Backend local dev (from `backend/`, requires `uv`)

```bash
uv sync
python update_cache.py   # initial fetch, then schedules hourly updates (blocking)
```

`update_cache.py` writes to `/torch-info/pytorch_info.json`, so create that directory or edit `TARGET_FILE` when running on the host.

Type-check with `uv run mypy .`.

## License

MIT — see [LICENSE](LICENSE).
