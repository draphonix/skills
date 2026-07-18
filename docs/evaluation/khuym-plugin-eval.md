# Khuym Plugin Evaluation

This runbook checks that the Khuym plugin behaves as six independent skills and does not recreate the retired workflow through routing or hidden repository requirements.

## Static Checks

```bash
node scripts/khuym-plugin-eval.mjs analyze plugins/khuym --format markdown
bash scripts/check-markdown-links.sh
bash scripts/sync-skills.sh --target all --dry-run
```

Static analysis should find exactly the canonical skill directories documented in [the README](../../README.md). Runtime files should not reference a bootstrap skill, shared workflow state, swarm reservations, or a mandatory phase chain.

## Script Checks

```bash
python3 plugins/khuym/skills/prompt-leverage/scripts/test_augment_prompt.py
node scripts/test-goal-guard-hook.mjs
```

The first check proves the deterministic prompt augmenter still works. The second proves an under-specified goal is redirected toward `goal-griller` while a sufficiently specified goal passes.

## Behavioral Benchmark

```bash
node scripts/khuym-plugin-eval.mjs benchmark plugins/khuym \
  --config plugins/khuym/.plugin-eval/benchmark.json \
  --usage-out /tmp/khuym-plugin-eval-usage.jsonl \
  --result-out /tmp/khuym-plugin-eval-benchmark.json \
  --format markdown
```

The scenarios test five positive routes and one negative boundary:

- a weak prompt routes to `prompt-leverage`
- a vague autonomous objective routes to `goal-griller`
- an unfamiliar feature routes to `xia`
- conflicting priority and dependency order routes to `sequence-execution-plan`
- a request to script an installed tldraw app routes to `tldraw-api`
- a trivial alphabetization request routes to no Khuym skill

## What Failure Means

Examples:

- If the vague goal is immediately executed, `goal-griller` failed its hard gate.
- If Xia edits code before producing evidence, its research boundary failed.
- If a plan orders work by priority labels alone, dependency reasoning failed.
- If a tldraw task exposes the local bearer token, hardcodes a renderer hash, or falls back to mouse automation without necessity, API automation failed.
- If any scenario demands plugin onboarding or shared workflow state, the retired workflow leaked back into the plugin.
- If alphabetization triggers a skill, the plugin is over-routing.

Evaluate scenario outcomes, not only whether a skill name appeared. Correct routing with incorrect behavior is still a failure.
