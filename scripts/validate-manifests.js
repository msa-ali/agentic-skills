#!/usr/bin/env node
'use strict';

/**
 * Checks that the plugin and marketplace manifests agree on name and version,
 * so a release bump can't update one file and forget the other.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const plugin = read('.claude-plugin/plugin.json');
const marketplace = read('.claude-plugin/marketplace.json');
const entry = marketplace.plugins.find(p => p.name === plugin.name);

const errors = [];
if (!entry) errors.push(`marketplace.json has no plugin named "${plugin.name}"`);
else if (entry.version !== plugin.version) {
  errors.push(`version mismatch: plugin.json ${plugin.version} vs marketplace.json ${entry.version}`);
}
if (!/^\d+\.\d+\.\d+$/.test(plugin.version)) errors.push(`plugin.json version "${plugin.version}" is not semver`);

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log(`manifests OK: ${plugin.name}@${plugin.version}`);
