#!/usr/bin/env node
// Walks the repository and writes tree.json, the data behind index-of.html.
// Run locally with `node scripts/build-tree.mjs`; CI runs it on every push to main.
//
// The listing comes from `git ls-files`, not from the filesystem, so it matches
// exactly what is published on GitHub - ignored files (local AI assistant notes,
// editor folders) never end up in the index pointing at URLs that 404.
//
// Sizes are deliberately not recorded: tree.json lists itself, so storing its own
// size would change the file every run and the index would never settle.

import { readdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();

// only used by the filesystem fallback below
const SKIP_DIRS = new Set(['.git', 'node_modules', '.impeccable', '.claude', '.vscode', '.idea']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', 'CLAUDE.md', 'AGENTS.md', 'GEMINI.md']);

function compare(a, b) {
  // folders first, then files, each alphabetical and case-insensitive
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

// ---- preferred source: the files git actually tracks ----
function fromGit() {
  const listed = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  if (!listed.length) throw new Error('git ls-files returned nothing');

  const rootNode = { name: '.', path: '', type: 'dir', children: [] };

  for (const file of listed) {
    const parts = file.split('/');
    let node = rootNode;

    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const relPath = parts.slice(0, i + 1).join('/');
      let next = node.children.find((c) => c.name === part && c.type === (isFile ? 'file' : 'dir'));
      if (!next) {
        next = isFile
          ? { name: part, path: relPath, type: 'file' }
          : { name: part, path: relPath, type: 'dir', children: [] };
        node.children.push(next);
      }
      node = next;
    });
  }

  // tree.json is generated after this runs, so on a first build git has not seen
  // it yet - list it anyway, since it is committed alongside this output
  if (!rootNode.children.some((c) => c.name === 'tree.json')) {
    rootNode.children.push({ name: 'tree.json', path: 'tree.json', type: 'file' });
  }

  const sortTree = (node) => {
    node.children.sort(compare);
    node.children.filter((c) => c.type === 'dir').forEach(sortTree);
  };
  sortTree(rootNode);

  return rootNode;
}

// ---- fallback: walk the filesystem, for a checkout without git available ----
async function fromDisk(dir = root, rel = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.') && SKIP_DIRS.has(entry.name)) continue;
      out.push({
        name: entry.name,
        path: relPath,
        type: 'dir',
        children: await fromDisk(path.join(dir, entry.name), relPath),
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

let tree;
try {
  tree = fromGit();
} catch (err) {
  console.warn(`git ls-files unavailable (${err.message}), walking the filesystem instead`);
  tree = { name: '.', path: '', type: 'dir', children: await fromDisk() };
}

const { files, dirs } = count(tree.children);

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
