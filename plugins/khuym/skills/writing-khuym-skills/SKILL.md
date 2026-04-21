---
name: writing-khuym-skills
description: >-
  Generates khuym skill markdown files using TDD-for-skills methodology:
  writes pressure-test scenarios first, builds minimal SKILL.md to pass them,
  then iterates to close rationalization loopholes. Use when creating a new
  khuym skill, editing an existing skill, writing a skill template, validating
  skill behavior under pressure, or testing skill instructions against
  adversarial prompts. Do NOT use for project-specific AGENTS.md conventions
  or one-off solutions.
metadata:
  dependencies: []
---

# Writing Khuym Skills

If `.khuym/onboarding.json` is missing or stale for the current repo, stop and invoke `khuym:using-khuym` before continuing.

## Overview

Skills are code. They have bugs. Test them before deploying.

**THE IRON LAW: NO SKILL WITHOUT A FAILING TEST FIRST.**
Write skill before testing? Delete it. Start over. No exceptions — not for "simple additions," not for "just a section," not for "reference only."

## When to Use

Use this skill when you are about to:
- Create any new skill for the khuym ecosystem
- Edit an existing skill (even a small section)
- Deploy a skill and want confidence it works under pressure

When NOT to use: AGENTS.md files, project-specific conventions, one-off prompt instructions.

## The Core Cycle: RED → GREEN → REFACTOR

| TDD Concept | Skill Equivalent |
|---|---|
| Test case | Pressure scenario with subagent |
| Production code | SKILL.md |
| Test fails (RED) | Agent violates rule without skill |
| Test passes (GREEN) | Agent complies with skill present |
| Refactor | Close loopholes, maintain compliance |

---

## PHASE 1 — RED: Write the Failing Test

**HARD-GATE: Do not write any skill content until you complete this phase.**

**Steps:**
1. Define the skill's purpose: what behavior must it enforce? What are failure modes without it?
2. Create 3–5 pressure scenarios that stress-test critical constraints (see `references/pressure-test-template.md`)
3. Run scenarios WITHOUT the skill — give agents the realistic task under pressure
4. Document exact rationalizations verbatim: "Agent was wrong" is useless. "Agent said 'I already manually tested it, so the spirit of TDD is satisfied'" is target material
5. Identify patterns: which excuses repeat across scenarios?

**What to record:**
```
Scenario: [name]
Combined pressures: [list]
Exact violation: [what agent chose]
Exact rationalization (verbatim): "[quote]"
```

---

## PHASE 2 — GREEN: Write the Minimal Skill

Write SKILL.md addressing the **specific rationalizations documented in RED only.**
Do not add content for hypothetical cases you didn't observe — hypothetical content bloats the skill and gets skipped.

**SKILL.md checklist:**
- [ ] YAML frontmatter starts on line 1 (`---`)
- [ ] `name`: bare hyphen-case, matches the directory name exactly
- [ ] `description`: starts with "Use when..." — **triggering conditions ONLY, no workflow summary**
- [ ] Description is third-person, ≤1024 chars
- [ ] Body stays lean; prefer < 400 lines and move overflow into `references/` when practical
- [ ] Uses persuasion principles (see table below)
- [ ] HARD-GATE markers on critical stops
- [ ] `references/` files never nested more than one level deep

For Khuym plugin skills specifically, keep frontmatter `name` bare. The plugin wrapper adds the `khuym:` prefix when the skill is surfaced to agents.

**Description trap (most common mistake):**
Workflow summary in description → Claude follows description instead of reading skill body. Every time.
```yaml
# ❌ BAD — workflow summary
description: Use when creating skills — run baseline test, write minimal skill, run tests

# ✅ GOOD — triggering conditions only
description: Use when creating a new khuym skill or editing an existing one
```

**Apply persuasion principles:**

| Principle | Implementation | Use For |
|---|---|---|
| **Authority** | "YOU MUST", "Never", "No exceptions" | Discipline-enforcing rules |
| **Commitment** | Ordered checklists, announce skill usage | Multi-step processes |
| **Scarcity** | "Before proceeding", "IMMEDIATELY after X" | Verification requirements |
| **Social Proof** | "Teams report...", "X without Y = failure. Every time." | Common failure patterns |
| **Unity** | "our skills", collaborative framing | Techniques, guidance |

After writing: re-run the same pressure scenarios WITH the skill. Agent must now comply.
If agent still fails → skill is unclear or incomplete. Revise and re-test. Do not proceed.

---

## PHASE 3 — REFACTOR: Close Loopholes

When an agent violates a rule despite having the skill, that is a test regression — the skill has a bug. Fix it:

1. Capture the new rationalization verbatim
2. Add explicit negation in the rule
3. Add entry to rationalization table in the skill
4. Add entry to red flags list
5. Re-run all scenarios — verify all still pass

Continue until no new rationalizations emerge from pressure testing.

**Meta-testing technique:** After an agent chooses wrong, ask:
> "You read the skill and chose Option C anyway. How could the skill have been written differently to make Option A the only acceptable answer?"

Three diagnoses:
- "The skill WAS clear, I chose to ignore it" → add "Violating the letter IS violating the spirit"
- "The skill should have said X" → add their exact suggestion verbatim
- "I didn't see section Y" → make key point more prominent, move it earlier

---

## PHASE 4 — VALIDATE & DOCUMENT

**Run validation:**
```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" plugins/khuym/skills/<skill-name>
bash scripts/check-markdown-links.sh plugins/khuym/skills/<skill-name>/SKILL.md
bash scripts/sync-skills.sh --dry-run
```

If the edited skill owns a repo-local test script, run that too.

**Create CREATION-LOG.md** documenting the full TDD process (see `references/creation-log-template.md`):
- Source material and extraction decisions
- Pressure scenarios run and results
- Rationalizations found and fixes applied
- Iterations required before bulletproof

**Signs the skill IS bulletproof:**
- Agent chooses correct option under maximum pressure
- Agent cites specific skill sections as justification
- Agent acknowledges temptation but follows rule
- Meta-test reveals: "skill was clear, I should follow it"

**Signs the skill is NOT bulletproof:**
- Agent finds rationalizations not addressed in the skill
- Agent argues the skill itself is wrong
- Agent creates "hybrid approaches" that satisfy letter but not spirit

---

## Red Flags — Rationalization Checklist

If you catch yourself or the agent saying any of these, stop and run baseline tests:

| Rationalization | Why It Fails |
|---|---|
| "Testing is unnecessary — I know this technique" | You're testing the SKILL, not your knowledge. Agents differ from you. |
| "It's so simple it can't have bugs" | Every untested skill has issues. |
| "Academic questions passed — that's sufficient" | Reading a skill ≠ using a skill under pressure. Test application scenarios. |
| "My description summarizes the workflow" | Workflow-summary descriptions cause agents to skip the skill body. |
| "This edit is minor" | The Iron Law applies to edits. No exceptions. |
| "I'll test it after a few real uses" | Test BEFORE deploying — not in production. |
| "The baseline is obvious" | You know YOUR failures. Agent failures differ. Run the baseline. |

Also stop if: writing skill content before creating pressure scenarios, addressing hypothetical scenarios not observed in baseline, or deploying without running scenarios WITH skill.

---

## References

Load when needed:
- `references/creation-log-template.md` — CREATION-LOG.md template for documenting the TDD process
- `references/pressure-test-template.md` — Pressure scenario templates and the 7 pressure types
- `research/15-tdd-skills-methodology.md` — Full background citations and methodology details
