# Khuym Skills

Khuym is a focused Codex plugin containing five independent meta-skills and one tool-automation skill. It improves how an agent understands, researches, sequences, lands, and visualizes work without imposing a repository workflow.

There is no required chain, onboarding step, plugin-specific state directory, issue graph, handoff file, or approval gate. Invoke one skill when its behavior helps; combine several only when the task genuinely needs them.

## Skills

| Skill | Use it when | Concrete result |
|---|---|---|
| `prompt-leverage` | A prompt is vague, noisy, or missing execution rules | An execution-ready prompt with objective, context, verification, and done criteria |
| `goal-griller` | An idea is too fuzzy for autonomous `/goal` work | A verifiable goal prompt produced through one focused question at a time |
| `xia` | A feature is unfamiliar, ambiguous, version-sensitive, or risky | An evidence-labeled research brief based on local code, upstream patterns, and current official docs |
| `sequence-execution-plan` | Priority order conflicts with dependency or risk order | A dependency-aware Now/Next/Later plan with explicit cause and effect |
| `smart-commits` | Existing changes need to become a clean commit stack | Intent-based commits, appropriate validation, and a push when a destination exists |
| `tldraw-api` | A tldraw canvas should be created, edited, scripted, or verified without mouse automation | A saved `.tldraw` diagram built through the authenticated local Canvas API |

## Concrete Examples

### Improve a weak prompt

Input:

> Make the API faster.

`prompt-leverage` preserves the intent, then adds the missing execution contract. The result identifies which API evidence to inspect, how to measure latency, what behavior must not regress, and what proves completion.

Cause and effect:

1. The original prompt has no measurable target.
2. Without a target, an agent can make arbitrary “performance” edits.
3. Adding a benchmark and regression boundary makes the work verifiable.

### Research before building

Input:

> Add passkeys to this app.

`xia` first reads the repository's auth packages and versions, then searches for reusable local seams, upstream patterns, and current official docs. It returns a recommendation before code is changed.

Cause and effect:

1. Passkey APIs differ by framework and version.
2. Guessing the stack can produce an incompatible design.
3. Mapping local reality first makes the recommendation fit the actual repository.

### Sequence urgent work honestly

Input:

> P0: stop duplicate charges. P2: add idempotency storage.

`sequence-execution-plan` can place the P2 prerequisite before the durable P0 fix without lowering the P0 outcome. If duplicate charges are active, it also places a small mitigation first.

Cause and effect:

1. A priority says what matters most; it does not prove what can execute first.
2. Durable duplicate-charge prevention may require idempotency storage.
3. Therefore the safe order can be mitigation → storage → durable fix → cleanup while the P0 remains open.

### Automate a tldraw diagram

Input:

> Draw this architecture in tldraw without Computer Use.

`tldraw-api` discovers the running desktop app, creates stable shape records, connects nodes with real bindings, saves the document, and verifies it with the canvas linter and a screenshot.

Cause and effect:

1. Mouse automation positions pixels but does not prove connector semantics.
2. API-created bindings keep arrows attached when nodes move.
3. Saving through tldraw plus lint and screenshot checks proves both structural and visual correctness.

## Optional Composition

The skills can compose, but none requires another:

```text
rough idea
  ├─ goal-griller             → make the outcome verifiable
  ├─ xia                     → reduce implementation uncertainty
  ├─ sequence-execution-plan → order the resulting work
  ├─ smart-commits           → land completed changes cleanly
  └─ tldraw-api              → create or edit a canvas directly
```

For a simple request, use only the one relevant skill. For example, “group these changes into commits” should invoke `smart-commits` directly and should not trigger research or planning ceremony.

## Install In Codex

1. Clone this repository.
2. Add [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json) as a local Codex marketplace.
3. Install the `khuym` plugin.
4. Restart Codex if the marketplace does not appear immediately.

The canonical plugin lives at [`plugins/khuym/`](plugins/khuym/), and its skills live at [`plugins/khuym/skills/`](plugins/khuym/skills/).

The plugin advertises Exa and DeepWiki as optional research paths for `xia`. Xia can continue with other available browser/search paths when those services are unavailable.

## Raw Skill Mirrors

Mirror the canonical skill directories for tools that consume raw skills:

```bash
bash scripts/sync-skills.sh --target agents
bash scripts/sync-skills.sh --target claude
```

The sync removes stale symlinks previously created from this repository, including links for retired skills. It never removes unrelated skills or real directories.

Preview without changing either target:

```bash
bash scripts/sync-skills.sh --target all --dry-run
```

## Validate Changes

```bash
bash scripts/check-markdown-links.sh
bash scripts/sync-skills.sh --target all --dry-run
python3 plugins/khuym/skills/prompt-leverage/scripts/test_augment_prompt.py
node scripts/test-goal-guard-hook.mjs
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the skill format and validation checklist.
