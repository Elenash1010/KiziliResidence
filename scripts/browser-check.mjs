import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

await mkdir('qa', { recursive: true });
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root)) throw Error('Invalid path');
    const contents = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(contents);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${resolve('qa/chrome-profile')}`, 'about:blank'], { windowsHide: true });
let ws;
try {
  const endpoint = await new Promise((ok, fail) => {
    const timeout = setTimeout(() => fail(Error('Chrome launch timed out')), 20000);
    chrome.on('error', fail);
    chrome.stderr.on('data', chunk => {
      const match = chunk.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); ok(match[1]); }
    });
  });
  const targets = await (await fetch(endpoint.replace('ws:', 'http:').replace(/\/devtools\/browser\/.*/, '/json/list'))).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map(), errors = [], failedResources = [];
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    if (msg.id) { const item = pending.get(msg.id); pending.delete(msg.id); msg.error ? item?.reject(Error(msg.error.message)) : item?.resolve(msg.result); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value).join(' '));
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) failedResources.push({url: msg.params.response.url, status: msg.params.response.status});
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`CDP timed out: ${method}`)), 15000);
    pending.set(++id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => (await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable');
  await call('Page.navigate', { url: `http://127.0.0.1:${port}` });
  for (let i = 0; i < 30; i++) { if (await evaluate('document.readyState === "complete"')) break; await new Promise(r => setTimeout(r, 200)); }
  await evaluate('document.documentElement.style.scrollBehavior = "auto"; document.documentElement.style.scrollSnapType = "none";');
  const results = [];
  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[390,844],[320,740]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await evaluate('document.querySelectorAll("img").forEach(i => i.loading = "eager"); document.querySelectorAll(".reveal").forEach(e => e.classList.add("is-visible"));');
    await evaluate('Promise.all([...document.images].map(i => i.decode().catch(() => null)))');
    await new Promise(r => setTimeout(r, 700));
    const checks = await evaluate(`(() => {
      const rect = e => { const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width,height:r.height}; };
      return {
        width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,
        brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),
        headings:[...document.querySelectorAll('main .screen h1[id],main .screen h2[id]')].map(e=>({id:e.id,size:getComputedStyle(e).fontSize,overflow:e.scrollWidth>e.clientWidth+1})),
        header:rect(document.querySelector('.site-header__inner')),
        headerItems:[...document.querySelector('.site-header__inner').children].filter(e=>getComputedStyle(e).display!=='none').map(e=>({class:e.className,...rect(e)})),
        familyHeight:document.querySelector('#family').getBoundingClientRect().height,
        bookingLinks:[...document.querySelectorAll('.button--booking,.button--header,.site-nav__mobile-cta')].map(e=>e.getAttribute('href')),
        heroCharacterMask:getComputedStyle(document.querySelector('.hero__kizili')).maskImage,
        heroCharacterOpacity:getComputedStyle(document.querySelector('.hero__kizili img')).opacity
      };
    })()`);
    results.push(checks);
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`qa/${width}.png`, Buffer.from(shot.data,'base64'));
    if (width <= 1100) {
      const menuWorks = await evaluate(`(() => {
        const toggle = document.querySelector('.menu-toggle');
        toggle.click();
        const opened = toggle.getAttribute('aria-expanded') === 'true' && getComputedStyle(document.querySelector('.site-nav')).display !== 'none';
        document.querySelector('.site-nav__link').click();
        return opened && toggle.getAttribute('aria-expanded') === 'false';
      })()`);
      checks.menuWorks = menuWorks;
    }
    if (width === 1440 || width === 390) {
      for (const section of ['family', 'school']) {
        await evaluate(`window.scrollTo({top:document.getElementById('${section}').getBoundingClientRect().top + scrollY,behavior:'instant'});`);
        await new Promise(r => setTimeout(r, 500));
        const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(`qa/${section}-${width}.png`, Buffer.from(shot.data,'base64'));
      }
    }
    await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  }
  await writeFile('qa/browser-report.json', JSON.stringify({ results, errors, failedResources },null,2));
  console.log(JSON.stringify({ results, errors, failedResources },null,2));
  await call('Browser.close');
} finally { ws?.close(); chrome.kill(); server.close(); }
