---
name: writing-agent-skills
description: Writes, reviews and improves Agent Skills, the SKILL.md folders agents load on demand. Use when creating a new skill, turning a repeated workflow or a set of corrections into one, reviewing or tightening an existing SKILL.md, or when a skill fails to trigger, fires on the wrong requests, or has its instructions ignored. Not for AGENTS.md, CLAUDE.md or other always-loaded instruction files.
---

# Writing Agent Skills

A skill earns its place only by changing what an agent does. Find what the agent gets wrong, write the least text that fixes it, and prove the fix with a test.

Paths below are relative to this skill's folder. Run its scripts by full path, since your working directory is the user's project: `node <this-skill-folder>/scripts/validate.js`.

## Pick a path

- **New skill:** follow steps 1–8.
- **Existing skill** (improve, review, fix triggering): follow [Improve an existing skill](#improve-an-existing-skill). It routes you back into the steps it needs.

## New skill

### 1. Find the gap

Gather real material: a session where you corrected the agent, runbooks, code-review comments, fixes in version history, incident write-ups. A list of failures the user describes counts. If none exists, do the task once without a skill and note every place you had to steer.

Generic best-practice articles are not material; they produce skills full of "handle errors appropriately".

**Done when** you have a written **gap list**: concrete things the agent does wrong, or doesn't know, without the skill. An empty gap list means no skill is needed; stop and say so.

### 2. Scope and name

- Scope the skill like a function: one coherent unit of work. Narrow enough to trigger precisely; wide enough that one task doesn't need three skills loaded.
- Search the collection and the agent's skill folders (such as `.claude/skills/`, `~/.claude/skills/` and `.agents/skills/`). When an existing skill would already fire on the requests you're targeting, extend it. Otherwise write the new skill and refer to the related one by name for the shared part.
- Name: lowercase letters, digits and single hyphens, at most 64 characters, identical to the folder name, without `anthropic` or `claude`. Prefer the -ing form (`reviewing-migrations`) unless the collection already uses another pattern.

**Done when** you have the name and a one-sentence scope.

### 3. Write the description

The description is the only part of the skill the agent sees before deciding to load it.

- Open with what the skill does, in third person: "Reviews database migrations for…".
- Follow with `Use when` and one trigger per distinct case, in the words users actually type. Include cases where the user never names the domain.
- When a nearby request needs something else, draw the boundary: "Not for …".
- Describe *what* and *when*, never the steps. An agent given a summary of the procedure follows the summary and skips the body.
- Stay under 1024 characters; a few sentences is typical.

```yaml
# Weak: vague, no trigger, and leaks the procedure
description: Helps with migrations. Checks locks, then backfills, then verifies.
# Strong
description: Reviews database migrations for locking, backfill and rollback risks. Use when a pull request adds or edits a migration, before running one in production, or when a deploy stalled on a schema change.
```

**Done when** every kind of request where a gap shows up is covered by a trigger, and no two triggers name the same case.

### 4. Write the body

For a new skill, start from `assets/SKILL.template.md`; when improving one, edit it in place. Write for a capable colleague who knows everything except your gap list.

- **Steps first.** Number them. End each on a **completion criterion** the agent can check: "every endpoint listed with its auth check", not "review is thorough".
- **A default, not a menu.** Name one tool or approach, and give the exception in one clause: "Use pdfplumber; for scanned pages, use OCR instead."
- **Specificity follows fragility.** Give exact commands where a wrong move breaks something, and a goal plus its reason where judgement fits. Calibrate each step separately.
- **The procedure, not the answer.** Teach the method for the whole class of task. A value that holds for every run (a timeout, a heading order) is a constraint and belongs in the skill; a value that only fits one task is an answer and doesn't.
- **Discover, don't guess.** For facts that vary by project (file layout, versions, conventions), give the command or file that reveals them at run time.
- **A Gotchas section.** Facts that defy reasonable assumptions, kept in SKILL.md, because the agent can't know when to go looking for them.
- **Positive phrasing.** State the behaviour you want; naming a forbidden behaviour primes it. Keep prohibitions for hard guardrails, each paired with the alternative.
- **One term per concept.** Prefer an established word the model already knows (*smoke test*, *tracer bullet*) over re-explaining the idea.

Read `references/patterns.md` when the output must match an exact structure, when steps have gates the agent tends to skip, or when the skill ships scripts.

**Done when** each gap-list item is handled by a step, a default or a gotcha.

### 5. Disclose

- Keep SKILL.md under 500 lines and about 5k tokens.
- Inline what every branch of the task needs. Move what only some branches need into `references/`.
- Make every pointer say when to read the file, rather than a bare "see references/":
  ```
  Read references/api-errors.md when the API returns a non-2xx status.
  ```
- Link every supporting file directly from SKILL.md, one level deep. Agents tend to skim a file reached through another reference file (often only its first 100 lines or so) instead of reading it.
- Open any reference file over 100 lines with a `## Contents` list.
- Put deterministic or repeated work in `scripts/`, and say whether to run the script (the usual case) or read it. Run each script on a sample input before shipping it, and name its runtime in SKILL.md.
- Keep the folder self-contained: links stay inside it and use forward slashes.

**Done when** every file outside SKILL.md has exactly one pointer, and that pointer states when to load it.

### 6. Prune

Read sentence by sentence and ask: would the agent behave differently without this? If not, delete the whole sentence. The usual no-ops:

- explanations of concepts the model already knows
- exhortations such as "be careful" or "be thorough"
- facts the agent can look up itself (config files, `--help` output, the directory layout)
- the same meaning stated twice; keep one home for it
- claims that will go stale; move them to an "Old patterns" section, or delete them

**Done when** every remaining sentence passes the test.

### 7. Validate

```bash
node <this-skill-folder>/scripts/validate.js <path-to-skill-folder>
```

Fix every error and rerun. Treat each warning as a prompt to disclose more.

**Done when** the validator reports 0 errors.

### 8. Test

Read `references/description-testing.md` and follow it.

**Done when** should-trigger queries fire and near-miss queries stay quiet on the held-out validation set, and a run with the skill beats a run without it on at least one gap-list item. When live runs aren't possible, list the exact runs still owed; the skill isn't tested until they've run.

## Improve an existing skill

1. **Snapshot.** Copy the skill into a fresh folder outside any repository, keeping its folder name so it still validates:
   ```bash
   SNAP="/tmp/skill-snapshots/$(date +%Y%m%d-%H%M%S)" && mkdir -p "$SNAP" && cp -R <skill-folder> "$SNAP/"
   ```
   Done when the copy exists.
2. **Collect evidence.** Gather session transcripts, corrections users made, and prompts where the skill fired or stayed quiet. A failure report the user supplies counts. With no evidence, run the skill on 2–3 realistic tasks and read the full traces, not only the final answers. Done when you have a written **failure list**.
3. **Diagnose** each failure:

   | Symptom | Likely cause | Fix in |
   |---|---|---|
   | Didn't fire, or fired on the wrong request | Description | Step 3, then step 8 |
   | Fired, but an instruction was ignored or misapplied | Instruction ambiguous, buried, or phrased as a prohibition | Step 4 |
   | A rule was never applied, and it lives in a file linked from another reference file | Nested reference | Step 5 |
   | Tried several approaches, or followed steps that didn't apply | Menu instead of a default; material for one branch shown to all branches | Steps 4–5 |
   | User had to correct a fact | Missing gotcha | Gotchas section |
   | Rebuilt the same helper on every run | Missing script | Step 5 |
   | Slow, or wandered through irrelevant material | Bloat | Step 6 |

4. **Make the smallest general fix.** Fix the category of failure, not the exact phrasing that failed. Try deleting before adding: if adding rules stops improving results, the skill is over-constrained.
5. **Compare** the snapshot and the new version on the same prompts. Done when every listed failure is fixed and nothing that passed before now fails. Then run step 7, and step 8 using the skill's existing trigger queries plus one query for each triggering failure. When live runs aren't possible, list the exact runs still owed instead of reporting the skill as tested.

When the old skill promises something it never explains (a step named but not described), ask the user what was meant. If edits were approved up front, make the most plausible reading and state the assumption in your report.

For a review with no evidence to work from, apply steps 3–6 as a checklist to the existing skill, report the findings, and make the edits once the user agrees.

## Gotchas

- Agents skip skills for simple one-step tasks they can do alone, so test triggering with requests that need real work.
- MCP tools need their fully qualified name, `ServerName:tool_name`; a bare tool name can fail when several servers are connected.
- Detail tuned for one model can over-explain for a stronger one or under-specify for a smaller one. Test on the models the skill will actually run on.
- Hosts accept only the spec's top-level frontmatter keys (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`); vendor-specific settings go under `metadata`.
- Skill installers pick up any file named `SKILL.md` in a repository. Name templates and examples something else.

## Verification

- [ ] Gap list (new skill) or failure list (existing skill) written down
- [ ] Description says what and when, contains no steps, under 1024 characters
- [ ] `validate.js` reports 0 errors
- [ ] Trigger results recorded (should-trigger queries fire, near-misses don't), or the owed runs listed
- [ ] A fresh session with the skill beats one without it (or beats the snapshot) on the gap or failure list
