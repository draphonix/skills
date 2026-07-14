---
name: goal-griller
description: Turn vague ideas into verifiable Codex goals. Use when the user mentions goal mode, /goal, create_goal, autonomous work, or asks for an interview before goal creation.
---

# Goal Griller

Interrogate fuzzy intent until it becomes a goal Codex can autonomously pursue, verify, and stop on. This skill is inspired by the `grill-me` pattern: ask one question at a time, recommend an answer, and inspect the codebase instead of asking when the answer is discoverable.

## Hard Gate

Do not produce a final `/goal` prompt until these six fields are clear enough:

1. Outcome: the single truth the user wants made real.
2. Success condition: measurable or objectively inspectable proof that the outcome is true.
3. Scope boundary: what may change and what must not change.
4. Context: files, docs, logs, issues, screenshots, services, or commands Codex should read first.
5. Validation loop: cheap checks during work and final checks before claiming done.
6. Stop and pause rules: when to stop as done, and when to pause for human input.

If any field is missing, ask the next highest-leverage question instead of drafting the final goal.

## Interview Loop

1. Restate the apparent intent in one sentence.
2. Identify the weakest missing field from the hard gate.
3. If the answer can be discovered from local files, active goal state, logs, docs, tests, or repo conventions, inspect those sources instead of asking.
4. Ask exactly one question at a time.
5. For each question, include your recommended answer and why it is probably right.
6. After the user answers, update the working goal shape and repeat.

The interview should feel useful, not bureaucratic. Prefer three sharp questions over ten generic ones. Stop interviewing as soon as the goal is safely draftable.

## Question Priority

Ask in this order unless local context shows a different blocker:

1. What should be true at the end?
2. How will we prove it is true?
3. What is explicitly out of scope?
4. What should Codex read or preserve before acting?
5. What checks should run repeatedly versus only at the end?
6. What should make Codex pause instead of improvising?
7. What proof should Codex leave behind for review?

## Anti-Vague Rewrites

Reject goals shaped like these:

- "Improve the app."
- "Fix all bugs."
- "Make it production ready."
- "Refactor this codebase."
- "Research this and do the best thing."

Convert them into a single outcome plus proof:

- Instead of "Improve the app": "Reduce dashboard initial load time by at least 25% with no visible behavior regressions, proven by benchmark output and browser screenshots."
- Instead of "Fix all bugs": "Make the checkout flow pass the failing Playwright suite and preserve existing successful payment behavior."
- Instead of "Refactor this codebase": "Extract the duplicated auth/session logic into one shared module while preserving all current tests and public API behavior."

## Goal Prompt Contract

When the hard gate is satisfied, output:

```text
/goal [single objective]

Context to read first:
- [...]

Constraints:
- [...]

Operating rules:
- Keep a concise progress log in [file] when the task is long-running.
- Prefer small verified iterations over large unverified edits.
- Do not expand scope without pausing.

Validation loop:
- During work: [...]
- Final proof: [...]

Done when:
- [...]

Pause if:
- [...]
```

Also include a short "Why this goal is safe to run" note with the success condition, main risk, and proof artifact.

## Do Not Silently Start

If the user asked only to create a goal prompt, do not invoke `/goal`, `create_goal`, or any equivalent goal-setting tool. Present the draft and ask for acceptance only if execution requires it.

If the user explicitly asked to set the goal too, show the final draft first when there was any interview or inference. Set it only after the user confirms that the draft matches their intent.

## Hook Interaction

The general `Goal Guard` `PreToolUse` hook may block `create_goal`, `set_goal`, `set_goals`, or `/goal`-style tool calls after LLM review. When blocked, immediately run this skill's interview loop and produce a stronger goal prompt instead of trying to bypass the hook.
