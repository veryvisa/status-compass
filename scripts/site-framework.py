#!/usr/bin/env python3
from __future__ import annotations
import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
SHARED = WORKSPACE / "bin" / "site_framework.py"

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("shared_site_framework", SHARED)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    site = json.loads((ROOT / "data" / "site-framework.json").read_text())
    module.build(site, args.dist.resolve())
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
