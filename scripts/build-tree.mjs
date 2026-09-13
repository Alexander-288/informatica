#!/usr/bin/env node
// Walks the repository and writes tree.json, the data behind index-of.html.
// Run locally with `node scripts/build-tree.mjs`; CI runs it on every push to main.
//
// Sizes are deliberately not recorded: tree.json lists itself, so storing its own
// size would change the file every run and the index would never settle.

import { readdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// directories we never descend into
const SKIP_DIRS = new Set(['.git', 'node_modules', '.impeccable', '.vscode', '.idea']);
// individual files that are noise in a project index
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

function compare(a, b) {
  // folders first, then files, each alphabetical and case-insensitive
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

async function walk(dir, rel = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push({
        name: entry.name,
        path: relPath,
        type: 'dir',
        children: await walk(path.join(dir, entry.name), relPath),
      });
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      out.push({ name: entry.name, path: relPath, type: 'file' });
    }
  }

  return out.sort(compare);
}

function count(nodes, acc = { files: 0, dirs: 0 }) {
  for (const node of nodes) {
    if (node.type === 'dir') {
      acc.dirs += 1;
      count(node.children, acc);
    } else {
      acc.files += 1;
    }
  }
  return acc;
}

const children = await walk(root);
const { files, dirs } = count(children);
const tree = { name: '.', path: '', type: 'dir', children };

// Compare against the previous run ignoring `generated`, so an unchanged file
// listing does not produce a commit on every push.
const outPath = path.join(root, 'tree.json');
if (existsSync(outPath)) {
  try {
    const previous = JSON.parse(await readFile(outPath, 'utf8'));
    if (JSON.stringify(previous.tree) === JSON.stringify(tree)) {
      console.log(`tree.json already up to date - ${files} file(s), ${dirs} folder(s)`);
      process.exit(0);
    }
  } catch (err) {
    console.warn(`existing tree.json unreadable, rebuilding: ${err.message}`);
  }
}

const out = { generated: new Date().toISOString(), files, dirs, tree };
await writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote tree.json - ${files} file(s), ${dirs} folder(s)`);
