#!/usr/bin/env bash
# Wrapper script: runs playwright test from the e2e subdirectory
# to avoid npm workspace hoisting conflicts with Next.js.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$DIR/e2e"

# Auto-install if e2e/node_modules is missing
if [ ! -d "$E2E_DIR/node_modules" ]; then
  echo "Installing e2e test dependencies..." >&2
  cd "$E2E_DIR" && npm install --no-audit --no-fund >&2
  cd "$DIR"
fi

exec "$E2E_DIR/node_modules/.bin/playwright" test --config="$E2E_DIR/playwright.config.ts" "$@"
