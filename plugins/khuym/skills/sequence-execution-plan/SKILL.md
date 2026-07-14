---
name: sequence-execution-plan
description: Break a goal, feature, incident, backlog, or rough implementation proposal into a dependency-aware execution plan. Use when Codex must distinguish business priority from execution order; identify outcomes, tasks, prerequisites, mitigations, blockers, and work that overlaps or is absorbed; compare direct, foundation-first, mitigation-first, merged, or parallel paths; define acceptance criteria and reconciliation triggers; or explain why lower-priority work must precede a higher-priority outcome without hiding unresolved risk.
---

# Sequence Execution Plan

Turn a flat request or priority list into a small dependency graph and then into an executable sequence. Optimize first for meaningful risk reduction, then durable completion, while controlling effort, uncertainty, and planning churn.

## Preserve the Core Distinctions

Keep these fields separate. Never use one as a substitute for another.

| Field | Question it answers |
|---|---|
| Outcome priority | How important or damaging is the unmet outcome? |
| Current impact | What is happening while the outcome remains unmet? |
| Mitigation status | Has the immediate impact been reduced? |
| Durable resolution | Has the required outcome actually been achieved? |
| Execution order | What should be done next, considering dependencies and risk? |

Allow a P2 prerequisite to execute before a P0 durable fix when the prerequisite is genuinely necessary. Keep the P0 outcome open until its acceptance criteria are satisfied. If active damage continues, place the smallest safe mitigation before the prerequisite.

## Build the Plan

### 1. Frame the Required Outcome

Restate the request as an observable result rather than a proposed implementation.

Capture:

- the desired outcome;
- who or what benefits;
- current impact and cost of delay;
- constraints, deadlines, SLAs, and non-goals;
- acceptance evidence that proves durable completion.

Separate known facts from assumptions. Ask only for information whose answer could materially change the first committed action; otherwise state a reasonable assumption and continue.

Example: Replace “build a retry service” with “failed payment notifications are retried without duplicate charges, and operators can prove delivery or terminal failure.” The retry service is one candidate implementation, not the outcome.

### 2. Decompose into Outcome and Work Items

Create the smallest work items that produce independently verifiable progress. Include investigation only when it resolves a named uncertainty.

For each item, record:

- **Result:** observable state produced by the item.
- **Type:** outcome, mitigation, prerequisite, implementation, validation, rollout, or cleanup.
- **Done evidence:** test, metric, artifact, decision, or observed behavior.
- **Estimate:** relative size or time range when useful.
- **Uncertainty:** low, medium, or high, with the unknown named.
- **Current state:** ready, blocked, in progress, or done.

Avoid vague items such as “improve architecture,” “handle edge cases,” or “test everything.” Replace each with a bounded result.

### 3. Map Cause-and-Effect Relationships

Express each relationship as a sentence before drawing an ordering conclusion:

- `A blocks B`: B cannot start or finish until A is complete.
- `A enables B`: A makes B cheaper, safer, or possible but may not be mandatory.
- `A mitigates B`: A reduces B's active impact without durably resolving B.
- `A overlaps B`: some acceptance criteria are shared.
- `A replaces B`: completing A satisfies every required criterion of B.
- `A validates B`: A supplies evidence that B works.

Do not infer dependency from preference. “The code would be cleaner after A” does not prove that B is blocked by A.

### 4. Test Every Proposed Foundation

Classify a foundation as exactly one of:

- **Necessary:** the target cannot be completed correctly, safely, or within a binding constraint without it.
- **Useful:** it reduces effort or improves maintainability, but a direct solution can still meet acceptance criteria.
- **Speculative:** its value depends on unproven future work.

Before scheduling a foundation first, answer:

1. Which acceptance criterion becomes impossible or unsafe without it?
2. What evidence shows the direct path is inadequate?
3. How long can the foundation take, including uncertainty?
4. What impact continues during that delay?
5. Can its scope be narrowed to the capability the target actually needs?
6. Does it unlock other committed outcomes?

Schedule a necessary foundation before the durable fix. Prefer the direct path over a merely useful foundation unless the measured enablement value justifies the delay. Exclude speculative foundations from the committed horizon.

### 5. Handle Active High-Severity Impact

When severe impact is active, split response from resolution:

