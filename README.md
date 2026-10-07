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
| [writing-agent-skills](skills/writing-agent-skills/SKILL.md) | Writes, reviews and improves skills: finds what the agent gets wrong, writes a description that triggers reliably, keeps the body lean, then validates and tests triggering. |

## Repository layout

```
skills/<name>/SKILL.md          the skills (the only thing users install)
evals/<name>/                   trigger test queries for each skill
scripts/                        repo checks run in CI
.claude-plugin/                 Claude Code plugin + marketplace manifests
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
