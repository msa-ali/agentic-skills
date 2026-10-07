#!/usr/bin/env node
'use strict';

/**
 * Validates every skills/<name>/SKILL.md against docs/skill-anatomy.md.
 * Rules live in scripts/lib/skill-lint.js. Exit 1 on any error.
 */

const fs = require('fs');
const path = require('path');
const { lintSkill } = require('./lib/skill-lint');

const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');

const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

let errorCount = 0;
let warningCount = 0;

for (const dir of skillDirs) {
  const { errors, warnings } = lintSkill(dir, SKILLS_DIR);
  errorCount += errors.length;
  warningCount += warnings.length;
  const icon = errors.length ? '✗' : warnings.length ? '⚠' : '✓';
  console.log(`  ${icon}  ${dir}`);
  for (const e of errors) console.log(`       ERROR: ${e}`);
  for (const w of warnings) console.log(`       WARN:  ${w}`);
}

console.log(`\n${skillDirs.length} skill(s) checked: ${errorCount} error(s), ${warningCount} warning(s)`);
process.exit(errorCount ? 1 : 0);
