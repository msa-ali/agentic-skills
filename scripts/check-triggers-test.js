'use strict';

// Exercises check-triggers.sh against a fake `claude` on PATH, so no model
// calls are made. The fake "invokes" the skill when the query mentions SKILL,
// and fails like an out-of-credits session when the query mentions FAIL.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '../skills/writing-agent-skills/scripts/check-triggers.sh');
const SKILL = path.resolve(__dirname, '../skills/writing-agent-skills');
const hasTools = process.platform !== 'win32' && spawnSync('jq', ['--version']).status === 0;

const FAKE_CLAUDE = `#!/usr/bin/env bash
# Like the real CLI, read piped stdin (this is what swallowed the query list).
[ -t 0 ] || cat > /dev/null
q="$2"
if [[ "$q" == *FAIL* ]]; then
  echo '{"type":"result","is_error":true,"result":"Credit balance is too low"}'; exit 1
fi
if [[ "$q" == *SKILL* ]]; then
  echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"writing-agent-skills"}}]}}'
fi
echo '{"type":"result","is_error":false,"result":"ok"}'
`;

// `home` is a throwaway HOME, so results don't depend on what this machine has installed.
function run(queries, { installGlobally = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triggers-'));
  const home = path.join(dir, 'home');
  fs.mkdirSync(home);
  if (installGlobally) {
    const copy = path.join(home, '.claude', 'skills', 'writing-agent-skills');
    fs.mkdirSync(copy, { recursive: true });
    fs.writeFileSync(path.join(copy, 'SKILL.md'), '---\nname: writing-agent-skills\n---\n');
  }
  fs.writeFileSync(path.join(dir, 'claude'), FAKE_CLAUDE, { mode: 0o755 });
  const file = path.join(dir, 'queries.json');
  fs.writeFileSync(file, JSON.stringify(queries));
  return spawnSync('bash', [SCRIPT, SKILL, file, '2'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, PATH: `${dir}:${process.env.PATH}` },
  });
}

test('scores every query and reads them all (claude must not eat stdin)', { skip: !hasTools }, () => {
  const r = run([
    { query: 'make a SKILL', should_trigger: true, set: 'train' },
    { query: 'unrelated', should_trigger: false, set: 'train' },
    { query: 'missed one', should_trigger: true, set: 'train' },
  ]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.map(o => [o.triggers, o.pass]), [[2, true], [0, true], [0, false]]);
  assert.doesNotMatch(r.stderr, /also installed/);
});

test('warns when another copy of the skill is installed for the user', { skip: !hasTools }, () => {
  const r = run([{ query: 'make a SKILL', should_trigger: true, set: 'train' }], { installGlobally: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /'writing-agent-skills' is also installed outside this test/);
});

test('a failed session exits 2 and prints no partial results', { skip: !hasTools }, () => {
  const r = run([
    { query: 'make a SKILL', should_trigger: true, set: 'train' },
    { query: 'FAIL here', should_trigger: true, set: 'train' },
  ]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /Credit balance is too low/);
});
