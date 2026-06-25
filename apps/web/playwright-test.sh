#!/usr/bin/env bash
# Wrapper script: runs playwright test using the workspace-hoisted @playwright/test
# from the repo root to avoid nested node_modules version conflicts.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
E2E_DIR="$DIR/e2e"

# Ensure dependencies are installed at the workspace root
if [ ! -d "$ROOT/node_modules/@playwright/test" ]; then
  echo "Installing workspace dependencies..." >&2
  cd "$ROOT" && npm install --no-audit --no-fund >&2
fi

# Remove stale nested e2e/node_modules if it exists (causes dual-instance conflicts)
if [ -d "$E2E_DIR/node_modules/@playwright/test" ] && [ ! -L "$E2E_DIR/node_modules/@playwright/test" ]; then
  echo "Removing stale nested e2e/node_modules to avoid version conflict..." >&2
  rm -rf "$E2E_DIR/node_modules"
fi

exec "$ROOT/node_modules/.bin/playwright" test --config="$E2E_DIR/playwright.config.ts" "$@"
