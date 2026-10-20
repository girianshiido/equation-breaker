import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) { const ee = await readdir(dir, { withFileTypes: true }); return (await Promise.all(ee.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat(); }
const html = await readFile('docs/index.html', 'utf8');
const currentAssets = new Set([...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map(m => `docs/${m[1]}`));
const files = (await walk('docs')).filter(f => !f.startsWith('docs/assets/') || currentAssets.has(f)).filter(f => !['sw.js', 'release.json', '.nojekyll'].includes(f.split('/').at(-1))).sort();
const hash = createHash('sha256');
for (const f of files)
    hash.update(await readFile(f));
const version = hash.digest('hex').slice(0, 16), cache = `equation-breaker-${version}`;
const paths = files.map(f => `./${f.slice(5)}`);
paths.push('./', './release.json');
await writeFile('docs/release.json', JSON.stringify({ version, cache, files: paths }));
await writeFile('docs/.nojekyll', '');
await writeFile('docs/sw.js', `const CACHE=${JSON.stringify(cache)},FILES=${JSON.stringify(paths)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('equation-breaker-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(event.request);if(response.ok)return response;}catch{}const cache=await caches.open(CACHE);return await cache.match(new URL('./index.html',self.location).href)||Response.error();})());return;}if(new URL(event.request.url).pathname.endsWith('/release.json')){event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));return;}event.respondWith((async()=>{const cache=await caches.open(CACHE);const stored=await cache.match(event.request,{ignoreSearch:true,ignoreVary:true});if(stored)return stored;try{return await fetch(event.request);}catch(error){if(event.request.mode==='navigate'){const home=await cache.match(new URL('./index.html',self.location).href);if(home)return home;}throw error;}})());});\n`);
console.log(`PWA ${version} · ${files.length} fichiers précachés`);
