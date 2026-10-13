import { readFile, access } from 'node:fs/promises';
const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
if (new Set(ids).size !== ids.length) throw Error('Duplicate HTML ids');
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.includes(match[1])) throw Error(`Missing anchor ${match[1]}`);
}
for (const match of [...html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g), ...css.matchAll(/url\(["']?(assets\/[^"')]+)["']?\)/g)]) await access(match[1]);
for (const match of html.matchAll(/<img\b[^>]*>/gs)) {
  if (!/\balt=/.test(match[0])) throw Error('Image missing alt');
}
if (css.split('{').length !== css.split('}').length) throw Error('Unbalanced CSS');
console.log('Local assets, anchors, ids, alt attributes and CSS checked.');
