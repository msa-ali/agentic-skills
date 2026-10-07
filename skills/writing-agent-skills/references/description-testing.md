# Testing a skill

Two checks: does the description fire on the right requests, and does the skill improve the work once loaded?

## Contents

- Build the query set
- Measure trigger rates
- Revise the description
- Compare with and without the skill

## Build the query set

Write about 20 realistic queries in a JSON file, roughly half that should trigger the skill and half that shouldn't:

```json
[
  {"query": "can u check this migration before i merge? adds a NOT NULL col to orders", "should_trigger": true, "set": "train"},
  {"query": "write a SQL query for last month's top 10 customers by revenue", "should_trigger": false, "set": "validation"}
]
```

**Should-trigger queries.** Vary them along four axes:
- phrasing: formal, casual, with typos
- explicitness: naming the domain, or only describing the need
- detail: one line, or a paragraph with file paths and backstory
- complexity: the skill's task alone, or buried inside a larger request

The most useful are queries where the skill would help but the request doesn't say so.

**Should-not-trigger queries.** Make them **near-misses**: requests that share vocabulary with the skill but need something else. "What's the weather?" tests nothing.

**Realism.** Real requests carry file paths, names, numbers, "my lead asked me to…", and abbreviations.

**Split.** Tag about 60% `train` and 40% `validation`, with positives and negatives in both. Keep the split fixed across iterations.

## Measure trigger rates

Triggering is nondeterministic, so run each query several times and measure the fraction of runs that loaded the skill. Run this skill's script, which uses headless Claude Code. It writes nothing to stdout unless every session succeeds:

```bash
<this-skill-folder>/scripts/check-triggers.sh <skill-folder> <queries.json> 3 train > results.json
```

A should-trigger query passes when it fires in more than half its runs; a should-not query passes when it fires in fewer than half. Each run is a real model call, so 20 queries × 3 runs costs 60 sessions. Use 1 run for a quick smoke check.

## Revise the description

1. Look only at **train** failures. Keep validation results out of your reasoning, so they remain an honest check.
2. **Missed triggers** mean the description is too narrow: name the broader category of request those queries share.
3. **False triggers** mean it is too broad: add a boundary against the adjacent task.
4. Generalise. Adding the exact words of a failed query overfits to it.
5. If several rounds of small edits stall, rewrite the description with a different structure.
6. Rerun both sets. Stop after about 5 rounds, or when train passes.
7. Keep the round with the best **validation** pass rate, which may not be the last one.

When results look wrong in every version, suspect the queries (mislabelled, too easy, or too hard) before the description.

## Compare with and without the skill

Take one realistic task that exercises the gap list. Run it twice in fresh sessions: once with the skill installed, and once without it (or with the snapshot, when improving an existing skill). Read both traces against the gap list.

The skill passes when it fixes at least one gap-list item, breaks nothing the baseline got right, and doesn't cost far more time or tokens for a small gain. When both runs succeed equally, the skill isn't adding value: return to step 1 of SKILL.md.
