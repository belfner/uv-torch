#!/bin/sh
# Derive HOST, VITE_BASE and the Traefik router rule from a single ENDPOINT.
#
# ENDPOINT forms:
#   torch-uv.belfner.com   -> subdomain served at root
#   belfner.com/torch-uv   -> path prefix on a host
#
# Emits eval-able `export` lines on stdout.
set -eu

ENDPOINT="${ENDPOINT:?ENDPOINT is not set (see .env)}"

HOST="${ENDPOINT%%/*}"                            # before the first slash
REST="${ENDPOINT#"$HOST"}"                        # "", "/torch-uv" or "/torch-uv/"
PREFIX="$(printf '%s' "$REST" | sed 's:/*$::')"   # strip trailing slashes

if [ -n "$PREFIX" ]; then
    VITE_BASE="${PREFIX}/"
    TRAEFIK_RULE="Host(\`${HOST}\`) && PathPrefix(\`${PREFIX}\`)"
else
    VITE_BASE="/"
    TRAEFIK_RULE="Host(\`${HOST}\`)"
fi

echo "export HOST='${HOST}'"
echo "export VITE_BASE='${VITE_BASE}'"
echo "export TRAEFIK_RULE='${TRAEFIK_RULE}'"
