---
name: xia
description: >-
  Investigates an unfamiliar or ambiguous codebase before implementation by
  identifying frameworks, libraries, and architectural patterns in the
  repository, searching for reusable local code, checking upstream patterns,
  and verifying current official documentation. Use when exploring a new
  codebase, spiking a feature request, investigating before coding, or
  performing research-first discovery on high-risk or unfamiliar work.
metadata:
  dependencies:
    - id: exa
      kind: mcp_server
      server_names: [exa]
      config_sources: [global_codex_config, plugin_mcp_manifest]
      missing_effect: degraded
      reason: Xia uses Exa to research current official documentation and recent implementation guidance.
    - id: deepwiki
      kind: mcp_server
      server_names: [deepwiki]
      config_sources: [global_codex_config, plugin_mcp_manifest]
      missing_effect: degraded
      reason: Xia uses DeepWiki as a best-effort upstream pattern and repository-structure research path.
---

# Xia

Xia is the anti-reinvention scout.

Use it to answer five questions before we build anything:

1. What is this repo really?
2. What already exists locally?
3. What does the ecosystem already support?
4. What do the current official docs actually recommend?
5. What is the lightest credible path from here?

The output is a short research brief, not code.

## Best For

- features in unfamiliar repos
- requests that might already be supported locally or by the framework
- integration work where version details matter
- high-risk changes where a wrong assumption would waste time

## Not For

- tiny self-contained edits where the repo seam is already obvious
- purely mechanical changes such as renames or formatting
- tasks where the user explicitly says to skip research and implement now
- follow-up implementation after the research brief is already done

## HARD-GATE

Do not write code or edit files until the research brief is complete.

The only exception is when the user explicitly says to skip research or clearly asks for immediate implementation.

If the evidence supports two materially different paths, finish the brief first and then ask one targeted question instead of guessing.

## Choose Depth

Pick the lightest mode that still makes the recommendation trustworthy.

- `Quick`
  Use for low-risk questions where the local seam is likely easy to find.
  Do: repo contract, local seam search, brief recommendation.
- `Standard`
  Default mode.
  Do: local repo mapping, local reuse search, upstream pattern check, official docs check, brief recommendation.
- `Deep`
  Use for cross-cutting, version-sensitive, or architecture-heavy work.
  Do everything in `Standard`, plus wider repo coverage, more than one upstream comparison if needed, and clearer risk analysis.

If unsure, use `Standard`.

## Workflow

Run this sequence in order:

1. Check whether research was waived.
2. Read the repo contract first when it exists.
3. Map the repo from real artifacts.
4. Search locally for reuse before invention.
5. Check upstream patterns only after the local picture is clear.
6. Check current official docs only after you know what stack and versions you are targeting.
7. Return the research brief.

Do not reorder this flow. That is how agents drift into generic advice and duplicate work.

## Step 1: Map The Repo

Start with the repo contract when it exists:

- `AGENTS.md`
- `README.md`
- repo-local docs that explain architecture, workflows, or packaging

Then classify the repo from evidence:

- app or service
- package, plugin, or library
- CLI or developer tooling
- infrastructure or automation repo
- mixed monorepo with several runtimes
- something custom that does not fit a standard label

Infer the stack from real artifacts such as:

- `package.json`, lockfiles, `tsconfig*`, workspace manifests
- `pyproject.toml`, `requirements*.txt`, `poetry.lock`
- `Cargo.toml`, `go.mod`, `Dockerfile*`, compose files
- plugin manifests, MCP config files, `.codex/`, `.agents/`, workflow files
- framework config files and entrypoints
- scripts, tests, and build commands that reveal how the repo really works

Capture a short stack ledger:

- primary languages and runtimes
- framework or platform clues
- packaging/plugin shape if relevant
- major tools and external services
- obvious verification commands

If versions are detectable from manifests or lockfiles, capture them now so later docs research can stay version-aware.

If the request depends on runtime or CLI behavior and the installed version is cheap to verify, verify the local binary too instead of assuming the manifest tells the whole story.

If exact versions are not detectable, say so in the brief instead of pretending they are known.

## Step 2: Search Local Reuse First

Inspect the local repository for:

- existing functionality related to the requested feature
- conventions, helper utilities, and extension points
- similar workflows, components, routes, commands, or jobs
- prior implementations, experiments, tests, and docs

Use local inspection first. Prefer repository evidence over assumptions.

Useful targets:

- feature-adjacent directories and modules
- tests that reveal supported behavior
- scripts and workflow definitions
- prior docs or ADR-style notes
- config and env validation that constrain the implementation

When available, use repo intelligence tools as accelerators, but do not let them replace reading the files that actually prove behavior.

This step should answer:

- what already exists
- what can be reused
- what extension points are available
- what is missing

Do not claim something is missing until you have checked the most likely code, config, docs, and test surfaces that would prove it exists.

## Step 3: Check Upstream Patterns

Look outward only after the local picture is clear.

Use the upstream repo research path, preferably `deepwiki`, when you need to understand:

- how a repository is organized
- where similar functionality already lives upstream
- whether a capability already appears to exist
- which files or areas are the best pattern anchors

