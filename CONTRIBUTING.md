# Contributing

This file is the single rulebook for changes to this repo. Other docs link here rather than restating it.

## Before proposing a new skill

1. **Search the catalog.** Check the table in the README and the `skills/` directory. If an existing skill covers part of your idea, extend it instead of adding a near-duplicate.
2. **Check open issues and PRs** for the same topic.
3. **Name the failure.** Describe a concrete thing an agent gets wrong without the skill. "Agents should know about X" isn't enough; skills are processes, not reference docs.
4. **Read [docs/skill-anatomy.md](docs/skill-anatomy.md)** and confirm the idea fits.

Larger ideas can start as a [skill proposal issue](.github/ISSUE_TEMPLATE/skill-proposal.yml).

## Adding a skill

1. Copy `templates/SKILL.template.md` to `skills/<kebab-case-name>/SKILL.md` (the template is deliberately not named `SKILL.md`, so installers don't mistake it for a real skill).
2. Fill in the frontmatter. `name` must match the directory, and `description` must say what the skill does and include a `Use when` clause.
3. Write the body following [docs/skill-anatomy.md](docs/skill-anatomy.md).
4. Keep it self-contained: put supporting files inside the skill's own directory and link only to them.
5. Add a row to the Skills table in the README.
6. Run the checks:

   ```bash
   npm test && npm run validate
   ```

7. Try the skill in a real session. Check that it activates on the prompts you expect and stays quiet on nearby ones.

## Quality bar

- **Specific:** concrete steps, commands and thresholds.
- **Verifiable:** exit criteria an agent can prove with evidence.
- **Minimal:** every section changes agent behaviour, or it's cut.
- **Model-neutral:** no steps that only make sense for one model or one tool's private API.

## Releasing

Bump `version` in **both** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (CI checks they match), following semver:

- **patch:** wording fixes inside existing skills
- **minor:** new skills, or new behaviour in an existing skill
- **major:** renaming or removing a skill (names are identifiers other people depend on)

Then tag the release: `git tag v<version> && git push --tags`.
