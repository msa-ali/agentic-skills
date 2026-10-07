'use strict';

/**
 * Lint rules for a single skill, as described in docs/skill-anatomy.md.
 * Pure functions over strings plus one fs-backed entry point (lintSkill),
 * so the rules can be unit-tested without touching disk.
 */

const fs = require('fs');
const path = require('path');

const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const MAX_LINES = 500;
const RECOMMENDED_SECTIONS = ['When to Use', 'Verification'];

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

/** Relative markdown link targets in the body, ignoring URLs, anchors and code blocks. */
function relativeLinks(body) {
  const withoutCode = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  const links = [];
  for (const m of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    links.push(target);
  }
  return links;
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
    errors.push('missing YAML frontmatter (--- block at top of file)');
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
    if (!NAME_RE.test(name)) errors.push(`name "${name}" must be lowercase kebab-case`);
    if (name.length > MAX_NAME) errors.push(`name is ${name.length} chars (max ${MAX_NAME})`);
    if (name !== dirName) errors.push(`name "${name}" must match directory "${dirName}"`);
  }

  if (!description) {
    errors.push('frontmatter is missing "description"');
  } else {
    if (description.length > MAX_DESCRIPTION) errors.push(`description is ${description.length} chars (max ${MAX_DESCRIPTION})`);
    if (!/use when/i.test(description)) errors.push('description must include a "Use when" trigger clause');
  }

  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > MAX_LINES) warnings.push(`SKILL.md is ${lineCount} lines (aim for under ${MAX_LINES}; move detail to references/)`);

  if (!/^# \S/m.test(body)) warnings.push('missing a top-level "# Title" heading');
  for (const section of RECOMMENDED_SECTIONS) {
    if (!new RegExp(`^##+\\s+${section}\\b`, 'mi').test(body)) warnings.push(`missing recommended section "${section}"`);
  }

  for (const link of relativeLinks(body)) {
    const normalized = path.posix.normalize(link);
    if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
      errors.push(`link "${link}" leaves the skill directory (skills must be self-contained)`);
    } else if (!fileExists(normalized)) {
      errors.push(`link "${link}" points to a missing file`);
    }
  }

  return { errors, warnings };
}

/** Lint skills/<dirName>/SKILL.md on disk. */
function lintSkill(dirName, skillsDir) {
  const skillDir = path.join(skillsDir, dirName);
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return { errors: ['missing SKILL.md'], warnings: [] };
  const text = fs.readFileSync(skillFile, 'utf8');
  return lintSkillText(dirName, text, rel => fs.existsSync(path.join(skillDir, rel)));
}

module.exports = { parseFrontmatter, relativeLinks, lintSkillText, lintSkill };
