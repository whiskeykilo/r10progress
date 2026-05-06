#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but was not found on PATH." >&2
  exit 1
fi

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  echo "==> Installing frontend dependencies with frozen lockfile"
  pnpm install --frozen-lockfile

  echo "==> Installing server dependencies with frozen lockfile"
  pnpm --dir server install --frozen-lockfile
else
  echo "==> Skipping dependency install (SKIP_INSTALL=1)"
fi

echo "==> Running frontend lint"
pnpm lint

echo "==> Running frontend typecheck"
pnpm tsc --noEmit

echo "==> Running frontend tests"
pnpm test

echo "==> Running server typecheck"
pnpm --dir server tsc --noEmit

if [[ "${SKIP_DOCKER:-0}" == "1" ]]; then
  echo "==> Skipping Docker build validation (SKIP_DOCKER=1)"
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required for Docker validation. Set SKIP_DOCKER=1 to bypass." >&2
    exit 1
  fi

  echo "==> Building Docker image"
  docker build -t r10progress:local-verify .
fi

echo "All pre-push checks passed."
