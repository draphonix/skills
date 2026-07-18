#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skills_root="$repo_root/plugins/khuym/skills"
agents_target_root="${AGENTS_SKILLS_DIR:-$HOME/.agents/skills}"
claude_target_root="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
targets="${SKILLS_SYNC_TARGETS:-agents}"
dry_run=0

usage() {
  echo "Usage: bash scripts/sync-skills.sh [--dry-run] [--target agents|claude|all]" >&2
}

while [[ $# -gt 0 ]]; do
  case "${1}" in
    --dry-run)
      dry_run=1
      shift
      ;;
    --target)
      if [[ $# -lt 2 ]]; then
        usage
        exit 1
      fi
      targets="${2}"
      shift 2
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

case "${targets}" in
  agents|claude|all)
    ;;
  *)
    usage
    exit 1
    ;;
esac

python3 - "$skills_root" "$agents_target_root" "$claude_target_root" "$targets" "$dry_run" <<'PY'
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

skills_root = Path(sys.argv[1]).resolve()
agents_target_root = Path(sys.argv[2]).expanduser()
claude_target_root = Path(sys.argv[3]).expanduser()
targets = sys.argv[4]
dry_run = sys.argv[5] == "1"

if not skills_root.is_dir():
    raise SystemExit(f"Missing canonical skills directory: {skills_root}")

name_pattern = re.compile(r"^name:\s*(.+?)\s*$")
skills: list[tuple[str, Path]] = []

for skill_md in sorted(skills_root.glob("*/SKILL.md")):
    lines = skill_md.read_text(encoding="utf8").splitlines()
    if not lines or lines[0].strip() != "---":
        raise SystemExit(f"Missing YAML frontmatter in {skill_md}")

    public_name: str | None = None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        match = name_pattern.match(line)
        if match:
            public_name = match.group(1).strip().strip("'\"")
            break

    if not public_name:
        raise SystemExit(f"Missing frontmatter name in {skill_md}")

    skills.append((public_name, skill_md.parent))

target_roots: list[tuple[str, Path]] = []
if targets in {"agents", "all"}:
    target_roots.append(("agents", agents_target_root))
if targets in {"claude", "all"}:
    target_roots.append(("claude", claude_target_root))

actions: list[tuple[str, str, Path, Path]] = []

for name, source_dir in skills:
    for target_name, target_root in target_roots:
        target_dir = target_root / name
        actions.append((target_name, name, source_dir, target_dir))

current_sources = {source_dir.resolve() for _, source_dir in skills}
stale_links: list[tuple[str, Path, Path]] = []

for target_name, target_root in target_roots:
    if not target_root.is_dir():
        continue

    for target_dir in target_root.iterdir():
        if not target_dir.is_symlink():
            continue

        raw_target = Path(os.readlink(target_dir))
        resolved_target = (
            raw_target if raw_target.is_absolute() else target_dir.parent / raw_target
        ).resolve(strict=False)

        try:
            resolved_target.relative_to(skills_root)
        except ValueError:
            continue

        if resolved_target.parent != skills_root:
            continue

        if resolved_target not in current_sources:
            stale_links.append((target_name, target_dir, resolved_target))

conflicts = [
    (target_name, name, target_dir)
    for target_name, name, _, target_dir in actions
    if target_dir.exists() and not target_dir.is_symlink()
]

if dry_run:
    for target_name, target_dir, resolved_target in stale_links:
        print(f"would unlink stale [{target_name}]: {target_dir} -> {resolved_target}")
    for target_name, name, source_dir, target_dir in actions:
        if target_dir.exists() and not target_dir.is_symlink():
            print(f"would refuse non-symlink [{target_name}] {name}: {target_dir}")
        else:
            print(f"would link [{target_name}] {name}: {target_dir} -> {source_dir}")
    raise SystemExit(0)

if conflicts:
    details = "\n".join(
        f"- [{target_name}] {name}: {target_dir}"
        for target_name, name, target_dir in conflicts
    )
    raise SystemExit(f"Refusing to replace non-symlink skill targets:\n{details}")

for _, target_root in target_roots:
    target_root.mkdir(parents=True, exist_ok=True)

for target_name, target_dir, resolved_target in stale_links:
    target_dir.unlink()
    print(f"unlinked stale [{target_name}]: {target_dir} -> {resolved_target}")

for target_name, name, source_dir, target_dir in actions:
    if target_dir.is_symlink():
        target_dir.unlink()
    elif target_dir.exists():
        raise SystemExit(
            f"Refusing to replace non-symlink [{target_name}] {name}: {target_dir}"
        )
    os.symlink(source_dir, target_dir, target_is_directory=True)
    print(f"linked [{target_name}] {name}: {target_dir} -> {source_dir}")
PY
