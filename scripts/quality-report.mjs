import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', '.superpowers']);
const htmlFiles = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}

function lineFor(content, index) {
  return content.slice(0, index).split('\n').length;
}

function localTarget(raw, fromFile) {
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return null;
  if (/^[a-z]+:\/\//i.test(raw)) return null;

  const clean = raw.split('#')[0].split('?')[0];
  if (!clean) return null;

  if (clean.startsWith('/')) {
    const relative = clean.slice(1);
    if (!relative) return path.join(root, 'index.html');
    if (relative.endsWith('/')) return path.join(root, relative, 'index.html');
    return path.join(root, relative);
  }

  const resolved = path.resolve(path.dirname(fromFile), clean);
  if (clean.endsWith('/')) return path.join(resolved, 'index.html');
  return resolved;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

await walk(root);
htmlFiles.sort();

const findings = [];
let brokenLinks = 0;
let duplicateIds = 0;
let imagesWithoutDimensions = 0;
let imagesWithoutAlt = 0;

for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const content = await readFile(file, 'utf8');

  const ids = new Map();
  for (const match of content.matchAll(/\bid=["']([^"']+)["']/gi)) {
    const id = match[1];
    const count = (ids.get(id) || 0) + 1;
    ids.set(id, count);
    if (count === 2) {
      duplicateIds += 1;
      findings.push(`ERROR ${rel}:${lineFor(content, match.index)} duplicate id="${id}"`);
    }
  }

  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\balt=["'][^"']*["']/i.test(tag)) {
      imagesWithoutAlt += 1;
      findings.push(`WARN  ${rel}:${lineFor(content, match.index)} image without alt attribute`);
    }
    if (!/\bwidth=["']?\d+/i.test(tag) || !/\bheight=["']?\d+/i.test(tag)) {
      imagesWithoutDimensions += 1;
      findings.push(`WARN  ${rel}:${lineFor(content, match.index)} image without explicit width/height (possible CLS)`);
    }
  }

  for (const match of content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = match[1];
    const target = localTarget(raw, file);
    if (!target) continue;

    let ok = await exists(target);
    if (!ok && !path.extname(target)) ok = await exists(`${target}.html`);
    if (!ok && path.extname(target) === '.html') {
      const cleanRoute = target.slice(0, -5);
      ok = await exists(path.join(cleanRoute, 'index.html'));
    }

    if (!ok) {
      brokenLinks += 1;
      findings.push(`ERROR ${rel}:${lineFor(content, match.index)} unresolved local reference: ${raw}`);
    }
  }
}

console.log(`Static quality report · ${htmlFiles.length} HTML files`);
console.log(`Broken local references: ${brokenLinks}`);
console.log(`Duplicate IDs: ${duplicateIds}`);
console.log(`Images without alt: ${imagesWithoutAlt}`);
console.log(`Images without explicit dimensions: ${imagesWithoutDimensions}`);

if (findings.length) {
  console.log('\nFindings:');
  for (const finding of findings) console.log(finding);
}

if (brokenLinks || duplicateIds) {
  process.exitCode = 1;
}
