#!/usr/bin/env bash
# Measures how often a skill triggers on a set of labelled queries.
#
# Usage: check-triggers.sh <skill-dir> <queries.json> [runs=3] [set=all]
#   queries.json: [{"query": "...", "should_trigger": true, "set": "train"}, ...]
#   set:          "train", "validation" or "all"
#
# Each query runs in a fresh headless Claude Code session inside a throwaway
# project that has only this skill installed (plus whatever the user has
# installed globally, which is what real triggering competes with).
# File-editing and shell tools are disabled so runs have no side effects.
#
# stdout: JSON array of {query, should_trigger, triggers, runs, trigger_rate, pass},
#         printed only when every session succeeded
# stderr: progress
# exit:   0 done, 1 missing tool, 2 a session failed (auth, credits, network)
# To use another agent client, replace triggered() with its own detection.

set -euo pipefail

SKILL_DIR="${1:?usage: check-triggers.sh <skill-dir> <queries.json> [runs] [set]}"
QUERIES="${2:?usage: check-triggers.sh <skill-dir> <queries.json> [runs] [set]}"
RUNS="${3:-3}"
SET="${4:-all}"
# A query passes when its trigger rate lands on the right side of this line;
# 0.5 means "fires more often than not".
THRESHOLD=0.5

command -v claude >/dev/null || { echo "claude CLI not found" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }

SKILL_NAME="$(basename "$(cd "$SKILL_DIR" && pwd)")"

# A user-level or plugin copy with the same name loads alongside the test copy,
# and a hit on it is indistinguishable from a hit on the version under test.
OTHER_COPIES="$(find "$HOME/.claude/skills" "$HOME/.claude/plugins" -maxdepth 8 \
  -path "*/$SKILL_NAME/SKILL.md" 2>/dev/null || true)"
if [ -n "$OTHER_COPIES" ]; then
  echo "warning: '$SKILL_NAME' is also installed outside this test; results may reflect that copy:" >&2
  echo "$OTHER_COPIES" | sed 's/^/  /' >&2
  echo "  uninstall it or test under a temporary name for accurate trigger rates" >&2
fi
QUERIES="$(cd "$(dirname "$QUERIES")" && pwd)/$(basename "$QUERIES")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/.claude/skills"
cp -R "$SKILL_DIR" "$WORK/.claude/skills/$SKILL_NAME"

# Exit 0 if the session invoked the skill. Matches plain and plugin-namespaced
# names (e.g. "my-skill" or "my-plugin:my-skill"). A session that errors
# (auth, credits, network) aborts the whole run rather than counting as a miss.
# stdin is /dev/null so claude can't swallow the query list being read below.
triggered() {
  local out
  out="$(cd "$WORK" && claude -p "$1" --output-format stream-json --verbose \
      --disallowed-tools Edit Write NotebookEdit Bash </dev/null 2>/dev/null || true)"
  if ! jq -e -s 'any(.[]; .type == "result" and (.is_error | not))' >/dev/null <<<"$out"; then
    echo "claude session failed: $(jq -r -s 'map(select(.type == "result"))[0].result // "no output"' <<<"$out")" >&2
    exit 2
  fi
  jq -e --arg s "$SKILL_NAME" -s '
    any(.[]; .type == "assistant" and any(.message.content[]?;
      .type == "tool_use" and .name == "Skill" and
      ((.input.skill // "") | (. == $s or endswith(":" + $s)))))' >/dev/null <<<"$out"
}

jq -c --arg set "$SET" '.[] | select($set == "all" or .set == $set)' "$QUERIES" |
while IFS= read -r row; do
  query="$(jq -r .query <<<"$row")"
  should="$(jq -r .should_trigger <<<"$row")"
  hits=0
  for _ in $(seq "$RUNS"); do
    if triggered "$query"; then hits=$((hits + 1)); fi
  done
  echo "[$hits/$RUNS] should_trigger=$should  $query" >&2
  jq -n --arg q "$query" --argjson should "$should" --argjson hits "$hits" \
        --argjson runs "$RUNS" --argjson t "$THRESHOLD" '
    ($hits / $runs) as $rate |
    {query: $q, should_trigger: $should, triggers: $hits, runs: $runs,
     trigger_rate: $rate, pass: (if $should then $rate > $t else $rate < $t end)}'
done > "$WORK/results.jsonl"
# Reached only if every session succeeded (set -e + pipefail stop us otherwise),
# so a partial run never prints a valid-looking result array.
jq -s '.' "$WORK/results.jsonl"
