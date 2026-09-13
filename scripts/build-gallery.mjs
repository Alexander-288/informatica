#!/usr/bin/env node
// Scans every top-level folder for a project.json and rebuilds projects.json.
// Run locally with `node scripts/build-gallery.mjs`; CI runs it on every push to main.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const IGNORE = new Set(['.git', '.github', 'node_modules', 'assets', 'scripts']);

const entries = await readdir(root, { withFileTypes: true });
const projects = [];

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;

  const metaPath = path.join(root, entry.name, 'project.json');
  if (!existsSync(metaPath)) {
    console.warn(`skip ${entry.name}/ - no project.json`);
    continue;
  }

  let meta;
  try {
    meta = JSON.parse(await readFile(metaPath, 'utf8'));
  } catch (err) {
    console.error(`error in ${entry.name}/project.json: ${err.message}`);
    process.exitCode = 1;
    continue;
  }

  const hasDemo = existsSync(path.join(root, entry.name, 'index.html'));
  const updated = meta.updated ?? (await stat(metaPath)).mtime.toISOString().slice(0, 10);

  projects.push({
    slug: entry.name,
    title: meta.title ?? entry.name,
    description: meta.description ?? '',
    tags: meta.tags ?? [],
    status: meta.status ?? 'wip',
    accent: meta.accent ?? null,
    demo: meta.demo ?? (hasDemo ? `${entry.name}/` : null),
    source: meta.source ?? `${entry.name}/`,
    updated,
  });
}

// Manual entries: anything in the existing projects.json marked "manual": true is kept as-is,
// unless a folder of the same slug now provides its own project.json.
let previous = { projects: [] };
const outPath = path.join(root, 'projects.json');
if (existsSync(outPath)) {
  try {
    previous = JSON.parse(await readFile(outPath, 'utf8'));
  } catch (err) {
    console.warn(`existing projects.json unreadable, rebuilding from scratch: ${err.message}`);
  }
}

const scanned = new Set(projects.map((p) => p.slug));
for (const entry of previous.projects ?? []) {
  if (entry.manual === true && !scanned.has(entry.slug)) projects.push(entry);
}

projects.sort(
  (a, b) => (b.updated ?? '').localeCompare(a.updated ?? '') || a.slug.localeCompare(b.slug)
);

if (JSON.stringify(previous.projects ?? []) === JSON.stringify(projects)) {
  console.log(`projects.json already up to date - ${projects.length} project(s)`);
  process.exit(process.exitCode ?? 0);
}

const out = { generated: new Date().toISOString(), count: projects.length, projects };
await writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote projects.json - ${projects.length} project(s)`);
