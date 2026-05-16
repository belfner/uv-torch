#!/bin/sh
set -e

SEED=/var/cache/pytorch_info.seed.json
TARGET=/torch-info/pytorch_info.json

if [ -f "$SEED" ] && [ ! -e "$TARGET" ]; then
    mkdir -p "$(dirname "$TARGET")"
    cp "$SEED" "$TARGET"
    echo "seed-volume: wrote bundled snapshot to $TARGET"
fi
