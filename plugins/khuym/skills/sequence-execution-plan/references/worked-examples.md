# Worked Examples

## Contents

1. Active P0 with a required foundation
2. Useful architecture that should not delay the target
3. One item absorbs another without erasing risk
4. Uncertainty requires a short discovery branch

## 1. Active P0 with a Required Foundation

### Input

- X is P0: checkout requests sometimes create duplicate charges.
- The durable fix needs an idempotency key stored atomically.
- Y is P2: add a shared idempotency store.
- Y will take three days; a feature flag can disable automatic retries in one hour.

### Cause and effect

1. Duplicate charges are continuing, so waiting three days for Y leaves unacceptable damage active.
2. Disabling automatic retries stops the known duplicate path, so mitigation M executes first.
3. The acceptance criterion “a retried request cannot charge twice” requires an atomic idempotency record, so Y is necessary rather than merely cleaner.
4. Therefore Y executes after M and before the durable X implementation.
5. The feature flag reduces availability and is temporary, so cleanup executes only after production validation.
6. X remains P0 and unresolved until the durable behavior is verified.

### Sequence

| Horizon | Item | Done evidence |
|---|---|---|
| Now | M: disable automatic retries | Duplicate-charge metric stops increasing for the known path |
| Now | O: add duplicate-attempt telemetry | Dashboard distinguishes rejected retries from new payments |
| Next | Y: implement atomic idempotency storage | Concurrency test proves one charge for repeated keys |
| Next | F: integrate checkout with Y | Load and failure tests pass; canary shows no duplicates |
| Later | C: restore retries and remove flag | Retry success recovers without duplicate charges |

## 2. Useful Architecture That Should Not Delay the Target

### Input

- X is P1: users cannot export invoices containing non-ASCII customer names.
- A direct encoding fix takes one day.
- Y is a proposed six-week rewrite of the reporting service.

### Foundation test

- X's acceptance criteria can be met and tested without Y.
- Y may improve future maintainability, but no binding constraint requires it.
- Six weeks of continued export failures exceed the one-day direct path.

Classify Y as useful or speculative, not necessary.

### Sequence

1. Add a failing export fixture containing Vietnamese, Japanese, and Arabic names.
2. Correct the encoding boundary.
3. Run regression fixtures and deploy the fix.
4. Evaluate the reporting rewrite as a separate proposal with its own outcomes and evidence.

The cause is that the direct path satisfies X safely; the effect is that Y has no right to block X merely because it produces a cleaner architecture.

## 3. One Item Absorbs Another Without Erasing Risk

### Input

- X is P0: administrators can accidentally expose a private workspace.
- Y is P2: replace the permission editor.
- The new editor will remove the unsafe control and satisfies all X criteria.

### Incorrect handling

Close X as resolved immediately and leave Y at P2. This makes metrics claim the exposure risk is gone even though the old editor is still live.

### Correct handling

1. Copy X's acceptance criteria into Y or make X the P0 parent outcome.
2. Mark the ticket object X as “tracked by Y,” not “resolved.”
3. Transfer the P0 urgency to the relevant Y scope.
4. Add an interim confirmation step if it materially reduces active risk.
5. Resolve the P0 outcome only after the new editor is deployed and exposure tests pass.

## 4. Uncertainty Requires a Short Discovery Branch

### Input

- X is P1: search latency exceeds the target at peak load.
- One team proposes a new index Y.
- It is unknown whether the bottleneck is index lookup or downstream authorization.

### Cause and effect

Building Y immediately is speculative because the bottleneck is unknown. A bounded trace-and-load-test task D can distinguish the paths in four hours.

### Branching plan

1. Now: run D and capture latency by stage under representative load.
2. If index lookup consumes more than the agreed threshold, implement and benchmark Y.
3. If authorization dominates, optimize or cache the authorization path instead.
4. If neither dominates, revisit the model with the new trace evidence.

D is valid work because it resolves a named uncertainty and has an explicit decision attached. “Investigate performance” without a time box, evidence target, or branch condition would not be a usable plan item.
