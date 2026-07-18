# Contributing Skills

This repository packages independent, reusable meta-skills and cross-project tool skills in the `khuym` Codex plugin.

## Scope Test

A skill belongs here only when it improves how an agent works across many repositories or provides a reusable tool workflow without requiring a shared lifecycle or state machine.

Ask these questions before adding one:

1. Can a user invoke it directly from an ordinary request?
2. Can it finish without another Khuym skill?
3. Does it avoid mandatory plugin-specific state, handoff files, issue trackers, or fixed phase gates?
4. Is the behavior useful across multiple languages, frameworks, project types, or artifacts?
5. Does the skill add non-obvious reusable judgment instead of merely encoding one personal workflow?

Concrete boundary:

- “Turn this vague idea into a verifiable goal” belongs because it works independently in almost any repo.
- “Create or edit a tldraw diagram through the installed app's local API” belongs because the workflow is reusable across projects and avoids machine-specific UI automation.
- “After phase 3, update Khuym state and hand off to the swarm skill” does not belong because it only works inside a fixed workflow.
- “Convert this one book format into one vendor's training pipeline” does not belong because it is a domain-specific automation, not a meta-skill.

## Canonical Layout

```text
plugins/khuym/
├── .codex-plugin/plugin.json
├── .mcp.json
└── skills/
    └── skill-name/
        ├── SKILL.md
        ├── agents/
        │   └── openai.yaml
        ├── references/       # optional, loaded only when needed
        ├── scripts/          # optional, deterministic repeated work
        └── assets/           # optional, copied into outputs
```

Do not add `README.md`, `CREATION-LOG.md`, changelogs, or installation guides inside a skill directory. Put public repository documentation at the repository root or under `docs/`.

## SKILL.md

Use lowercase hyphenated folder names. The folder name must equal the skill's `name`.

```yaml
---
name: example-skill
description: Explain what the skill does and the concrete requests that should trigger it.
---

# Example Skill

Write concise imperative instructions here.
```

Keep frontmatter to `name` and `description`. Put all trigger information in `description`, because the body is loaded only after selection.

Keep `SKILL.md` under 500 lines. Move detailed examples or protocols into one-level-deep `references/` files and link to them directly from `SKILL.md`.

## Agent Metadata

Each skill should include `agents/openai.yaml`:

```yaml
interface:
  display_name: "Example Skill"
  short_description: "One concise user-facing description"
  default_prompt: "Use $example-skill to ..."
```

When the skill's purpose or trigger changes, check that these values still match.

## Scripts

Add a script only when the same deterministic logic would otherwise be rewritten repeatedly. Test every added or changed script.

For example, `prompt-leverage/scripts/augment_prompt.py` is justified because it provides a repeatable first-pass transformation. A one-off shell command copied from a single project is not.

## Validation

Run the repository checks:

```bash
bash scripts/check-markdown-links.sh
bash scripts/sync-skills.sh --target all --dry-run
python3 plugins/khuym/skills/prompt-leverage/scripts/test_augment_prompt.py
node scripts/test-goal-guard-hook.mjs
```

Also validate every changed skill with the `skill-creator` `quick_validate.py` available in your Codex installation.

## Installation Test

1. Add [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json) as a local marketplace.
2. Install the `khuym` plugin.
3. Start a fresh Codex session.
4. Try one positive trigger and one nearby request that should not trigger the skill.

Example for `sequence-execution-plan`:

- Positive: “These priorities conflict with their prerequisites; give me a safe execution order.”
- Negative: “Alphabetize these issue titles.”

The positive request should produce dependency reasoning. The negative request should be answered directly without loading the skill.
