import assert from 'node:assert/strict';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { plans } = await server.ssrLoadModule('/scripts/qa-plan.ts');
await server.close();
const url = process.env.QA_URL || 'http://127.0.0.1:5194/';
const profile = await mkdtemp(join(tmpdir(), 'equation-qa-'));
const context = await chromium.launchPersistentContext(profile, { headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1 });
const page = await context.newPage(), errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
await mkdir('test-results', { recursive: true });
async function geometry(label) { const rr = await page.evaluate(() => { const w = innerWidth; const nodes = [...document.querySelectorAll('.block,.primary,.world-card,.level-card')].map(n => { const r = n.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(n); const content = range.getBoundingClientRect(); return { tag: n.className, x: r.x, right: r.right, w: r.width, sw: n.scrollWidth, cw: n.clientWidth, contentX: content.x, contentRight: content.right, text: n.textContent }; }); return { w, sw: document.documentElement.scrollWidth, nodes }; }); assert.ok(rr.sw <= rr.w + 1, `${label}: page overflow ${rr.sw}/${rr.w}`); for (const r of rr.nodes) {
    assert.ok(r.x >= -.5 && r.right <= rr.w + .5, `${label}: outside ${JSON.stringify(r)}`);
    assert.ok(r.tag.startsWith('block') ? r.contentX >= r.x - 2 && r.contentRight <= r.right + 2 : r.sw <= r.cw + 2, `${label}: clipped content ${JSON.stringify(r)}`);
} report.push({ label, width: rr.w, fits: true }); }
async function nav(screen) { const button = page.locator(`[data-screen="${screen}"]:visible`).first(); if (await button.count()) {
    await button.click();
    return;
} if (screen === 'worlds' && await page.locator('#pause').count()) {
    await page.locator('#pause').click();
    await page.locator('#leave').click();
    return;
} await page.locator('.brand').click(); await page.locator(`[data-screen="${screen}"]:visible`).first().click(); }
async function openLevel(plan) { await nav('worlds'); await page.locator(`[data-world="${plan.world}"]`).click(); await page.locator(`[data-level="${plan.id}"]`).click(); }
async function select(id) { const nodes = page.locator(`[data-node="${id}"]`); if (await nodes.count())
    await nodes.click();
else
    { await page.locator(`[data-whole="${id}"]`).focus(); await page.keyboard.press('Enter'); } }
async function operation(kind, value) { await page.locator('#operation').click(); await page.locator('#op-kind').selectOption(kind); await page.locator('#operand').fill(value); await page.locator('#operation-form button[type=submit]').click(); }
async function act(ev) { if (['add', 'divide', 'multiply'].includes(ev.kind)) {
    await operation(ev.kind, ev.value);
    await page.locator('#apply').click();
}
else if(ev.kind==='drag'){
    await select(ev.id);
    if(ev.part==='term')await page.locator('#opposite').click();
    else if(ev.part==='algebraic-coefficient')await page.locator('#exact-coefficient').click();
    else if(ev.part==='denominator')await page.locator('#denominator').click();
    else await page.locator('#coefficient').click();
    await page.locator('#apply').click();
}
else if(['complete-square','difference-squares','factor-common'].includes(ev.kind)){
    for(const id of ev.ids)await select(id);
    const button=ev.kind==='factor-common'?(ev.maximal&&await page.locator('#factor-common').count()?'factor-common':'factor-x'):ev.kind;
    await page.locator(`#${button}`).click();await page.locator('#apply').click();
}
else if(ev.kind==='write-square'){await select(ev.id);await page.locator('#write-square').click();await page.locator('#apply').click();}
else if (ev.kind === 'validate') {
    await page.locator('#validate').click();
}
else if (ev.kind === 'branch') {
    await page.locator(`[data-branch="${ev.index}"]`).click();
}
else if (['expand', 'factor', 'simplify'].includes(ev.kind)) {
    await select(ev.id);
    await page.locator(`#${ev.kind}`).click();
}
else if (ev.kind === 'combine') {
    for (const id of ev.ids)
        await select(id);
    await page.locator('#combine').click();
}
else
    await page.locator(`#${ev.kind}`).click(); await page.waitForFunction(() => document.querySelector('.game')?.getAttribute('aria-busy') !== 'true'); }
