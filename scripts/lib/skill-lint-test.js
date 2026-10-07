'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter, lintSkillText } = require('./skill-lint');

const valid = `---
name: demo-skill
description: Does a demo thing. Use when testing the linter.
---

# Demo Skill

## When to Use
- tests

## Verification
- [ ] done
`;

test('valid skill has no errors or warnings', () => {
  assert.deepEqual(lintSkillText('demo-skill', valid), { errors: [], warnings: [] });
});

test('missing frontmatter is an error', () => {
  const { errors } = lintSkillText('demo-skill', '# No frontmatter');
  assert.match(errors[0], /missing YAML frontmatter/);
});

test('name must match the directory', () => {
  const { errors } = lintSkillText('other-name', valid);
  assert.ok(errors.some(e => /must match directory/.test(e)));
});

test('name must be kebab-case', () => {
  const { errors } = lintSkillText('Demo_Skill', valid.replace('name: demo-skill', 'name: Demo_Skill'));
  assert.ok(errors.some(e => /kebab-case/.test(e)));
});

test('description needs a "Use when" clause', () => {
  const { errors } = lintSkillText('demo-skill', valid.replace(' Use when testing the linter.', ''));
  assert.ok(errors.some(e => /Use when/.test(e)));
});

test('description over 1024 chars is an error', () => {
  const long = 'Use when ' + 'x'.repeat(1100);
  const { errors } = lintSkillText('demo-skill', valid.replace(/description: .*/, `description: ${long}`));
  assert.ok(errors.some(e => /max 1024/.test(e)));
});

test('unknown top-level keys are rejected, metadata is allowed', () => {
  const withKeys = valid.replace('---\n\n#', 'model: opus\nmetadata:\n  author: me\n---\n\n#');
  const { errors } = lintSkillText('demo-skill', withKeys);
  assert.deepEqual(errors, ['unsupported top-level key "model" (move it under metadata)']);
});

test('block-scalar descriptions are parsed', () => {
  const { fields } = parseFrontmatter('---\nname: a\ndescription: >\n  Does a thing.\n  Use when needed.\n---\n');
  assert.equal(fields.description, 'Does a thing. Use when needed.');
});

test('missing recommended sections are warnings, not errors', () => {
  const { errors, warnings } = lintSkillText('demo-skill', valid.replace('## Verification\n- [ ] done\n', ''));
  assert.deepEqual(errors, []);
  assert.ok(warnings.some(w => /Verification/.test(w)));
});

test('links outside the skill directory are errors', () => {
  const { errors } = lintSkillText('demo-skill', valid + '\nSee [x](../other/SKILL.md).\n');
  assert.ok(errors.some(e => /self-contained/.test(e)));
});

test('missing linked files are errors; URLs and code blocks are ignored', () => {
  const body = valid + '\n[a](references/a.md) [b](https://example.com)\n```\n[c](nope.md)\n```\n';
  const { errors } = lintSkillText('demo-skill', body, rel => rel !== 'references/a.md');
  assert.deepEqual(errors, ['link "references/a.md" points to a missing file']);
});
