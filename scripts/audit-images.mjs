import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const paths = new Set([...html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g), ...css.matchAll(/url\(["']?(assets\/[^"')]+)["']?\)/g)].map(m => m[1]));
const images = [];
for (const path of paths) {
  const metadata = await sharp(path).metadata();
  await sharp(path).stats();
  images.push({ path, bytes: (await stat(path)).size, width: metadata.width, height: metadata.height, format: metadata.format, alpha: metadata.hasAlpha });
}
await mkdir('qa', { recursive: true });
await writeFile('qa/image-audit.json', JSON.stringify({ bytes: images.reduce((n, i) => n + i.bytes, 0), images }, null, 2));
console.log(`${images.length} used images decoded successfully; ${(images.reduce((n, i) => n + i.bytes, 0) / 1048576).toFixed(2)} MB total.`);
