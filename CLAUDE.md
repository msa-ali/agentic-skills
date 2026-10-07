# agentic-skills

A catalogue of reusable agent skills. This file configures agents working **on this repository**; it is not meant to be copied into other projects.

## Layout

- `skills/<name>/SKILL.md`: the skills. Each one is self-contained and links only to files inside its own directory.
- `templates/SKILL.template.md`: the starting point for a new skill.
- `docs/skill-anatomy.md`: the skill format (single source of truth; link to it, don't restate it).
- `CONTRIBUTING.md`: the workflow for adding skills and releasing (single source of truth).
- `scripts/`: zero-dependency Node validators; rules live in `scripts/lib/skill-lint.js`.

## Commands

- `npm test`: unit tests for the lint rules
- `npm run validate`: lint every skill and check manifest versions match

## Rules

- Before creating a new skill directory, follow the pre-flight checks in CONTRIBUTING.md and prefer extending an existing skill.
- When adding, renaming or removing a skill, update the Skills table in README.md.
- Never duplicate content between skills; reference the other skill by name.
- Run `npm test && npm run validate` before calling a change done.
