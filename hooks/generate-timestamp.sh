#!/usr/bin/env bash
# Generate a timestamp and write to stdout for agent-qa hooks
echo "{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"test_run\": \"gto-study-preflop\"}"
