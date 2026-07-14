# Khuym Plugin Architecture

Khuym is a collection of independent meta-skills, not a software-delivery workflow.

## Canonical Sources

- Plugin manifest: [`plugins/khuym/.codex-plugin/plugin.json`](../../plugins/khuym/.codex-plugin/plugin.json)
- Optional MCP services: [`plugins/khuym/.mcp.json`](../../plugins/khuym/.mcp.json)
- Canonical skill tree: [`plugins/khuym/skills/`](../../plugins/khuym/skills/)
- Marketplace entry: [`.agents/plugins/marketplace.json`](../../.agents/plugins/marketplace.json)

Raw mirrors created by `scripts/sync-skills.sh` point back to the canonical skill tree.

## Design Invariants

1. Each skill must be directly invokable.
2. No skill may require another Khuym skill to run first or next.
3. No shared Khuym state directory, lifecycle phase, handoff file, issue tracker, or approval gate is required.
4. Skills may compose when the user's task benefits, but composition is optional.
5. Local repository evidence outranks generic workflow assumptions.

## Skill Boundaries

| Skill | Input boundary | Output boundary |
|---|---|---|
| `prompt-leverage` | A raw prompt | A stronger prompt or reusable prompt template |
| `goal-griller` | A vague autonomous-work objective | A verifiable goal prompt; it does not silently start the goal |
| `xia` | An unfamiliar or risky feature question | A research brief; it does not implement unless research is waived |
| `sequence-execution-plan` | A goal, backlog, incident, or rough proposal | A dependency-aware execution plan; it does not create tracker state |
| `smart-commits` | An existing Git working tree | Logical commits and an optional push; it does not implement features |

These output boundaries prevent one skill from growing into a replacement workflow. For example, Xia stops at evidence and recommendation. The user can then plan normally, invoke `sequence-execution-plan`, or choose another path.

## Optional Composition

```text
                       ┌───────────────┐
rough request ────────▶│ goal-griller  │
                       └───────┬───────┘
                               │ verifiable outcome
                               ▼
                       ┌───────────────┐
                       │      xia      │
                       └───────┬───────┘
                               │ evidence and recommendation
                               ▼
                       ┌─────────────────────────┐
                       │ sequence-execution-plan │
                       └───────────┬─────────────┘
                                   │ ordered work
                                   ▼
                         ordinary implementation
                                   │
                                   ▼
                       ┌─────────────────┐
                       │ smart-commits   │
                       └─────────────────┘
```

Every arrow is optional. A user asking only for a commit cleanup should enter directly at `smart-commits`.

## External Services

Only `xia` benefits from plugin-provided MCP services:

- Exa for current web and official-documentation research
- DeepWiki for best-effort public repository pattern research

Neither service is a plugin-wide gate. If one is unavailable, Xia records the evidence gap and uses another available browser, search, or direct repository path.

## Repository Development Hooks

The repository keeps one local `PreToolUse` hook for goal quality. It can redirect an under-specified goal request toward `goal-griller`. Session bootstrap, shell reservation, state recovery, and stop hooks from the retired workflow are not part of the architecture.
