# Xia Protocol

Load this file only after the `xia` skill has been selected.

## Best For

- unfamiliar repos
- ambiguous feature requests
- version-sensitive integrations
- tasks that might already be supported by the repo or framework
- high-risk changes where a wrong assumption would waste time

Do not use Xia for tiny obvious edits, mechanical renames, or implementation after the research brief is already accepted.

## Map The Repo

Start with contracts and docs when present:

- `AGENTS.md`
- `README.md`
- repo-local architecture, workflow, or packaging docs

Classify the repo from evidence: app, service, package, plugin, library, CLI, infrastructure repo, automation repo, or mixed monorepo.

Build a stack ledger from artifacts:

- manifests, lockfiles, workspace files, `tsconfig*`
- `pyproject.toml`, requirements, `Cargo.toml`, `go.mod`
- Docker, compose, plugin manifests, MCP configs
- `.codex/`, `.agents/`, workflows, scripts, tests, entrypoints

Capture languages, runtimes, frameworks, packaging shape, major tools, external services, and verification commands. Verify installed binary versions when runtime behavior matters and it is cheap to check.

## Search Local Reuse First

Inspect feature-adjacent code, tests, scripts, docs, workflows, experiments, config, and env validation. Use repo intelligence tools as accelerators, but read the files that prove behavior.

This step must answer:

- what already exists
- what can be reused
- which extension points are available
- what is genuinely missing

Do not claim something is missing until likely code, config, docs, and tests have been checked.

## Check Upstream Patterns

Use DeepWiki when useful for public repository structure and upstream patterns. Treat it as best-effort only. If unavailable or unindexed, continue through direct public-repo research paths.

Prefer relevant upstream sources: the framework repo, library repo, official starters, and close integration examples. The goal is reusable proof, not generic inspiration.

## Check Current Official Docs

Use Exa or the available search/browser path for current official docs. Bias toward official domains, version-matched docs, and stable guidance unless beta/canary behavior is specifically relevant.

This step should answer:

- whether the framework/library already supports the requested capability
- the current recommended API or workflow
- version caveats for this repo
- migration or incompatibility risks

If local behavior and docs disagree, local behavior is current truth; call out the mismatch.

## Tool Roles

| Need | Primary Path | Rule |
|---|---|---|
| Current repo truth | Local files, manifests, configs, tests, scripts | First and required |
| Public patterns | DeepWiki | Best-effort, non-blocking |
| Current official guidance | Exa or browser/search | Prefer official, version-aware docs |
| Synthesis | Research brief | Separate Local, Upstream, Docs, Inference |

## Ask Only When It Matters

Ask a targeted question only when:

- viable paths differ materially in product behavior, operational risk, or migration cost
- repo evidence conflicts with the user request in a way that changes the recommendation
- version or environment uncertainty would change the implementation path

Otherwise make the best evidence-backed recommendation.

## Guardrails And Red Flags

- Do not guess stack from folder names, branding, or memory.
- Do not jump to web research before local evidence.
- Do not treat DeepWiki gaps as a reason to skip upstream research entirely.
- Do not use stale or version-mismatched docs without saying so.
- Do not collapse Local, Upstream, Docs, and Inference into one narrative.
- Do not start coding before the brief unless research is waived.
- Do not recommend a path without explaining the rejected alternatives.

Quick smell test: the brief must answer what exists, what is reusable, what docs say, and what path to take.