try {
    await page.goto(url);
    await page.waitForSelector('#play');
    await geometry('home mobile');
    await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
    await geometry('home desktop');
    // Genuine first play with no fixture, via the keyboard and the selected term.
    await page.setViewportSize({ width: 320, height: 568 });
    await page.locator('#play').click();
    await geometry('first tutorial');
    await page.locator('[data-node="l.1"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('#opposite').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('.mirror-preview').innerText(), /−3/);
    await page.locator('#apply').click();
    await page.waitForTimeout(230);
    await page.locator('#validate').click();
    assert.match(await page.locator('.result-solution').innerText(), /5/);
    assert.equal(await page.locator('.result-stars .stars').getAttribute('aria-label'), '3 étoiles sur 3');
    report.push({ test: 'First level keyboard, mirror and reward', passed: true });
    await page.reload();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('equation-breaker-v1')).results['w1-1'].stars), 3);
    // Seed only progression for comprehensive later-world UI coverage.
    await page.evaluate(ids => { const s = JSON.parse(localStorage.getItem('equation-breaker-v1')); for (const id of ids)
        s.results[id] = { stars: 1, moves: 0, time: 0, methods: [] }; s.prefs.motion = false; s.active = null; localStorage.setItem('equation-breaker-v1', JSON.stringify(s)); }, plans.map(p => p.id));
    await page.reload();
    // Each fixed level is completed by operating real UI, without an injected solver in the app.
    for (const plan of (process.env.QA_QUICK ? [] : plans)) {
        console.log('Parcours', plan.id);
        await openLevel(plan);
        await geometry(plan.id);
        for (const ev of plan.events)
            await act(ev);
        assert.equal(await page.locator('.result-solution').getAttribute('aria-label'), plan.answer, plan.id);
        report.push({ level: plan.id, solved: true });
        if (['w3-2', 'w4-4', 'w5-1', 'w6-5'].includes(plan.id))
            await page.screenshot({ path: `test-results/result-${plan.id}.png`, fullPage: true });
    }
    await nav('worlds');await page.locator('[data-world="5"]').click();
    const exponents=await page.locator('.level-formula sup').evaluateAll(nodes=>nodes.map(sup=>{const box=sup.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(sup.previousSibling);const base=range.getBoundingClientRect();return {top:box.top,bottom:box.bottom,base:base.bottom,size:parseFloat(getComputedStyle(sup).fontSize),font:parseFloat(getComputedStyle(sup.parentElement).fontSize)};}));
    assert.ok(exponents.length>=10);assert.ok(exponents.every(s=>s.bottom<s.base&&s.size<s.font*.75));
    assert.equal(await page.locator('.level-formula').first().evaluate(e=>getComputedStyle(e).display),'block');
    report.push({test:'Level menu keeps x² superscripts above the baseline with normal inline spacing',passed:true});
    // Deliberate identities: no automatic quadratic factor button and no discriminant.
    await openLevel(plans.find(p=>p.id==='w6-2'));
    assert.equal(await page.locator('#factor-left,#factor,#delta,#roots').count(),0);
    await select('l.0');await select('l.1');await page.locator('#complete-square').click();
    assert.match(await page.locator('#dialog-content').innerText(),/compens/);await page.locator('#apply').click();
    await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')==='false');
    assert.equal(await page.locator('.left-plate .block').count(),3);assert.equal(await page.locator('.right-plate .blocks').innerText(),'0');
    await page.screenshot({path:'test-results/identity-compensation.png'});
    await select('l.1');await select('l.2');await page.locator('#combine').click();await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')==='false');
    await select('l.1');assert.equal(await page.locator('#difference-squares').count(),0);
    await page.locator('#write-square').click();await page.locator('#apply').click();await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')==='false');
    await select('l.0');await select('l.1');await page.locator('#difference-squares').click();await page.locator('#apply').click();await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')==='false');
    assert.match(await page.locator('[data-node="l"]').getAttribute('aria-label'),/x − 2.*x − 3/);
    report.push({test:'Explicit compensation, manual constant fusion, square preparation and chosen difference identity',passed:true});
    await openLevel(plans.find(p=>p.id==='w6-10'));await select('l.0');await select('l.1');
    assert.match(await page.locator('#factor-x').innerText(),/Mettre x/);assert.match(await page.locator('#factor-common').innerText(),/3x/);
    await page.locator('#factor-common').click();await page.locator('#apply').click();await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')==='false');
    assert.match(await page.locator('[data-node="l"]').getAttribute('aria-label'),/3x.*x − 4/);
    report.push({test:'Common factor offers x and 3x as separate deliberate choices',passed:true});
    // Actual touch long press on an irrational coefficient in a prepared product branch.
    await page.setViewportSize({width:320,height:568});await openLevel(plans.find(p=>p.id==='w6-4'));
    for(const ev of plans.find(p=>p.id==='w6-4').events){if(ev.kind==='drag'&&ev.part==='algebraic-coefficient')break;await act(ev);}
    await page.locator('#arena').scrollIntoViewIfNeeded();
    const touchSession=await context.newCDPSession(page),from=await page.locator('[data-grip="algebraic-coefficient"]').boundingBox(),to=await page.locator('.right-plate').boundingBox();
    const start={x:from.x+from.width/2,y:from.y+from.height/2},end={x:to.x+to.width/2,y:to.y+to.height/2};
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await page.waitForTimeout(470);
    assert.equal(await page.locator('.left-plate .blocks').innerText(),'x');assert.ok(await page.locator('.drag-token .radical').count());
    for(let i=1;i<=8;i++)await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/8,y:start.y+(end.y-start.y)*i/8}]});
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')==='false');
    assert.equal(await page.locator('.right-plate [data-node]').getAttribute('aria-label'),'−1/2, membre droit');
    await page.reload();await page.locator('#resume').click();assert.equal(await page.locator('.right-plate [data-node]').getAttribute('aria-label'),'−1/2, membre droit');
    report.push({test:'Real touch division by an exact radical coefficient at 320×568, followed by recovery',passed:true});
    // Responsive arena, including the longest expressions and large-text accessibility mode.
    for (const size of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(size);
        for (const id of ['w1-1', 'w3-4', 'w4-6', 'w5-3', 'w6-11']) {
            await openLevel(plans.find(p => p.id === id));
            await geometry(`${id} ${size.width}×${size.height}`);
        }
        await page.screenshot({ path: `test-results/game-${size.width}x${size.height}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await openLevel(plans[0]);
    // Invalid operation has precise feedback and leaves equation intact.
    const before = await page.locator('#arena').innerText();
    await operation('divide', '0');
    assert.match(await page.locator('.dialog-error').innerText(), /diviser par 0/);
    await page.locator('#close-dialog').click();
    assert.equal(await page.locator('#arena').innerText(), before);
    report.push({ test: 'Division by zero rejected without mutation', passed: true });
    // Undo, in-progress recovery, and rapid repeated inputs.
    await act(plans[0].events[0]);
    await page.locator('#undo').click();
    assert.match(await page.locator('#arena').innerText(), /3/);
    await act(plans[0].events[0]);
    await page.reload();
    await page.locator('#resume').click();
    assert.match(await page.locator('#arena').innerText(), /5/);
    await page.locator('#validate').click();
    assert.ok(await page.locator('.result-screen').isVisible());
    await openLevel(plans.find(p => p.id === 'w3-2'));
    await select('l.0');
    await page.locator('#expand').evaluate(el => { el.click(); el.click(); el.click(); });
    await page.waitForTimeout(90);
    assert.equal(await page.locator('#moves').innerText(), '1');
    await nav('settings');
    await page.locator('[data-pref="large"]').check();
    await page.locator('[data-pref="lite"]').check();
    await page.locator('#back-game').click();
    await geometry('large text, lite mode');
    await nav('settings');
    await page.locator('[data-pref="large"]').uncheck();
    await page.locator('[data-pref="lite"]').uncheck();
    await nav('practice');
    await page.locator('[data-train="0"]').click();
    assert.equal(await page.locator('#moves').innerText(), '0');
    await nav('practice');
    await page.locator('#arcade').click();
    assert.match(await page.locator('.game-heading .eyebrow').innerText(), /ARCADE/);
    // Real Chrome sixfold CPU slowdown, repeated selections and paint latency.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await openLevel(plans.find(p => p.id === 'w2-1'));
    const timings = await page.evaluate(async () => { const values = []; for (let i = 0; i < 30; i++) {
        const t = performance.now();
        document.querySelector('[data-node="l.0"]').click();
        await new Promise(resolve => requestAnimationFrame(resolve));
        values.push(performance.now() - t);
    } return values; });
    const sorted = timings.toSorted((a, b) => a - b);
    report.push({ test: 'CPU ×6, 30 selections to next frame', medianMs: sorted[15], p95Ms: sorted[28], maxMs: sorted.at(-1) });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // Complete cache and offline reload: actual service worker, no mocked requests.
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.waitForFunction(() => document.querySelector('.footer').textContent.includes('Prêt pour le hors-ligne'));
    const cache = await page.evaluate(async () => { const release = await (await fetch('./release.json')).json(), cache = await caches.open(release.cache); return { name: release.cache, complete: (await Promise.all(release.files.map(f => cache.match(new URL(f, location.href).href)))).every(Boolean) }; });
    assert.ok(cache.complete);
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('#play');
    await page.locator('#play').click();
    await act(plans[0].events[0]);
    await page.locator('#validate').click();
    assert.ok(await page.locator('.result-screen').isVisible());
    report.push({ test: 'Complete precache and offline reload + solve', ...cache, passed: true });
    await context.setOffline(false);
    assert.deepEqual(errors, []);
    await writeFile(process.env.QA_QUICK ? 'test-results/browser-quick-report.json' : 'test-results/browser-report.json', JSON.stringify({ date: new Date().toISOString(), engine: 'Google Chrome desktop, mobile/touch emulation', errors, report }, null, 2));
    console.log(JSON.stringify({ success: true, checks: report.length, performance: report.find(r => r.medianMs), errors }, null, 2));
}
catch (error) {
    console.log('FAILURE', error.message, 'JS errors', errors);
    await page.screenshot({ path: 'test-results/failure.png', fullPage: true });
    console.log(await page.locator('body').innerText({ timeout: 2000 }));
    throw error;
}
finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
}
