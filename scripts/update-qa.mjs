import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';
const dir = await mkdtemp(join(tmpdir(), 'equation-update-'));
await cp('docs', dir, { recursive: true });
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => { try {
    const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname), file = resolve(dir, '.' + (p === '/' ? '/index.html' : p));
    if (!file.startsWith(dir + '/'))
        throw Error();
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
}
catch {
    res.writeHead(404);
    res.end();
} });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
try {
    // Reproduce a cached HTML document whose entry files belong to the prior release.
    const html = await readFile(join(dir,'index.html'),'utf8');
    const legacyHtml = html.replace(/assets\/index-[\w-]+\.js/, 'assets/index-DjHfpqcI.js').replace(/assets\/index-[\w-]+\.css/, 'assets/index-B-vWpfkg.css');
    const legacyContext = await browser.newContext({serviceWorkers:'block'});
    const legacyPage = await legacyContext.newPage();
    await legacyContext.route(url, route=>route.fulfill({contentType:'text/html',body:legacyHtml}));
    await legacyPage.goto(url);await legacyPage.locator('#play').waitFor();
    assert.ok(await legacyPage.locator('.app-shell').isVisible(), 'Prior HTML still loads its JS and CSS');
    assert.notEqual(await legacyPage.locator('.skip').evaluate(el=>getComputedStyle(el).position),'static','Prior stylesheet is applied');
    await legacyContext.close();
    // A missing entry has a usable fallback instead of an empty page.
    const failedContext = await browser.newContext({serviceWorkers:'block'});
    await failedContext.route('**/assets/*.js',route=>route.abort());
    const failedPage = await failedContext.newPage();await failedPage.goto(url);
    assert.ok(await failedPage.getByRole('button',{name:'Recharger le jeu'}).isVisible());
    await failedContext.close();
    await page.goto(url);
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.locator('#play').click();
    await page.locator('[data-node="l.1"]').click();
    await page.locator('#opposite').click();
    assert.equal(await page.locator('#dialog').evaluate(el=>el.open),false);
    await page.waitForFunction(() => document.querySelector('.game').getAttribute('aria-busy') === 'false');
    await writeFile(join(dir, 'sw.js'), (await readFile(join(dir, 'sw.js'), 'utf8')) + '\n// Test de mise à jour contrôlée.\n');
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration()).waiting);
    assert.ok(await page.locator('.game').isVisible(), 'No automatic reload during a level');
    assert.equal(await page.locator('#moves').innerText(), '1');
    await page.waitForTimeout(100);
    await page.locator('[data-screen="settings"]').click();
    await page.locator('#update').waitFor();
    await Promise.all([page.waitForNavigation(), page.locator('#update').click()]);
    await page.locator('#resume').click();
    assert.equal(await page.locator('#moves').innerText(), '1');
    await page.locator('#validate').click();
    assert.ok(await page.locator('.result-screen').isVisible());
    await page.context().setOffline(true);await page.reload();await page.locator('#play').waitFor();
    await page.locator('#play').click();assert.ok(await page.locator('.game').isVisible(),'Network-first navigation still works offline');
    await page.context().setOffline(false);
    const release=JSON.parse(await readFile(join(dir,'release.json'),'utf8'));
    assert.ok(!release.files.includes('./assets/index-DjHfpqcI.js'),'Compatibility bundles are not precached');
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/update-report.json', JSON.stringify({ passed: true, noSilentReload: true, resumedMoves: 1, solved: true, staleHtmlRecovered: true, missingEntryFallback: true, offlineNavigation: true, noLegacyPrecache: true }, null, 2));
    console.log('Mise à jour en attente, reprise exacte et résolution : OK');
}
finally {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dir, { recursive: true, force: true });
}
