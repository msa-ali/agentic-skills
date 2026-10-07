# agentic-skills

Reusable, self-contained skills for AI coding agents. Each skill is a folder with a `SKILL.md` that follows the open [Agent Skills specification](https://agentskills.io), so it works in Claude Code and any other agent that reads the format.

## Install

### Any agent, with the `skills` CLI

```bash
npx skills@latest add msa-ali/agentic-skills
```

This lists the skills, asks which ones you want and which agents to install them for, then links them into each agent's skills directory. Useful flags:

- `--list`: show what's available without installing anything
- `--skill <name>`: install only that skill
- `-a claude-code`: install for a specific agent
- `-g`: install for your user instead of the current project
- `--copy`: copy the files instead of symlinking them

Run `npx skills update` later to pull new versions.

### Claude Code (plugin)

```bash
claude plugin marketplace add msa-ali/agentic-skills
```

```bash
claude plugin install agentic-skills@msa-ali-skills
```

### Any agent (copy one skill)

Every skill is self-contained, so you can copy just the folder you want:

```bash
cp -r skills/<skill-name> ~/.claude/skills/
```

For other agents, copy it into whatever directory that agent loads skills from.

## Skills

| Skill | What it does |
|---|---|
| _None yet._ | |

## Repository layout

```
skills/<name>/SKILL.md        the skills (the only thing users install)
templates/SKILL.template.md   starting point for a new skill
docs/skill-anatomy.md         the format every skill follows
scripts/                      validators run in CI
.claude-plugin/               Claude Code plugin + marketplace manifests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
