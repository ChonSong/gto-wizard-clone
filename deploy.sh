#!/bin/bash
# GTO Wizard Clone — auto-deploy script
# Called by systemd timer to pull, build, test, and restart

REPO="/home/sc/repos/gto-wizard-clone"
LOG="/home/sc/.hermes/logs/gto-wizard-deploy.log"
exec >> "$LOG" 2>&1

echo "[$(date)] Checking for updates..."

cd "$REPO" || exit 1

# Save current state
CURRENT_HASH=$(git rev-parse HEAD)

# Fetch latest
git fetch origin main 2>&1
REMOTE_HASH=$(git rev-parse origin/main)

if [ "$CURRENT_HASH" = "$REMOTE_HASH" ]; then
    echo "[$(date)] Already up to date at $CURRENT_HASH."
    exit 0
fi

echo "[$(date)] New commit: $REMOTE_HASH (was: $CURRENT_HASH)"

# Hard-reset to latest remote (discard local build artifacts like .turbo/*, public/sw.js)
git fetch origin main 2>&1
git reset --hard origin/main 2>&1 || { echo "git reset --hard failed"; exit 1; }
npm install 2>&1 || { echo "npm install failed"; git reset --hard "$CURRENT_HASH"; exit 1; }
uv sync --group runtime 2>&1 || { echo "backend sync failed"; }
rm -rf apps/web/.next apps/web/.turbo 2>/dev/null
npm run build 2>&1 || { echo "build failed"; git reset --hard "$CURRENT_HASH"; exit 1; }

# Run E2E tests — rollback on failure
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers npx playwright test --config=apps/web/playwright.config.ts 2>&1
TEST_EXIT=$?
if [ $TEST_EXIT -ne 0 ]; then
    echo "[$(date)] ⚠ E2E tests failed ($TEST_EXIT failures). Rolling back to $CURRENT_HASH..."
    git reset --hard "$CURRENT_HASH"
    git clean -fd
    npm install 2>&1
    npm run build 2>&1
    systemctl --user restart gto-wizard-web.service 2>&1
    echo "[$(date)] Rollback complete. Running at $CURRENT_HASH."
    exit 1
fi

# Seed preflop strategy data (idempotent — safe to run every deploy)
echo "[$(date)] Seeding preflop strategies..."
PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_preflop_strategies.py 2>&1 || \
    echo "[$(date)] ⚠ Seed script failed (non-fatal — maybe DB not ready)"

# Restart services
systemctl --user restart gto-wizard-web.service 2>&1
echo "[$(date)] ✅ Deployed: $(git rev-parse --short HEAD)"
