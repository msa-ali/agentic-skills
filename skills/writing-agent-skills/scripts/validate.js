#!/usr/bin/env node
'use strict';

/**
 * Lints Agent Skills against the Agent Skills specification and the
 * writing-agent-skills conventions. Zero dependencies.
 *
 * Usage:
 *   node validate.js <skill-dir>    lint one skill (a folder containing SKILL.md)
 *   node validate.js <skills-dir>   lint every skill folder inside it
 *   node validate.js <SKILL.md>     lint the skill that file belongs to
 *
 * Prints one block per skill; exits 1 if any skill has errors.
 * Warnings never fail the run.
 */

const fs = require('fs');
const path = require('path');

const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_WORDS = ['anthropic', 'claude'];
const XML_TAG_RE = /<\/?[A-Za-z][^>]*>/;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const MAX_LINES = 500;
// Rough token estimate (characters / 4); the spec suggests keeping the body under ~5k tokens.
const MAX_BODY_TOKENS = 5000;
// Reference files longer than this should open with a table of contents,
// because agents often preview long files instead of reading them whole.
const TOC_THRESHOLD_LINES = 100;
// Sequencing words that suggest the description narrates the procedure.
// Two or more is a strong hint; one ("then") is often harmless.
const STEP_WORDS_RE = /\b(first|then|next|after that|finally)\b/gi;

/**
 * Minimal frontmatter parser: top-level `key: value` pairs. Indented lines
 * (nested maps such as `metadata:`) and block scalars belong to the previous key.
 * Returns null when the file has no frontmatter block.
 */
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const fields = {};
  let current = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (top) {
      current = top[1];
      fields[current] = unquote(top[2]);
    } else if (current && /^\s/.test(line)) {
      // Continuation of a block scalar or nested map.
      const prev = fields[current];
      fields[current] = (prev && !['|', '>', '|-', '>-'].includes(prev) ? prev + ' ' : '') + line.trim();
    }
  }
  return { fields, body: text.slice(match[0].length) };
}

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

/** Relative markdown link targets, ignoring URLs, anchors and code. */
function relativeLinks(markdown) {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  const links = [];
  for (const m of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    links.push(target);
  }
  return links;
}

// Folders that hold a skill's supporting files. A backticked path into one of
// them (`references/x.md`) is a pointer the agent will try to open.
const SUPPORT_DIRS = ['references', 'scripts', 'assets'];
const BACKTICK_PATH_RE = new RegExp(`\`((?:${SUPPORT_DIRS.join('|')})/[\\w./-]+\\.\\w+)\``, 'g');

/** Backticked pointers such as `references/x.md`, ignoring fenced code blocks. */
function backtickPaths(markdown) {
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, '');
  return [...withoutFences.matchAll(BACKTICK_PATH_RE)].map(m => m[1]);
}

function hasTableOfContents(markdown) {
  return /^#{1,6}\s+(table of )?contents\b/im.test(markdown);
}

/**
 * Lint the text of a SKILL.md. `fileExists(relPath)` resolves links relative
 * to the skill directory. Returns { errors, warnings }.
 */
function lintSkillText(dirName, text, fileExists = () => true) {
  const errors = [];
  const warnings = [];

  const parsed = parseFrontmatter(text);
  if (!parsed) {
    errors.push('missing YAML frontmatter (a --- block at the top of the file)');
    return { errors, warnings };
  }
  const { fields, body } = parsed;

  for (const key of Object.keys(fields)) {
    if (!ALLOWED_KEYS.has(key)) errors.push(`unsupported top-level key "${key}" (move it under metadata)`);
  }

  const { name, description } = fields;
  if (!name) {
    errors.push('frontmatter is missing "name"');
  } else {
    if (!NAME_RE.test(name)) errors.push(`name "${name}" must be lowercase letters, digits and single hyphens`);
    if (name.length > MAX_NAME) errors.push(`name is ${name.length} chars (max ${MAX_NAME})`);
    if (name !== dirName) errors.push(`name "${name}" must match its folder "${dirName}"`);
    for (const word of RESERVED_WORDS) {
      if (name.includes(word)) errors.push(`name must not contain the reserved word "${word}"`);
    }
    if (XML_TAG_RE.test(name)) errors.push('name must not contain XML tags');
  }

  if (!description) {
    errors.push('frontmatter is missing "description"');
  } else {
    if (description.length > MAX_DESCRIPTION) errors.push(`description is ${description.length} chars (max ${MAX_DESCRIPTION})`);
    if (!/\bwhen(ever)?\b/i.test(description)) errors.push('description must say when to use the skill (e.g. "Use when ...")');
    if (XML_TAG_RE.test(description)) errors.push('description must not contain XML tags');
    if ((description.match(STEP_WORDS_RE) || []).length >= 2) {
      warnings.push('description reads like a sequence of steps; say what the skill does and when, and leave the steps to the body');
    }
  }

  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > MAX_LINES) {
    warnings.push(`SKILL.md is ${lineCount} lines (keep under ${MAX_LINES}; move detail into references/)`);
  }
  const bodyTokens = Math.round(body.length / 4);
  if (bodyTokens > MAX_BODY_TOKENS) {
    warnings.push(`body is ~${bodyTokens} tokens (keep under ~${MAX_BODY_TOKENS}; move detail into references/)`);
  }

  errors.push(...linkErrors(body, fileExists));
  // A warning, not an error: `scripts/deploy.sh` may be a path in the user's
  // project rather than in the skill.
  for (const p of backtickPaths(body)) {
    if (!fileExists(path.posix.normalize(p))) {
      warnings.push(`\`${p}\` is not in this skill; fine if it's a path in the user's project, otherwise fix the pointer`);
    }
  }
  return { errors, warnings };
}

