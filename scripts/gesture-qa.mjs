import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await context.newPage(), errors = [], report = [];
page.on('pageerror', e => errors.push(e.message));
await context.addInitScript(() => {
    if (localStorage.getItem('gesture-fixture')) return;
    const results = {};
    for (let w = 1; w <= 6; w++) for (let n = 1; n <= 12; n++) results[`w${w}-${n}`] = { stars: 1, moves: 20, time: 50000, methods: [] };
    localStorage.setItem('equation-breaker-v1', JSON.stringify({ version: 1, results, prefs: { motion: true, explainSteps:true }, active: null }));
    localStorage.setItem('gesture-fixture', '1');
});
const url = process.env.QA_URL || 'http://127.0.0.1:5194/';
const text = async selector => (await page.locator(selector).innerText()).replace(/\s+/g, ' ').trim();
const center = async selector => { const b = await page.locator(selector).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const done = async () => { await page.waitForFunction(() => document.querySelector('.game')?.getAttribute('aria-busy') === 'false'); };
async function open(id) {
    if (await page.locator('#pause').count()) { await page.locator('#pause').click(); await page.locator('#leave').click(); }
    else await page.locator('[data-screen="worlds"]:visible').first().click();
    await page.locator(`[data-world="${Number(id[1]) - 1}"]`).click(); await page.locator(`[data-level="${id}"]`).click();
}
async function begin(selector, hold = false) {
    const from = await center(selector); await page.mouse.move(from.x, from.y); await page.mouse.down();
    if (hold) await page.waitForTimeout(470); else await page.mouse.move(from.x + 13, from.y, { steps: 3 });
    await page.waitForSelector('.arena.in-transit');
}
async function cross(side = 'right') { const to = await center(`.${side}-plate`); await page.mouse.move(to.x, to.y, { steps: 7 }); await page.waitForTimeout(30); }
function check(label) { report.push({ test: label, passed: true }); console.log('OK', label); }
try {
    await mkdir('test-results', { recursive: true }); await page.goto(url); await page.locator('#play').waitFor();
    await open('w1-5');
    // The number changes sign only across the equality, then remains visible before reduction.
    await begin('[data-node="l.1"]'); assert.equal(await text('.right-plate .blocks'), '11'); assert.equal(await text('.drag-token'), '3');
    assert.match(await page.locator('.equal-sign').getAttribute('aria-label'), /suspendue/); assert.equal(await text('#moves'), '0');
    await cross(); assert.equal(await text('.drag-token'), '−3'); await page.screenshot({ path: 'test-results/gesture-term-transit.png' });
    await page.mouse.up(); assert.match(await text('.right-plate .blocks'), /11.*−\s*3/); assert.equal(await text('#moves'), '0');
    await page.screenshot({ path: 'test-results/gesture-term-landing.png' }); await done(); assert.equal(await text('.right-plate .blocks'), '8'); assert.equal(await text('#moves'), '1');
    check('Sign crossing, unsimplified drop and one committed move');
    await open('w1-2');await begin('[data-node="l.1"]');assert.equal(await text('.drag-token'),'−4');await cross();assert.equal(await text('.drag-token'),'4');await page.mouse.up();assert.equal((await text('.right-plate .blocks')).replaceAll(' ',''),'2+4');
    const spacing=await page.evaluate(()=>{const root=document.querySelector('.right-plate .blocks'),b=[...root.querySelectorAll('.block')].map(e=>e.getBoundingClientRect()),s=root.querySelector('.term-operator').getBoundingClientRect();return Math.abs(s.x+s.width/2-(b[0].right+b[1].left)/2);});assert.ok(spacing<=2);await page.screenshot({path:'test-results/centered-operator-landing.png'});await done();assert.equal(await text('.right-plate .blocks'),'6');
    check('Signed term travels with its minus, and the provisional plus is centered');
    await open('w1-5');await begin('[data-node="l.1"]');await cross();await page.mouse.up();await done();
    await page.locator('#undo').click(); const attempts = await text('#moves');
    await begin('[data-node="l.0"]', true); assert.equal(await text('.right-plate .blocks'), '11'); assert.equal(await text('.left-plate .fraction'), '3 2');
    await page.mouse.move(3, 3); await page.mouse.up(); await page.waitForSelector('.arena:not(.in-transit)'); assert.equal(await text('#moves'), attempts); assert.match(await text('.left-plate .blocks'), /2\s*x.*3/);
    check('Drop outside rolls back unilateral preview without a move');
    await begin('[data-node="l.0"]', true); await cross(); await page.screenshot({ path: 'test-results/gesture-factor-transit.png' }); await page.mouse.up();
    assert.equal(await text('.right-plate .fraction'), '11 2'); await done(); assert.equal(await text('.left-plate .fraction'), '3 2');
    check('Long press divides every source term before touching the destination');
    await page.reload(); await page.locator('#resume').click(); assert.equal(await text('.left-plate .fraction'), '3 2'); await page.locator('#history').click(); assert.match(await text('.history-list'), /Diviser les deux membres par 2/); await page.locator('#close-dialog').click();
    check('Gesture history and exact session recovery');
    await open('w1-8'); await begin('[data-node="l.0"] [data-grip="denominator"]', true); assert.match(await text('.left-plate .blocks'), /x.*8/); assert.equal(await text('.right-plate .blocks'), '5');
    await cross(); await page.mouse.up(); assert.equal(await text('.right-plate .blocks'), '4 × 5'); await done(); assert.equal(await text('.right-plate .blocks'), '20');
    check('Denominator drag multiplies every term and exposes the intermediate product');
    await open('w4-4'); await begin('[data-node="l.0"] i', true);
    assert.equal(await text('.drag-token'), '3 4'); assert.equal((await text('.left-plate .blocks')).replaceAll(' ', ''), 'x+23'); assert.equal(await text('.right-plate .blocks'), '2');
    await page.screenshot({path:'test-results/rational-coefficient-transit.png'});
    await cross(); await page.mouse.up(); assert.equal(await text('.right-plate .blocks'), '2 3 4'); await done();
    assert.equal(await text('.right-plate .blocks'), '8 3'); assert.equal(await text('#moves'), '1');
    await page.reload(); await page.locator('#resume').click(); assert.equal(await text('.right-plate .blocks'), '8 3');
    await page.locator('#undo').click(); await begin('[data-node="l.0"] i', true); await page.keyboard.press('Escape'); await page.mouse.up(); assert.equal(await text('.right-plate .blocks'), '2');
    await page.locator('[data-node="l.0"]').click(); await page.locator('[data-pick="rational-coefficient"]').focus(); await page.keyboard.press('Enter');
    assert.match(await text('#coefficient'), /3\/4/); await page.locator('#coefficient').click(); await page.locator('#apply').click(); await done(); assert.equal(await text('.right-plate .blocks'), '8 3');
    check('Full rational coefficient: unilateral preview, drop, recovery, undo, cancellation and keyboard');
    await open('w4-4'); await begin('[data-node="l.0"] [data-grip="coefficient"]', true); assert.equal(await text('.drag-token'), '3'); await page.keyboard.press('Escape'); await page.mouse.up();
    await begin('[data-node="l.0"] [data-grip="denominator"]', true); assert.equal(await text('.drag-token'), '4'); await page.keyboard.press('Escape'); await page.mouse.up(); assert.equal(await text('#moves'), '0');
    check('Numerator and denominator remain independently detachable');
    await open('w1-4'); await begin('[data-node="l"]', true); await cross(); await page.mouse.up(); assert.equal(await text('.right-plate .fraction'), '10 −2'); await done(); assert.equal(await text('.right-plate .blocks'), '−5');
    check('Negative divisor stays bare under the fraction bar, with parenthesized textual division');
    await open('w1-11'); await page.locator('[data-node="l.0"]').click(); assert.equal(await text('.revealed-grip'), '(−1)');
    await begin('.revealed-grip'); assert.match(await text('.left-plate .blocks'), /x.*−\s*9/); await cross(); await page.mouse.up(); assert.equal(await text('.right-plate .fraction'), '3 −1'); await done(); assert.equal(await text('.right-plate .blocks'), '−3');
    check('Selecting −x reveals −1, which can be detached directly');
    await open('w1-11'); await page.locator('#negate').focus(); await page.keyboard.press('Enter'); await done(); assert.equal(await text('.right-plate .blocks'), '−3'); assert.match(await text('.left-plate .blocks'), /x.*−\s*9/); assert.equal(await text('#moves'), '1');
    check('Keyboard × (−1) applies to both full members in one move');
    await open('w1-5'); await page.locator('[data-node="l.0"]').click(); await page.locator('[data-pick="coefficient"]').click(); assert.ok(await page.locator('.grip-picked').count()); assert.equal(await text('#moves'), '0');
    await page.locator('#coefficient').click(); await page.locator('#apply').click(); await done(); assert.equal(await text('.left-plate .fraction'), '3 2');
    check('No-drag alternative selects and applies the same factor');
    await open('w2-1');await begin('[data-node="l.0"]');await cross();await page.mouse.up();assert.doesNotMatch(await text('.right-plate .blocks'),/×/);assert.match((await text('.right-plate .blocks')).replaceAll(' ',''),/−3x/);await page.screenshot({path:'test-results/gesture-compact-like-terms.png'});await done();
    check('Variable terms remain compact throughout deposit and reduction');
    await open('w3-1'); await page.locator('[data-node="l"]').click(); assert.ok(await page.locator('#expand').count()); assert.ok(await page.locator('[data-pick="coefficient"]').count());
    await begin('[data-node="l"] [data-grip="coefficient"]', true); assert.equal(await text('.drag-token'), '2'); assert.equal((await text('.left-plate .blocks')).replaceAll(' ', ''), 'x+3'); assert.equal(await text('.right-plate .blocks'), '14');
    await page.screenshot({path:'test-results/gesture-group-transit.png'});await cross(); await page.mouse.up(); assert.equal(await text('.right-plate .fraction'), '14 2'); await done(); assert.equal(await text('.right-plate .blocks'), '7');
    await page.reload(); await page.locator('#resume').click(); assert.equal((await text('.left-plate .blocks')).replaceAll(' ', ''), 'x+3'); assert.equal(await text('#moves'), '1');
    check('Hold outer parenthesis coefficient: no expansion, unilateral preview, deposit and persistence');
    await page.locator('#undo').click();await page.locator('[data-node="l"]').click();await page.locator('[data-pick="coefficient"]').click();await page.locator('#coefficient').click();await page.locator('#apply').click();await done();assert.equal(await text('.right-plate .blocks'),'7');
    check('Parenthesis coefficient also works without dragging');
    await open('w4-6'); await page.locator('[data-node="l"]').click(); assert.ok(await page.locator('#expand').count());
    await begin('[data-node="l"] [data-grip="denominator"]', true); assert.equal(await text('.drag-token'), '4'); assert.equal((await text('.left-plate .blocks')).replaceAll(' ', ''), 'x+2'); assert.equal(await text('.right-plate .fraction'), 'x − 1 2');
    await cross(); await page.mouse.up(); await done(); assert.equal((await text('.left-plate .blocks')).replaceAll(' ', ''), 'x+2'); assert.match(await text('.right-plate .blocks'), /2.*\(.*x.*−.*1.*\)/);
    check('Hold grouped numerator denominator multiplies the entire opposite member');
    await open('w4-2'); await page.locator('[data-node="l"]').click(); await page.locator('[data-pick="denominator"]').click(); assert.ok(await page.locator('.grip-picked').count());
    await page.locator('#denominator').click(); await page.locator('#apply').click(); await done(); assert.equal(await text('.right-plate .blocks'), '15'); assert.equal((await text('.left-plate .blocks')).replaceAll(' ', ''), '2x−1');
    await page.locator('#undo').click(); await page.locator('[data-node="l"]').click(); await page.locator('#expand').click(); await done(); assert.ok(await page.locator('.left-plate .blocks .block').count()>1);
    check('Grouped fractions retain keyboard denominator and expansion alternatives');
    await open('w3-5');await page.locator('#negate').click();await done();assert.equal((await text('.left-plate .blocks')).replaceAll(' ',''),'x+2');assert.equal(await text('.right-plate .blocks'),'−4');assert.equal(await text('#moves'),'1');
    await page.reload();await page.locator('#resume').click();assert.equal((await text('.left-plate .blocks')).replaceAll(' ',''),'x+2');await begin('[data-node="l.1"]');await cross();await page.mouse.up();await done();await page.locator('#validate').click();assert.equal(await text('.result-solution'),'S = { −6 }');
    check('Multiplying a negative group by −1 cancels signs, persists and permits full resolution');
    await page.setViewportSize({width:320,height:568});await open('w3-2');
    const fontSize=()=>page.locator('.left-plate .block').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));const beforeFit=await fontSize();assert.ok(beforeFit>=16&&beforeFit<27);
    const fitState=await page.evaluate(()=>[...document.querySelectorAll('.blocks .block')].map(e=>parseFloat(getComputedStyle(e).fontSize)));assert.ok(fitState.every(n=>Math.abs(n-beforeFit)<.1));
    await begin('[data-node="l.0"] [data-grip="coefficient"]',true);const duringFit=await fontSize();assert.ok(duringFit>beforeFit);await cross();await page.mouse.up();await done();assert.ok(await fontSize()>=beforeFit);assert.equal(await text('#moves'),'1');
    await page.setViewportSize({width:844,height:390});await page.waitForFunction(n=>parseFloat(getComputedStyle(document.querySelector('.left-plate .block')).fontSize)>=n,duringFit);await page.setViewportSize({width:390,height:844});
    check('One shared font shrinks for a long member and grows when a factor is removed or the viewport widens');
    await open('w6-2');
    const squareStart = await center('[data-node="l.0"]'), linearEnd = await center('[data-node="l.1"]');
    await page.mouse.move(squareStart.x, squareStart.y); await page.mouse.down(); await page.waitForTimeout(460);
    await page.mouse.move(linearEnd.x, linearEnd.y, { steps: 6 }); await page.mouse.up();
    assert.equal(await page.locator('.block.selected').count(), 2); assert.match(await text('#complete-square'), /Compléter le carré/);
    await page.locator('#complete-square').click(); assert.match(await text('#dialog-content'), /25\/4/); await page.locator('#apply').click(); await done();
    await page.locator('[data-node="l.1"]').click();await page.locator('[data-node="l.2"]').click();await page.locator('#combine').click();await done();
    await page.locator('[data-node="l.1"]').click();await page.locator('#write-square').click();await page.locator('#apply').click();await done();
    await page.locator('[data-node="l.0"]').click();await page.locator('[data-node="l.1"]').click();await page.locator('#difference-squares').click();await page.locator('#apply').click();await done();
    await page.locator('#split').click();await done();assert.equal(await page.locator('[data-branch]').count(),2);
    for (const index of [0, 1]) {
        assert.ok(await page.locator(`[data-branch="${index}"].active`).count());
        await begin('[data-node="l.1"]'); await cross(); await page.mouse.up(); await done(); await page.locator('#validate').click();
    }
    assert.equal(await text('.result-solution'), 'S = { 2 ; 3 }');
    await page.screenshot({ path: 'test-results/completed-square-branches.png', fullPage: true });
    check('Hold-and-sweep selection, exact 25/4 completion and two solved square-root branches');
    await open('w5-1'); await page.locator('#split').click(); await done();
    await begin('[data-node="l.1"]'); await cross(); await page.mouse.up(); await done(); await page.locator('#validate').click();
    assert.ok(await page.locator('[data-branch="1"].active').count()); assert.match(await text('[data-branch="0"]'), /✓/); assert.equal(await page.locator('.block.selected').count(),0);
    await page.reload(); await page.locator('#resume').click(); assert.ok(await page.locator('[data-branch="1"].active').count());
    await page.screenshot({path:'test-results/product-auto-second-door.png'});
    await begin('[data-node="l.1"]'); await cross(); await page.mouse.up(); await done(); await page.locator('#validate').click();
    assert.equal(await text('.result-solution'), 'S = { −3 ; 2 }');
    check('Zero product validates door one, automatically opens door two, persists and reunites solutions on final validation');
    // Actual touch events in Chrome, in both portrait and landscape arenas.
    const cdp = await context.newCDPSession(page);
    for (const size of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(size); await open('w1-5'); await page.locator('#arena').scrollIntoViewIfNeeded();
        const from = await center('[data-node="l.1"]'), to = await center('.right-plate');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8 }] });
        await page.waitForTimeout(35); assert.ok(await page.locator('.drop-over').count()); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await done(); assert.equal(await text('.right-plate .blocks'), '8');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); check(`Real touch events ${size.width}×${size.height}`);
    }
    for (const id of ['w3-1','w4-2']) {
        await page.setViewportSize({width:320,height:568});await open(id);await page.locator('#arena').scrollIntoViewIfNeeded();
        const from=await center(id==='w3-1'?'[data-node="l"] [data-grip="coefficient"]':'[data-node="l"] [data-grip="denominator"]'),to=await center('.right-plate');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});await page.waitForTimeout(460);assert.ok(await page.locator('.arena.in-transit').count());
        for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await done();assert.equal(await text('.right-plate .blocks'),id==='w3-1'?'7':'15');
        check(`Real touch long press grouped factor ${id}`);
    }
    await page.setViewportSize({width:320,height:568}); await open('w4-5'); await page.locator('#arena').scrollIntoViewIfNeeded();
    const rationalFrom = await center('[data-node="l"] i'), rationalTo = await center('.right-plate');
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[rationalFrom]}); await page.waitForTimeout(470);
    assert.equal((await text('.drag-token')).replaceAll(' ', ''), '−23'); assert.equal(await text('.left-plate .blocks'), 'x'); assert.equal(await text('.right-plate .blocks'), '4');
    for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rationalFrom.x+(rationalTo.x-rationalFrom.x)*i/8,y:rationalFrom.y+(rationalTo.y-rationalFrom.y)*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await done(); assert.equal(await text('.right-plate .blocks'),'−6'); assert.equal(await text('#moves'),'1');
    await page.screenshot({path:'test-results/rational-coefficient-mobile.png'});
    check('Real touch long press takes a signed rational coefficient at 320×568');
    await page.setViewportSize({ width: 390, height: 844 }); await open('w1-5');
    await begin('[data-node="l.0"]', true); await page.keyboard.press('Escape'); await page.mouse.up(); assert.match(await text('.left-plate .blocks'), /2\s*x.*3/); assert.equal(await text('#moves'), '0');
    await begin('[data-node="l.1"]'); await page.setViewportSize({ width: 430, height: 932 }); await page.mouse.up(); assert.equal(await text('#moves'), '0'); assert.match(await text('.left-plate .blocks'), /2\s*x.*3/);
    check('Escape and orientation change cancel the gesture completely');
    for(const id of ['w3-4','w3-10','w4-6','w6-2']) {await page.setViewportSize({width:320,height:568});await open(id);const r=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,scale:parseFloat(document.querySelector('#arena').style.getPropertyValue('--equation-scale')),sizes:[...document.querySelectorAll('.blocks .block')].map(e=>parseFloat(getComputedStyle(e).fontSize))}));assert.ok(r.scroll<=r.width+1);assert.ok(r.sizes.every(n=>n>=15.9));check(`Long equation stays within the viewport at a readable size ${id}`);}
    await open('w1-5'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); await begin('[data-node="l.1"]');
    const samples = []; for (let i = 0; i < 20; i++) { const started = performance.now(); await cross(i % 2 ? 'right' : 'left'); samples.push(performance.now() - started); }
    await page.mouse.move(3, 3); await page.mouse.up(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    check('Repeated pointer moves with CPU ×6 preserve cancellation and model');
    assert.deepEqual(errors, []); await writeFile('test-results/gesture-report.json', JSON.stringify({ url, date: new Date().toISOString(), checks: report, errors }, null, 2)); console.log('GESTURES PASSED', report.length);
} catch (error) { await page.screenshot({ path: 'test-results/gesture-failure.png', fullPage: true }); console.log(await page.locator('body').innerText()); throw error; }
finally { await browser.close(); }
