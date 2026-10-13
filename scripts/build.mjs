import { readFile, writeFile, mkdir, copyFile, stat, readdir, unlink } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

await mkdir('dist', { recursive: true });
const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const js = await readFile('script.js', 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 10);
let output = html.replace('href="styles.css"', `href="styles.css?v=${hash(css)}"`).replace('src="script.js"', `src="script.js?v=${hash(js)}"`);
const paths = new Set([...html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g), ...css.matchAll(/url\(["']?(assets\/[^"')]+)["']?\)/g)].map(m => m[1]));
// Remove obsolete generated files only, so previous images never enter a new archive.
const outputRoot = resolve('dist');
const expected = new Set(['index.html', 'styles.css', 'script.js', 'robots.txt', '_headers', ...paths]);
async function removeStaleFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (!path.startsWith(outputRoot + sep)) throw Error('Output path escaped dist');
    if (entry.isSymbolicLink()) throw Error('Symlinks are not allowed in dist');
    if (entry.isDirectory()) await removeStaleFiles(path);
    else if (!expected.has(relative(outputRoot, path).split(sep).join('/'))) await unlink(path);
  }
}
await removeStaleFiles(outputRoot);
for (const path of paths) {
  await mkdir(dirname(`dist/${path}`), { recursive: true });
  await copyFile(path, `dist/${path}`);
}
await writeFile('dist/index.html', output);
await writeFile('dist/styles.css', css);
await writeFile('dist/script.js', js);
await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\n');
await writeFile('dist/_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=86400\n');
let bytes = Buffer.byteLength(output + css + js);
for (const path of paths) bytes += (await stat(path)).size;
console.log(`dist ready: ${paths.size} assets, ${(bytes / 1048576).toFixed(2)} MB`);
