# Repository Instructions

This repository contains independent, reusable meta-skills. The canonical skill tree is `plugins/khuym/skills/`.

## Scope

- Keep each skill directly invokable from an ordinary user request.
- Do not require another Khuym skill to run before or after it.
- Do not introduce plugin-specific onboarding, shared runtime state, handoff files, fixed phase gates, or issue-tracker dependencies.
- Prefer broadly reusable agent judgment over project-specific or vendor-specific workflows.

## Skill Format

- Keep YAML frontmatter to `name` and `description`.
- Put concrete trigger conditions in `description`.
- Keep `SKILL.md` concise and move optional detail into directly linked `references/`.
- Keep `agents/openai.yaml` aligned with the skill.
- Do not add creation logs, changelogs, installation guides, or per-skill readmes.

## Validation

After changing skills or plugin metadata, run:

```bash
bash scripts/check-markdown-links.sh
bash scripts/sync-skills.sh --target all --dry-run
python3 plugins/khuym/skills/prompt-leverage/scripts/test_augment_prompt.py
node scripts/test-goal-guard-hook.mjs
```

Validate each changed skill with the `skill-creator` `quick_validate.py` available in the active Codex installation.
