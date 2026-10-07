# agentic-skills

A catalogue of reusable agent skills. This file configures agents working **on this repository**; it is not meant to be copied into other projects.

## Layout

- `skills/<name>/SKILL.md`: the skills. Each one is self-contained and links only to files inside its own directory.
- `skills/writing-agent-skills/`: how to write, improve and test a skill. Use this skill for any skill work; its `scripts/validate.js` holds the lint rules CI runs.
- `CONTRIBUTING.md`: repo conventions and releasing (single source of truth).
- `evals/<skill>/trigger-queries.json`: trigger test queries, one file per skill.
- `scripts/`: repo-only checks (manifest versions) and the validator's unit tests.

## Commands

- `npm test`: unit tests for the lint rules
- `npm run validate`: lint every skill and check manifest versions match

## Rules

- Before creating a new skill directory, follow the pre-flight checks in CONTRIBUTING.md and prefer extending an existing skill.
- When adding, renaming or removing a skill, update the Skills table in README.md.
- Never duplicate content between skills; reference the other skill by name.
- Run `npm test && npm run validate` before calling a change done.
