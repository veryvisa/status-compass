#!/usr/bin/env python3
from __future__ import annotations
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(*args: str) -> tuple[int, str]:
    proc = subprocess.run(args, cwd=ROOT, text=True, capture_output=True)
    return proc.returncode, (proc.stdout + proc.stderr).strip()

def main() -> int:
    rc, validation = run("node", "scripts/validate-rules.mjs")
    # 规则到期门：checked_at 超过 90 天的 verified 规则未重读即 rc=1（只报不改规则）。
    due_rc, due = run("node", "scripts/rules-expiry.mjs", "--rules", "data/rules.json", "--as-of", "today", "--max-age-days", "90", "--out", "reports/rules-expiry-latest.json", "--fail-on-due")
    _, status = run("git", "status", "--short", "--branch")
    latest = ROOT / "batches/handoff/LATEST.md"
    print(json.dumps({"validation_rc": rc, "validation": validation, "rules_due_rc": due_rc, "rules_due": due, "git": status.splitlines()[:20], "handoff": str(latest), "handoff_exists": latest.exists()}, ensure_ascii=False, indent=2))
    return rc or due_rc

if __name__ == "__main__":
    raise SystemExit(main())
