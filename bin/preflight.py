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
    _, status = run("git", "status", "--short", "--branch")
    latest = ROOT / "batches/handoff/LATEST.md"
    print(json.dumps({"validation_rc": rc, "validation": validation, "git": status.splitlines()[:20], "handoff": str(latest), "handoff_exists": latest.exists()}, ensure_ascii=False, indent=2))
    return rc

if __name__ == "__main__":
    raise SystemExit(main())
