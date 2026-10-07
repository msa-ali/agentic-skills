# Patterns for skill bodies

Read only the section the skill you're writing needs.

## Contents

- Output templates: when the result has a required shape
- Examples: when style matters more than structure
- Checklists: for long or easily derailed sequences
- Validation loops: when work can be checked before moving on
- Plan, validate, execute: for batch or destructive operations
- Scripts: when work is deterministic or repeated
- Rationalization tables: for discipline skills under pressure

## Output templates

Agents match a concrete structure more reliably than a prose description of one. Show the skeleton, and say how strict it is.

- **Strict** (machine-read output, fixed report formats): "Use exactly this structure."
- **Flexible**: "Start from this structure; add or drop sections to fit the material."

Keep short templates inline. Put long ones, or ones needed by only one branch, in `assets/` and point to them from the step that uses them.

## Examples

When the target is a style or level of detail, give two or three input/output pairs instead of describing it. Pick pairs that differ along the axis the agent tends to get wrong, such as a trivial change and a sweeping one, so it learns the rule rather than copying a single example.

## Checklists

For a sequence with dependencies or gates, give a checklist the agent copies into its working notes and ticks off:

```
- [ ] 1. Extract fields (run scripts/extract.py)
- [ ] 2. Map values (edit fields.json)
- [ ] 3. Validate the mapping (run scripts/check.py)
- [ ] 4. Apply
```

Each item should name its tool or output, so "done" can be seen rather than claimed.

## Validation loops

Do the work, check it, fix it, and repeat until the check passes, then move on. The check can be a script, a reference document the agent compares against, or a test command. Write the exit condition into the step: "Continue only when the validator prints OK."

## Plan, validate, execute

For batch, destructive or high-stakes changes:

1. The agent writes its intended changes to a structured file (for example `changes.json`).
2. A script checks the plan against the source of truth.
3. The agent revises until the check passes.
4. Only then does the agent apply the changes.

Make the validator's errors actionable, and name the valid options: "Field `sig_date` not found. Available: `customer`, `total`, `signature_date`."

## Scripts

- **Execute rather than load.** Running a script costs only its output; pasting code into SKILL.md costs its full length on every load.
- **Say which:** "Run `scripts/x.py` to …" or "Read `scripts/x.py` for the algorithm."
- **Handle errors in the script.** Catch the expected failures and print what to do next, rather than crashing and leaving the agent to guess.
- **Justify every constant** in a comment. An unexplained `TIMEOUT = 47` is one the agent can't adjust sensibly.
- **Declare dependencies** in SKILL.md with the install command. Some hosts have no network access, so prefer the standard library.
- **Keep output easy to read back:** status messages on stderr, results on stdout, JSON when a later step parses it.

## Rationalization tables

For skills that enforce a discipline the agent is tempted to skip under pressure (testing first, reviewing before merging), a two-column table helps: the excuse ("too small to need a test") and why it fails. Use one only when testing shows the agent actually skips the step. Otherwise it is load without effect.
