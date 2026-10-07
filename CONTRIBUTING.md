# Contributing

This file is the single rulebook for changes to this repo. Other docs link here rather than restating it.

## Before proposing a new skill

1. **Search the catalog.** Check the table in the README and the `skills/` directory. If an existing skill covers part of your idea, extend it instead of adding a near-duplicate.
2. **Check open issues and PRs** for the same topic.
3. **Name the failure.** Describe a concrete thing an agent gets wrong without the skill. "Agents should know about X" isn't enough; skills are processes, not reference docs.

Larger ideas can start as a [skill proposal issue](.github/ISSUE_TEMPLATE/skill-proposal.yml).

## Writing or improving a skill

Use the [`writing-agent-skills`](skills/writing-agent-skills/SKILL.md) skill. It is the single source for how skills in this repo are written, validated and tested; this file covers only what is specific to the repo.

## Repo conventions

- **Location:** `skills/<name>/SKILL.md`, with the name in -ing form (`reviewing-migrations`).
- **Self-contained:** a skill links only to files inside its own folder, so it can be copied or installed on its own.
- **No stray `SKILL.md`:** skill installers pick up any file with that name, so templates and examples use other filenames.
- **Trigger queries:** each skill has `evals/<name>/trigger-queries.json` (about 20 queries, tagged `train` or `validation`). It lives outside the skill folder so installs stay lean. Run it with the skill's `scripts/check-triggers.sh`.
- **README:** add, rename or remove the skill's row in the Skills table.
- **Checks:** `npm test && npm run validate` must pass. CI runs both on Linux, macOS and Windows.

## Releasing

Bump `version` in **both** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (CI checks they match), following semver:

- **patch:** wording fixes inside existing skills
- **minor:** new skills, or new behaviour in an existing skill
- **major:** renaming or removing a skill (names are identifiers other people depend on)

Then tag the release: `git tag v<version> && git push --tags`.
