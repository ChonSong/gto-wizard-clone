# GTO Wizard Clone — Developer Makefile
# Targets for common development and ops tasks.

.PHONY: help seed-preflop seed-all health-check

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

seed-preflop:   ## Seed preflop GTO strategies into PostgreSQL (idempotent)
	PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_preflop_strategies.py

seed-all:       ## Seed all strategies (preflop + flop, all depths) into PostgreSQL (idempotent)
	PYTHONPATH=apps/api .venv/bin/python apps/api/prisma/seed_all_strategies.py

health-check:   ## Run deploy health check against API and frontend endpoints
	bash scripts/deploy-health-check.sh

install:        ## Install pre-commit hook (idempotent — safe to run repeatedly)
	@if [ -d .git ]; then \
		ln -sf ../../scripts/pre-commit .git/hooks/pre-commit && \
		echo "✅ Pre-commit hook installed (6 structural gates active)"; \
	else \
		echo "⏭️  Skipping hook install — not in a git repo"; \
	fi
