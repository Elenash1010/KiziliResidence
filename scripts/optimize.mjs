import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';

await mkdir('assets/optimized', { recursive: true });
const jobs = [
  ...[68, 69, 70, 71].map(n => [`assets/Prez_pict/Frame ${n}.png`, `territory-${n}`, 1400]),
  ['assets/Prez_pict/Frame 72.png', 'quest-heroes', 2200],
  ['assets/Prez_pict/Frame 73.png', 'kizili', 2000],
  ['assets/Prez_pict/Frame 74.png', 'residence', 2200],
  ['assets/ForestBG.png', 'forest', 1920],
  ['assets/map.png', 'map', 1000],
  ['assets/hero-residence.jpg', 'hero', 2200],
  ['assets/hero_residensBG.png', 'hero-residence-bg', 2200],
  ['assets/Novogodnyaya_skazka_Kizili_2-no-bg-preview_carve_photos.png', 'hero-title', 1280]
];
let html = await readFile('index.html', 'utf8');
let css = await readFile('styles.css', 'utf8');
let before = 0, after = 0;
const report = [];
for (const [source, name, width] of jobs) {
  const target = `assets/optimized/${name}.webp`;
  const info = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: name === 'map' ? 90 : 86, alphaQuality: 100, effort: 6 }).toFile(target);
  const size = (await stat(source)).size;
  before += size; after += info.size;
  html = html.replaceAll(source, target);
  css = css.replaceAll(source, target);
  report.push({ source, target, before: size, after: info.size, width: info.width, height: info.height });
}
html = await replaceImageDimensions(html);
await writeFile('index.html', html);
await writeFile('styles.css', css);
await writeFile('image-optimization.json', JSON.stringify({ before, after, images: report }, null, 2));
console.log(`Images: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB`);

async function replaceImageDimensions(text) {
  for (const match of [...text.matchAll(/<img\b[^>]*>/gs)]) {
    const src = match[0].match(/src="([^"]+)"/)?.[1];
    if (!src || src.endsWith('.svg')) continue;
    const { width, height } = await sharp(src).metadata();
    let tag = match[0].replace(/\s(?:width|height|decoding)="[^"]*"/g, '');
    tag = tag.replace(/\s*\/?>(\s*)$/, ` width="${width}" height="${height}" decoding="async" />`);
    tag = tag.replace(/(decoding="async"\s*){2}/g, 'decoding="async" ');
    text = text.replace(match[0], tag);
  }
  return text;
}
