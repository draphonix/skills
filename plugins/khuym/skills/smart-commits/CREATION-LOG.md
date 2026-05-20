# Creation Log: smart-commits

## Source Material

Origin:

- Existing standalone Codex skill at `/Users/themrb/.agents/skills/smart-commits/SKILL.md`
- Khuym plugin conventions in `plugins/khuym/skills/*`
- Prior repo memory for Khuym skill ports and release verification

## Extraction Decisions

What to include:

- The original promise: inspect changes, group logical commits, write detailed messages, and push
- Strong boundaries against editing code, stashing, reverting, or disturbing unrelated multi-agent work
- Exact git inspection commands and exact-file staging guidance
- Push behavior for configured and unconfigured upstreams
- Khuym dependency metadata for the `git` CLI

What to leave out:

- Old `model` and `mode` frontmatter, because packaged Khuym skills use portable skill metadata
- Generic examples that did not affect operator behavior
- Scripts, because commit grouping depends on local intent and current diffs

## RED Phase: Manual Baseline

Forward-testing with subagents was not authorized in this turn, so this baseline is a manual pressure pass based on the existing skill, repo instructions, and repeated smart-commit failure modes from prior sessions.

Pressure scenarios:

1. Repository has unrelated hook changes and requested skill-port changes.
   - Likely violation without stronger skill: stage the whole tree with `git add .`.
   - Target correction: preserve requested boundary and stage exact files only.

2. Repository has changes from other agents arriving during the session.
   - Likely violation without stronger skill: stop and ask whether to revert, stash, or keep unrelated files.
   - Target correction: treat existing work as intentional and never disturb it.

3. Branch has no configured upstream.
   - Likely violation without stronger skill: claim push complete or use an uncertain remote.
   - Target correction: push only when the destination is clear, otherwise report local commits.

4. Validation fails before commit.
   - Likely violation without stronger skill: edit code under a commit-only request.
   - Target correction: report the blocker and leave the tree intact unless explicitly asked to fix.

## GREEN Phase

The Khuym skill counters those failures by enforcing:

- commit-only scope
- exact-file staging
- no stash/reset/revert behavior
- explicit boundary preservation
- validation before commit when code changed
- clear push fallback when no upstream exists

## Validation Notes

Structural validation for this packaged port should include:

- `quick_validate.py`
- `check-markdown-links.sh`
- `sync-skills.sh --dry-run`
- `test_onboard_khuym.mjs`
