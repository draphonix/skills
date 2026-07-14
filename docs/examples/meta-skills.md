# Independent Meta-Skill Examples

These examples show that the skills can be used alone or composed without a mandatory Khuym lifecycle.

## One Skill: Clean Commits

Request:

> Group the current changes into logical commits and push them.

Expected behavior:

1. `smart-commits` inspects staged, unstaged, untracked, renamed, and deleted files.
2. It groups files by product intent.
3. It runs repository-appropriate checks.
4. It creates each commit from explicit paths or hunks.
5. It pushes only when a clear destination exists.

No research brief, execution plan, state file, or handoff is needed because the request is already concrete.

## Two Skills: Clarify, Then Sequence

Request:

> Make checkout reliable, then plan the work.

Possible composition:

1. `goal-griller` asks what observable checkout behavior must be true and how it will be proven.
2. Once the outcome is concrete, `sequence-execution-plan` separates immediate mitigation, prerequisites, durable repair, rollout, and cleanup.

Cause and effect:

- Without a success condition, “reliable” can mean fewer errors, no duplicate charges, or faster recovery.
- Once the target is explicit, dependencies can be tested against real acceptance criteria.
- Therefore clarification comes first in this example, but it is not a global plugin rule.

## Research Plus Sequencing

Request:

> We need passkeys in this app. Research the safest approach and show the execution order.

Possible composition:

1. `xia` identifies the actual auth stack and versions.
2. It checks local extension points, upstream patterns, and current official documentation.
3. It recommends reuse, built-in capability, upstream adaptation, or new implementation.
4. `sequence-execution-plan` turns that evidence into Now, Next, and Later horizons.

If Xia finds that the installed auth library already supports passkeys, that evidence can eliminate a speculative custom credential service. The plan becomes smaller because research changed the dependency graph.

## Boundary Case: No Skill

Request:

> Alphabetize beta, alpha, gamma.

Expected response:

```text
alpha
beta
gamma
```

The plugin should not add ceremony to a trivial transformation.
