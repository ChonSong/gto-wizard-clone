#!/usr/bin/env bash
# deploy-health-check.sh — Verify all GTO Wizard services are responding after deploy
# Exits 0 only if ALL checks pass. Each failure is reported with endpoint info.
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001}"
WEB_BASE="${WEB_BASE:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-5}"
failures=0
total=0

check_get() {
    local name="$1" url="$2"
    total=$(( total + 1 ))
    echo -n "CHECK [${total}] GET ${name}: ${url} ... "
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" -X GET "${url}" 2>/dev/null || echo "000")
    if [ "${http_code}" -ge 200 ] && [ "${http_code}" -lt 400 ]; then
        echo "OK (${http_code})"
    else
        echo "FAIL (${http_code})"
        failures=$(( failures + 1 ))
    fi
}

check_post() {
    local name="$1" url="$2" data="$3"
    total=$(( total + 1 ))
    echo -n "CHECK [${total}] POST ${name}: ${url} ... "
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" -X POST "${url}" -H "Content-Type: application/json" -d "${data}" 2>/dev/null || echo "000")
    if [ "${http_code}" -ge 200 ] && [ "${http_code}" -lt 400 ]; then
        echo "OK (${http_code})"
    else
        echo "FAIL (${http_code})"
        failures=$(( failures + 1 ))
    fi
}

echo "===== GTO Wizard Deploy Health Check ====="
echo "API: ${API_BASE} | Web: ${WEB_BASE} | Timeout: ${TIMEOUT}s"
echo ""

# Backend core
check_get "API Health" "${API_BASE}/api/v1/health"
check_get "Solver Health" "${API_BASE}/api/v1/solver/health"

# Postflop solver endpoint
check_post "Solver Postflop Strategy" "${API_BASE}/api/v1/solver/postflop-strategy" \
    '{"board":"KsKc3s","position":"BTN","street":"flop","pot_size":5.5,"stack_depth":97.5}'

# Frontend pages
check_get "Frontend Home" "${WEB_BASE}/"
check_get "Study Page" "${WEB_BASE}/study"
check_get "Strategies Page" "${WEB_BASE}/strategies"
check_get "Quiz Page" "${WEB_BASE}/quiz"
check_get "PLO4 Page" "${WEB_BASE}/plo4"
check_get "Omaha Page" "${WEB_BASE}/omaha"
check_get "Bomb Pot Page" "${WEB_BASE}/bomb-pot"
check_get "Double Board Page" "${WEB_BASE}/double-board"

echo ""
echo "===== Results: ${failures} failure(s) out of ${total} checks ====="

if [ "${failures}" -gt 0 ]; then
    echo "DEPLOY HEALTH CHECK FAILED"
    exit 1
fi

echo "All checks passed — deploy is healthy."
exit 0
