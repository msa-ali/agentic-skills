'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseFrontmatter, lintSkillText, lintSkill } = require('../skills/writing-agent-skills/scripts/validate');

const valid = `---
name: demo-skill
description: Does a demo thing. Use when testing the linter.
---

# Demo Skill

1. Do the thing.
`;

const withDescription = d => valid.replace(/description: .*/, `description: ${d}`);
const hasError = (result, re) => result.errors.some(e => re.test(e));

test('valid skill has no errors or warnings', () => {
  assert.deepEqual(lintSkillText('demo-skill', valid), { errors: [], warnings: [] });
});

test('missing frontmatter is an error', () => {
  assert.ok(hasError(lintSkillText('demo-skill', '# No frontmatter'), /missing YAML frontmatter/));
});

test('name must match the folder', () => {
  assert.ok(hasError(lintSkillText('other-name', valid), /must match its folder/));
});

test('name must be lowercase with single hyphens', () => {
  for (const bad of ['Demo_Skill', 'demo--skill', '-demo']) {
    const r = lintSkillText(bad, valid.replace('name: demo-skill', `name: ${bad}`));
    assert.ok(hasError(r, /lowercase letters/), bad);
  }
});

test('name must not contain reserved words', () => {
  const r = lintSkillText('claude-helper', valid.replace('name: demo-skill', 'name: claude-helper'));
  assert.ok(hasError(r, /reserved word "claude"/));
});

test('description must say when to use the skill', () => {
  assert.ok(hasError(lintSkillText('demo-skill', withDescription('Does a demo thing.')), /when to use/));
  assert.deepEqual(lintSkillText('demo-skill', withDescription('Does X. Use this skill when Y.')).errors, []);
});

test('"whenever" counts as a trigger clause', () => {
  assert.deepEqual(lintSkillText('demo-skill', withDescription('Formats SQL. Use whenever the user pastes a query.')).errors, []);
});

test('backticked paths missing from the skill are warnings (may be project paths); fenced examples are ignored', () => {
  const body = valid + '\nRead `references/gone.md` when needed. Run `scripts/ok.sh`.\n```\nRead `references/example.md`\n```\n';
  const r = lintSkillText('demo-skill', body, rel => rel === 'scripts/ok.sh');
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /^`references\/gone\.md` is not in this skill/);
});

test('CLI accepts a path to SKILL.md and rejects other files with usage, not a stack trace', () => {
  const { spawnSync } = require('child_process');
  const cli = path.resolve(__dirname, '../skills/writing-agent-skills/scripts/validate.js');
  const skillMd = path.resolve(__dirname, '../skills/writing-agent-skills/SKILL.md');
  const ok = spawnSync(process.execPath, [cli, skillMd], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /writing-agent-skills/);
  const bad = spawnSync(process.execPath, [cli, path.resolve(__dirname, '../package.json')], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^Usage:/);
});

test('description over 1024 chars is an error', () => {
  assert.ok(hasError(lintSkillText('demo-skill', withDescription('Use when ' + 'x'.repeat(1100))), /max 1024/));
});

test('XML tags in the description are an error', () => {
  assert.ok(hasError(lintSkillText('demo-skill', withDescription('Does <b>X</b>. Use when Y.')), /XML tags/));
});

test('a description that narrates steps is a warning', () => {
  const r = lintSkillText('demo-skill', withDescription('First reads the log, then groups commits. Use when releasing.'));
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some(w => /sequence of steps/.test(w)));
});

test('unknown top-level keys are rejected, metadata is allowed', () => {
  const withKeys = valid.replace('---\n\n#', 'model: opus\nmetadata:\n  author: me\n---\n\n#');
  assert.deepEqual(lintSkillText('demo-skill', withKeys).errors, ['unsupported top-level key "model" (move it under metadata)']);
});

test('block-scalar descriptions are parsed', () => {
  const { fields } = parseFrontmatter('---\nname: a\ndescription: >\n  Does a thing.\n  Use when needed.\n---\n');
  assert.equal(fields.description, 'Does a thing. Use when needed.');
});

test('long bodies are warnings, not errors', () => {
  const long = valid + 'word '.repeat(5000) + '\n' + 'line\n'.repeat(500);
  const r = lintSkillText('demo-skill', long);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some(w => /lines/.test(w)));
  assert.ok(r.warnings.some(w => /tokens/.test(w)));
});

test('links outside the skill folder are errors', () => {
  assert.ok(hasError(lintSkillText('demo-skill', valid + '\nSee [x](../other/SKILL.md).\n'), /self-contained/));
});

test('backslash links are errors', () => {
  assert.ok(hasError(lintSkillText('demo-skill', valid + '\nSee [x](references\\a.md).\n'), /backslashes/));
});

test('missing linked files are errors; URLs and code blocks are ignored', () => {
  const body = valid + '\n[a](references/a.md) [b](https://example.com)\n```\n[c](nope.md)\n```\n';
  const r = lintSkillText('demo-skill', body, rel => rel !== 'references/a.md');
  assert.deepEqual(r.errors, ['link "references/a.md" points to a missing file']);
});

test('supporting files: links resolve from their own folder; long files need contents', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-')), 'demo-skill');
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), valid + '\nRead [guide](references/guide.md) when needed.\n');
  fs.writeFileSync(path.join(dir, 'references', 'guide.md'), '# Guide\n\n[sibling](other.md) [escape](../../x.md)\n' + 'line\n'.repeat(120));
  fs.writeFileSync(path.join(dir, 'references', 'other.md'), '# Other\n');

  const r = lintSkill(dir);
  assert.deepEqual(r.errors, ['references/guide.md: link "../../x.md" leaves the skill folder (skills must be self-contained)']);
  assert.ok(r.warnings.some(w => /references\/guide\.md is \d+ lines/.test(w)));
  assert.ok(r.warnings.some(w => /links to other\.md: nested references/.test(w)));

  fs.writeFileSync(path.join(dir, 'references', 'guide.md'), '# Guide\n\n## Contents\n- a\n' + 'line\n'.repeat(120));
  assert.deepEqual(lintSkill(dir), { errors: [], warnings: [] });
});

test('a link back to SKILL.md is not a nested reference', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-')), 'demo-skill');
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), valid + '\nRead [guide](references/guide.md) when needed.\n');
  fs.writeFileSync(path.join(dir, 'references', 'guide.md'), '# Guide\n\nBack to [SKILL.md](../SKILL.md).\n');
  assert.deepEqual(lintSkill(dir), { errors: [], warnings: [] });
});

test('assets/, node_modules and hidden folders are not linted as docs', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-')), 'demo-skill');
  for (const sub of ['assets', 'scripts/node_modules/pkg', '.cache']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), valid);
  const placeholder = 'See [details](references/your-file.md)\n';
  fs.writeFileSync(path.join(dir, 'assets', 'report-template.md'), placeholder);
  fs.writeFileSync(path.join(dir, 'scripts', 'node_modules', 'pkg', 'README.md'), placeholder);
  fs.writeFileSync(path.join(dir, '.cache', 'notes.md'), placeholder);
  assert.deepEqual(lintSkill(dir), { errors: [], warnings: [] });
});
