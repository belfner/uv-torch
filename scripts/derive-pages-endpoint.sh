#!/bin/sh
# Derive VITE_BASE and an optional Pages CNAME value from one ENDPOINT.
set -eu

ENDPOINT="${ENDPOINT:?ENDPOINT is required}"
ENDPOINT="${ENDPOINT#https://}"
ENDPOINT="${ENDPOINT#http://}"
ENDPOINT="$(printf '%s' "$ENDPOINT" | sed 's:/*$::')"

HOST="${ENDPOINT%%/*}"
REST="${ENDPOINT#"$HOST"}"
PREFIX="$(printf '%s' "$REST" | sed 's:/*$::')"

if [ -n "$PREFIX" ]; then
    VITE_BASE="${PREFIX}/"
else
    VITE_BASE="/"
fi

case "$HOST" in
    *.github.io) PAGES_CNAME="" ;;
    *) PAGES_CNAME="$HOST" ;;
esac

echo "export HOST='${HOST}'"
echo "export VITE_BASE='${VITE_BASE}'"
echo "export PAGES_CNAME='${PAGES_CNAME}'"
