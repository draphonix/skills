#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "$repo_root" <<'PY'
from __future__ import annotations

import re
import sys
from pathlib import Path

repo_root = Path(sys.argv[1]).resolve()
targets = [
    repo_root / "README.md",
    repo_root / "CONTRIBUTING.md",
    repo_root / "AGENTS.md",
]

targets.extend(sorted((repo_root / "docs").rglob("*.md")))
targets.extend(sorted((repo_root / "plugins" / "khuym").rglob("*.md")))

link_pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
abs_local_pattern = re.compile(r"^(?:/Users/|/home/|file://)")
skip_prefixes = ("http://", "https://", "mailto:", "#")

errors: list[str] = []

for file_path in targets:
    if not file_path.exists():
        continue

    text = file_path.read_text(encoding="utf8")
    for index, line in enumerate(text.splitlines(), start=1):
        for raw_target in link_pattern.findall(line):
            target = raw_target.strip()
            if target.startswith(skip_prefixes):
                continue
            if abs_local_pattern.match(target):
                errors.append(f"{file_path.relative_to(repo_root)}:{index}: absolute local link: {target}")
                continue

            clean_target = target.split("#", 1)[0]
            if not clean_target:
                continue

            if clean_target.startswith("/"):
                resolved = repo_root / clean_target.lstrip("/")
            else:
                resolved = (file_path.parent / clean_target).resolve()

            try:
                resolved.relative_to(repo_root)
            except ValueError:
                errors.append(f"{file_path.relative_to(repo_root)}:{index}: escapes repo root: {target}")
                continue

            if not resolved.exists():
                errors.append(f"{file_path.relative_to(repo_root)}:{index}: missing target: {target}")

if errors:
    print("\n".join(errors))
    sys.exit(1)

print("Markdown links look portable and valid.")
PY
