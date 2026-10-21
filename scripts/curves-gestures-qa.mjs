import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
import {unlockEquations} from './qa-campaign-fixture.mjs';
const profile=await mkdtemp(join(tmpdir(),'curve-gestures-'));
const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5202/');await unlockEquations(page);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('equation-breaker-v1'));for(let i=1;i<=42;i++)s.systems.results[`s${i}`]={stars:1,moves:1,errors:0,hints:0};for(let i=1;i<=12;i++)s.curves.results[`c${i}`]={stars:1,moves:1,errors:0,hints:0};localStorage.setItem('equation-breaker-v1',JSON.stringify(s));});
 await page.reload();await page.goto((process.env.QA_URL||'http://127.0.0.1:5202/')+'#world-9');await page.locator('[data-curve-level="c1"]').click();
 await page.screenshot({path:'test-results/curves-first-circle-line.png',fullPage:true});await page.locator('#curve-back').click();await page.locator('[data-curve-level="c12"]').click();await page.locator('#curve-board').scrollIntoViewIfNeeded();
 const row=()=>page.locator('[data-curve-row="1"]'),term=()=>row().locator('[data-side="left"][data-curve-term="1"]');
 const plain=s=>s.replace(/\s/g,'');const initial=plain(await row().innerText());
 let a=await term().boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.waitForTimeout(470);
 assert.equal(plain(await row().locator('.sys-right').innerText()),'1');assert.match(plain(await row().locator('.sys-left').innerText()),/y/);assert.equal(plain(await page.locator('.sys-term-ghost').innerText()),'2');await page.keyboard.press('Escape');await page.mouse.up();assert.equal(plain(await row().innerText()),initial);checks.push('Long hold previews the source only; Escape restores both members');
 // Real touch hold and release on the far side of the equals sign.
 const cdp=await context.newCDPSession(page);a=await term().boundingBox();const b=await row().locator('.sys-right').boundingBox(),start={x:a.x+a.width/2,y:a.y+a.height/2},end={x:b.x+b.width/2,y:b.y+b.height/2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await page.waitForTimeout(470);assert.equal(await page.locator('.sys-term-ghost').count(),1);assert.equal(plain(await row().locator('.sys-right').innerText()),'1');
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/8,y:start.y+(end.y-start.y)*i/8}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);assert.equal(plain(await row().locator('.sys-right').innerText()),'12');await page.locator('#curve-undo').click();checks.push('Touch coefficient division commits only at release, then undo restores the equation');
 // The whole line stays anchored under the original handle.
 a=await page.locator('[data-curve-handle="0"]').boundingBox();const x=a.x+a.width/2,y=a.y+a.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y+15);const ghost=await page.locator('.sys-row-ghost .sys-handle').boundingBox();assert.ok(Math.abs(ghost.x+ghost.width/2-(x+12))<2);await page.keyboard.press('Escape');await page.mouse.up();checks.push('Line drag preserves its handle under the pointer');
 await page.locator('[data-curve-handle="1"]').click();const before=await row().innerText();await page.locator('#curve-wheel-value').fill('-2');assert.notEqual(await row().innerText(),before);assert.equal(await page.locator('[data-curve-row="0"]').isVisible(),true);await page.locator('#curve-wheel-value').press('Escape');assert.equal(await row().innerText(),before);checks.push('Inline negative multiplier preview keeps the whole system visible and cancels cleanly');
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});const times=await page.evaluate(async()=>{const a=[];for(let i=0;i<30;i++){const t=performance.now();document.querySelector('[data-curve-term]').click();await new Promise(r=>requestAnimationFrame(r));a.push(performance.now()-t);}return a;});await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});times.sort((a,b)=>a-b);const performance={median:times[15],p95:times[28],max:times[29]};assert.deepEqual(errors,[]);await writeFile('test-results/curves-gestures-report.json',JSON.stringify({success:true,checks,performance,errors},null,2));console.log(JSON.stringify({success:true,checks,performance,errors},null,2));
}finally{await context.close();await rm(profile,{recursive:true,force:true});}