function linkErrors(markdown, fileExists, fromDir = '') {
  const errors = [];
  for (const link of relativeLinks(markdown)) {
    if (link.includes('\\')) {
      errors.push(`link "${link}" uses backslashes (use forward slashes)`);
      continue;
    }
    const resolved = path.posix.normalize(path.posix.join(fromDir, link));
    if (resolved.startsWith('..') || path.posix.isAbsolute(link)) {
      errors.push(`link "${link}" leaves the skill folder (skills must be self-contained)`);
    } else if (!fileExists(resolved)) {
      errors.push(`link "${link}" points to a missing file`);
    }
  }
  return errors;
}

/**
 * Markdown documents the agent may read (everything except SKILL.md), as posix
 * paths relative to the skill. Skips assets/ (templates and sample files, not
 * docs), dependency folders and hidden folders.
 */
function supportingMarkdown(skillDir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(skillDir, rel), { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const skip = child === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.');
      if (!skip) out.push(...supportingMarkdown(skillDir, child));
      continue;
    }
    if (entry.name.endsWith('.md') && child !== 'SKILL.md') out.push(child);
  }
  return out;
}

/** Lint the skill folder at `skillDir` on disk. */
function lintSkill(skillDir) {
  const dirName = path.basename(path.resolve(skillDir));
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return { errors: ['missing SKILL.md'], warnings: [] };

  const exists = rel => fs.existsSync(path.join(skillDir, rel));
  const result = lintSkillText(dirName, fs.readFileSync(skillFile, 'utf8'), exists);

  for (const rel of supportingMarkdown(skillDir)) {
    const text = fs.readFileSync(path.join(skillDir, rel), 'utf8');
    for (const e of linkErrors(text, exists, path.posix.dirname(rel))) result.errors.push(`${rel}: ${e}`);
    for (const link of relativeLinks(text)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), link));
      if (link.endsWith('.md') && target !== 'SKILL.md') {
        result.warnings.push(`${rel} links to ${link}: nested references get skimmed; link it from SKILL.md instead`);
      }
    }
    const lines = text.split(/\r?\n/).length;
    if (lines > TOC_THRESHOLD_LINES && !hasTableOfContents(text)) {
      result.warnings.push(`${rel} is ${lines} lines with no "## Contents" section near the top`);
    }
  }
  return result;
}

function main(target) {
  if (target && path.basename(target) === 'SKILL.md' && fs.existsSync(target)) target = path.dirname(target);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    console.error('Usage: node validate.js <skill-dir | skills-dir | path/to/SKILL.md>');
    process.exit(2);
  }

  const skillDirs = fs.existsSync(path.join(target, 'SKILL.md'))
    ? [target]
    : fs.readdirSync(target, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
      .map(d => path.join(target, d.name))
      .sort();

  let errorCount = 0;
  let warningCount = 0;
  for (const dir of skillDirs) {
    const { errors, warnings } = lintSkill(dir);
    errorCount += errors.length;
    warningCount += warnings.length;
    const icon = errors.length ? '✗' : warnings.length ? '⚠' : '✓';
    console.log(`  ${icon}  ${path.basename(dir)}`);
    for (const e of errors) console.log(`       ERROR: ${e}`);
    for (const w of warnings) console.log(`       WARN:  ${w}`);
  }

  console.log(`\n${skillDirs.length} skill(s) checked: ${errorCount} error(s), ${warningCount} warning(s)`);
  process.exit(errorCount ? 1 : 0);
}

if (require.main === module) main(process.argv[2]);

module.exports = { parseFrontmatter, relativeLinks, lintSkillText, lintSkill };