1. Contain damage with the smallest safe reversible action.
2. Add observability needed to verify the containment.
3. Build any proven prerequisite.
4. Implement and validate the durable resolution.
5. Remove the temporary measure after the durable fix is proven.

Do not let a large foundational project delay containment. Do not describe a mitigation as resolution.

### 6. Generate Candidate Paths

Compare at least the plausible paths rather than defending the first decomposition:

- direct target;
- prerequisite, then target;
- mitigation, prerequisite, target, cleanup;
- mitigation and prerequisite in parallel, then target;
- replacement item only, with the target's criteria transferred;
- investigation, then choose between direct and prerequisite paths.

For each candidate, estimate:

- time to first meaningful risk reduction;
- time to durable completion;
- continuing impact during the path;
- effort and reversibility;
- key uncertainty and failure mode;
- enablement value for other committed work.

Reject a path when it violates a binding constraint or leaves an acceptance criterion uncovered. Choose the remaining path that reduces meaningful risk earliest and reaches durable completion with controlled effort and uncertainty.

### 7. Order into Commitment Horizons

Produce three horizons:

- **Now:** one or two ready actions the team can start without another planning session.
- **Next:** actions unlocked by Now, including explicit branch conditions.
- **Later:** valid but reorderable work; keep speculative work here or omit it.

Expose parallel work only when ownership, shared resources, and the join point are clear. Never use parallelism to disguise a dependency.

For every non-obvious ordering decision, state cause and effect:

> Do M before F because damage is continuing and M can stop it today. Do prerequisite Y before durable fix F because criterion C cannot be met safely without capability Y. Keep outcome X at P0 until F passes validation V.

### 8. Preserve Traceability When Work Is Absorbed

Merge tracking objects only after transferring:

- all acceptance criteria;
- the original urgency and current-impact record;
- stakeholders or owners;
- validation evidence required for closure;
- a link or note explaining the relationship.

Use “merged,” “superseded,” “duplicate,” or “tracked by” for the old work item. Use “resolved” only after the underlying outcome is achieved. If a lower-priority item absorbs a P0, raise the relevant outcome priority or retain a P0 parent outcome so urgency is not lost.

### 9. Define Reconciliation Triggers

Keep the Now horizon stable unless evidence invalidates it. Reconcile when:

- a new severe issue appears;
- active impact materially changes;
- an estimate or uncertainty changes enough to alter the chosen path;
- a presumed prerequisite proves unnecessary or insufficient;
- an item becomes blocked or unlocks multiple alternatives;
- acceptance criteria or external constraints change;
- a commitment horizon completes.

At reconciliation, update facts and dependencies first, regenerate candidate paths, and then reorder. Do not reorder solely because agents prefer a different architecture.

## Produce the Planning Artifact

Use this structure unless the user requests another format:

1. **Outcome and evidence** — desired result, acceptance criteria, current impact, constraints, assumptions.
2. **Work-item table** — ID, result, type, priority, state, estimate, uncertainty, done evidence.
3. **Dependency map** — explicit relationship sentences or a compact graph.
4. **Candidate paths** — alternatives with time to mitigation, time to resolution, and main tradeoff.
5. **Chosen sequence** — Now, Next, Later, including parallel branches and join points.
6. **Decision rationale** — step-by-step cause and effect for surprising order choices.
7. **Risk and traceability** — active unresolved risk, absorbed items, temporary measures, cleanup.
8. **Reconciliation triggers** — evidence that causes replanning.

Use absolute dates or measurable events instead of “soon” or “later” when timing matters. Mark estimates as estimates. Do not fabricate priorities, SLAs, dependencies, or effort data.

## Quality Gate

Before returning the plan, verify:

- Every item has an observable result and completion evidence.
- Every dependency has a concrete cause, not merely an architectural preference.
- Active severe impact has an explicit mitigation decision.
- Every acceptance criterion is covered by the chosen path.
- No mitigation or planned replacement is mislabeled as resolved.
- The first action is ready and small enough to begin.
- Speculative foundation work is outside the committed horizon.
- The plan states what new evidence would change its order.

For detailed worked examples covering incidents, foundations, absorbed tickets, and discovery branches, read [references/worked-examples.md](references/worked-examples.md).
