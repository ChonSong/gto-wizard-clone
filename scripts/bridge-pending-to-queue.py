#!/usr/bin/env python3
"""
One-time bridge script: copies pending Coach review items from
.checkpoint.json completed[] into the dev-queue.json suggestion queue.

The Player writes completed tasks to .checkpoint.json's completed[] array
with coach: "pending". The Coach cron reads from dev-queue.json. This
script bridges the gap by pushing pending checkpoint items into the queue.

Usage:
    python3 scripts/bridge-pending-to-queue.py
"""

import json
import os
import subprocess
import sys

CHECKPOINT_PATH = "/home/sc/repos/gto-wizard-clone/.checkpoint.json"
DEV_QUEUE_CLI = "/home/sc/workspace/dashboard/dev_queue.py"


def load_checkpoint() -> dict:
    """Load .checkpoint.json, return empty dict if missing."""
    if not os.path.exists(CHECKPOINT_PATH):
        print(f"❌ Checkpoint not found: {CHECKPOINT_PATH}")
        return {"completed": []}
    with open(CHECKPOINT_PATH) as f:
        return json.load(f)


def load_queue_ids() -> set:
    """Load existing dev-queue suggestion titles to avoid duplicates."""
    queue_path = os.path.expanduser("~/.hermes/dev-queue.json")
    if not os.path.exists(queue_path):
        return set()
    with open(queue_path) as f:
        data = json.load(f)
    return {s.get("title", "") for s in data.get("suggestions", [])}


def needs_review(item: dict) -> bool:
    """Check if an item needs coach review (pending or missing coach field)."""
    coach = item.get("coach")
    return coach == "pending" or coach is None


def push_to_queue(task: str, sha: str, summary: str) -> dict | None:
    """Call dev_queue.py add-suggestion to push an item into the queue."""
    title = f"Coach review: {task}"
    description = f"Player task completed at commit {sha or 'unknown'}.\n\n{summary or 'No summary provided.'}"
    criteria = "Coach to verify against reference and issue verdict (APPROVE/FIX/REVERT)."

    cmd = [
        sys.executable,
        DEV_QUEUE_CLI,
        "add-suggestion",
        "--source",
        "coach",
        "--project",
        "gto-wizard-clone",
        "--title",
        title,
        "--description",
        description,
        "--criteria",
        criteria,
        "--priority",
        "3",
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            # Extract the desire_id from output
            for line in result.stdout.splitlines():
                if "✅ Created" in line:
                    item_id = line.split("✅ Created")[1].strip().split(":")[0].strip()
                    print(f"  ✅ Pushed: {title} → id={item_id}")
                    return {"id": item_id, "title": title}
            print(f"  ✅ Pushed (output): {title}")
            print(f"     {result.stdout.strip()}")
            return {"title": title}
        else:
            print(f"  ❌ Failed to push {title}: {result.stderr.strip()}")
            return None
    except subprocess.TimeoutExpired:
        print(f"  ⏱️  Timeout pushing {title}")
        return None
    except Exception as e:
        print(f"  ❌ Error pushing {title}: {e}")
        return None


def main():
    print("=" * 60)
    print("BRIDGE: .checkpoint.json completed[] → dev-queue.json")
    print("=" * 60)

    checkpoint = load_checkpoint()
    completed = checkpoint.get("completed", [])
    print(f"\nCheckpoint has {len(completed)} completed items total")

    pending = [item for item in completed if needs_review(item)]
    print(f"Items needing coach review (coach pending/missing): {len(pending)}\n")

    if not pending:
        print("No pending items to bridge. Done.")
        return

    existing_titles = load_queue_ids()
    print(f"Existing queue has {len(existing_titles)} suggestions (for dedup)\n")

    pushed = 0
    skipped_dup = 0

    for item in pending:
        task = item.get("task", "unknown")
        sha = item.get("sha", "")
        summary = item.get("summary", "")
        coach = item.get("coach", "MISSING")

        # Build the title we'd use for dedup
        title = f"Coach review: {task}"

        if title in existing_titles:
            print(f"  ⏭️  Skipping (already in queue): {task}")
            skipped_dup += 1
            continue

        print(f"\n--- Processing: {task} ---")
        print(f"    sha: {sha}  coach: {coach}")

        result = push_to_queue(task, sha, summary)
        if result:
            pushed += 1
            existing_titles.add(title)

    print(f"\n{'=' * 60}")
    print(f"SUMMARY: {pushed} items pushed, {skipped_dup} skipped (duplicates)")
    if pushed > 0:
        print("The Coach will now find these items in dev-queue.json on next tick.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
