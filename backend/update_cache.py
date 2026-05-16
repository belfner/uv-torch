from __future__ import annotations

import logging
import shutil
import sys
from pathlib import Path

from apscheduler.schedulers.blocking import BlockingScheduler  # type: ignore[import-untyped]

from torch_wheel_index import refresh_if_stale

TARGET_FILE = Path("/torch-info/pytorch_info.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)


def update_indexes() -> None:
    """
    Refresh the cached PyTorch catalog when the live index is newer.

    Delegates the staleness check, scrape, and atomic write to
    ``torch_wheel_index.refresh_if_stale``, which only rescrapes when the
    online torch or torchvision version is newer than the cached one.

    A transient network failure makes the underlying scrape return an empty
    catalog, and ``refresh_if_stale`` would atomically overwrite the shared
    file with zero releases. To protect the file the frontend serves, the
    existing cache is backed up before the refresh and restored if the
    refresh yields an empty catalog.
    """
    backup: Path | None = None
    if TARGET_FILE.exists():
        backup = TARGET_FILE.with_suffix(TARGET_FILE.suffix + ".bak")
        shutil.copy2(TARGET_FILE, backup)

    try:
        catalog = refresh_if_stale(TARGET_FILE)
        if len(catalog.releases) == 0:
            if backup is not None:
                backup.replace(TARGET_FILE)
                logger.error(
                    "refresh produced an empty catalog; restored previous cache at %s",
                    TARGET_FILE,
                )
            else:
                logger.error("refresh produced an empty catalog and no prior cache exists")
            return
        logger.info("catalog: %d releases at %s", len(catalog.releases), TARGET_FILE)
    finally:
        if backup is not None and backup.exists():
            backup.unlink()


def main() -> None:
    """
    Run an immediate refresh, then schedule hourly refreshes.
    """
    update_indexes()
    scheduler = BlockingScheduler()
    scheduler.add_job(update_indexes, "interval", hours=1)
    logger.info("Scheduler started. Running updates every hour.")
    scheduler.start()


if __name__ == "__main__":
    main()
