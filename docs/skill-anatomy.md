# Skill Anatomy

The single source of truth for how a skill in this repo is structured. `scripts/validate-skills.js` enforces the **Required** rules; the rest are conventions reviewers check.

## Layout

```
skills/
  <skill-name>/
    SKILL.md          # Required
    references/       # Optional: supporting docs, loaded on demand
    scripts/          # Optional: runnable helpers
    assets/           # Optional: templates, sample files
```

Every skill is **self-contained**: it may only link to files inside its own directory. Anyone should be able to copy `skills/<name>/` into another project and have it work. Don't create empty optional directories.

## Frontmatter (Required)

```yaml
---
name: my-skill-name
description: Does X for Y. Use when <trigger>, or when <trigger>.
---
```

- `name` — lowercase kebab-case, at most 64 characters, identical to the directory name.
- `description` — at most 1024 characters. Say **what** the skill does (third person), then **when** to use it with at least one `Use when` clause. Write the words a user would actually say.
- Don't summarise the workflow steps in the description. The agent may follow the summary and never read the body.
- Allowed top-level keys follow the [Agent Skills specification](https://agentskills.io): `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. Anything vendor-specific goes under `metadata`.

## Body (Recommended)

Equivalent headings are fine; the intent of each section is what matters.

| Section | Purpose |
|---|---|
| `# Title` + **Overview** | One or two sentences: what this does and why it matters. |
| **When to Use** | Triggers, plus explicit *when not to use*. |
| **Process** | Numbered, concrete steps. "Run the test suite", not "make sure it works". |
| **Common Rationalizations** | Table of excuses an agent uses to skip a step, each with a rebuttal. |
| **Red Flags** | Observable signs the skill is being skipped or misapplied. |
| **Verification** | Exit checklist. Each item must be provable with evidence. |

`templates/SKILL.template.md` is a starting point.

## Writing principles

1. **Process over knowledge.** Steps an agent executes, not facts it could look up.
2. **Specific over vague.** Name the command, the file, the threshold.
3. **Evidence over assertion.** Verification items require proof.
4. **Token-conscious.** If deleting a sentence wouldn't change the agent's behaviour, delete it.
5. **Model-neutral.** Describe the capability ("run the focused test"), not one tool's private API or one model's quirk.
6. **No duplication.** Reference another skill by name instead of restating it.

## Size and progressive disclosure

- Keep `SKILL.md` under **500 lines** (validator warns above that).
- Move reference material over ~100 lines into `references/` and link it from the step that needs it, one level deep.
- Prefer a script over a long inline code block: running a script costs only its output.

## Scripts

Helpers under `scripts/` should fail fast (`set -euo pipefail` for bash), write status to stderr and machine-readable output to stdout, and be referenced as `skills/<name>/scripts/<file>`.