Treat `deepwiki` as best-effort guidance, not as a hard dependency. If a repo is unavailable or not indexed there:

- fall back to direct GitHub-oriented research paths
- continue the investigation instead of blocking

Prefer upstream repositories that are actually relevant to the detected stack:

- the framework repo
- the library repo
- official starter repos
- closely related integration repos

Do not turn upstream research into generic inspiration hunting. The goal is to find reusable patterns, constraints, or proof that the feature already exists elsewhere.

## Step 4: Check Current Official Docs

Use the official-doc research path, preferably `exa`, to find current documentation, release guidance, and implementation notes for the libraries, frameworks, and services involved.

Prefer official sources over blog posts or community summaries whenever possible.

When searching docs:

- bias toward official docs domains
- prefer version-matched docs when the repo reveals an exact version
- if exact version matching is not possible, state that clearly
- distinguish stable docs from beta/canary docs when that matters

This phase should answer:

- whether the framework or library already supports the requested capability
- the recommended current API or workflow
- version-specific caveats that matter for this repo
- any major incompatibilities or migration risks

If local repo behavior and official docs disagree, treat the local repo as the truth for current behavior and call out the mismatch explicitly.

## Tool Roles

Use tools by role, not by habit:

| Need | Primary path | Rule |
|---|---|---|
| Current repo truth | Local files, manifests, configs, tests, scripts | This comes first and is never optional |
| Existing public patterns | `deepwiki` | Best-effort only; do not block if the repo is unavailable or not indexed |
| Current official guidance | `exa` | Prefer official docs domains and version-matched material |
| Final synthesis | Research brief | Separate `Local`, `Upstream`, `Docs`, and `Inference` explicitly |

If `deepwiki` is unavailable, continue with local repo evidence plus direct public-repo reading paths.

If `exa` is unavailable, continue with official docs through the current search/browser capability, but keep the same official-source bias and version-matching discipline.

## Step 5: Return A Short Research Brief

Before any implementation work, return a concise research brief using `references/research-brief-template.md`.

The brief must include:

- bottom line
- current repo stack summary
- feature understanding and assumptions
- existing local functionality already found
- relevant upstream patterns found in GitHub repositories
- latest documentation findings
- a recommendation
- risks, unknowns, and follow-up questions if needed
- confidence in the primary recommendation
- the next concrete step that should happen after research

Every non-trivial claim in the brief must be labeled as:

- `Local` for findings from this repository
- `Upstream` for findings from public GitHub repositories
- `Docs` for findings from official documentation
- `Inference` for conclusions drawn from the evidence

Do not blur these labels together.

## Recommendation Rule

Choose the lightest credible path in this order:

1. Reuse existing local functionality.
2. Use built-in framework or library capabilities that fit the repo's current version.
3. Adapt an upstream pattern that fits the repo.
4. Build from scratch only when the other options are not sufficient.

If you recommend building from scratch, explain why reuse, adaptation, and built-in capabilities were not enough.

Also explain why the chosen path beats the next-best alternative. A recommendation without an explicit tradeoff is too easy to rationalize.

## Ask Only When It Matters

Ask a targeted follow-up question only when one of these is true:

- two viable paths differ materially in product behavior, operational risk, or migration cost
- the repo evidence conflicts with the user's wording in a way that changes the recommendation
- version or environment uncertainty would change the implementation path

Otherwise, make the best evidence-backed recommendation and move forward.

## Guardrails and Red Flags

Stop and correct course if any of these apply:

- Guessing the stack from folder names, branding, or prior memory instead of reading manifests and configs
- Claiming something is missing without checking local code, config, docs, and test surfaces
- Jumping to web research before completing local inspection
- Treating `deepwiki` or `exa` unavailability as a reason to block progress
- Using stale or version-mismatched docs without flagging the mismatch
- Blurring `Local`, `Upstream`, `Docs`, and `Inference` labels into one narrative
- Starting to design or code before the research brief is complete
- Recommending a path without explaining why alternatives were rejected
- Citing blogs or AI summaries when official docs are available

## Quick Smell Test

If the brief does not clearly answer "what exists, what is reusable, what the docs say, and what path to take," it is not done yet.

## Example Brief Excerpt

```markdown
**Bottom line:** The repo already has a webhook handler in `src/webhooks/`.
Extend it rather than building a new ingestion endpoint.

**Stack:** Node 20 + Express 4.18 + TypeScript 5.3 (from package.json)
**Local [Local]:** `src/webhooks/stripe.ts` handles Stripe events — same
  pattern applies to the requested Slack integration.
**Upstream [Upstream]:** Slack's bolt-js SDK v3 includes built-in event
  verification middleware.
**Docs [Docs]:** Official Slack API docs recommend socket mode for dev,
  HTTP mode for production (docs.api.slack.com, v3 stable).
**Recommendation:** Add a `src/webhooks/slack.ts` handler following the
  existing Stripe pattern, using bolt-js HTTP mode.
  *Why not socket mode:* repo is deployed as a stateless container (Dockerfile).
```

## References

- `references/research-brief-template.md` - required brief structure before implementation
- `references/pressure-scenarios.md` - pressure tests for future RED/GREEN validation of this skill
