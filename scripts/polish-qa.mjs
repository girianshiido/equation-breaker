import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const url = process.env.QA_URL || 'http://127.0.0.1:5194/';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await context.addInitScript(() => {
    if (localStorage.getItem('polish-fixture')) return;
    const results = {}; for (let w=1;w<=6;w++) for(let n=1;n<=12;n++) results[`w${w}-${n}`]={stars:1,moves:20,time:10000,methods:[]};
    localStorage.setItem('equation-breaker-v1',JSON.stringify({version:1,results,prefs:{motion:true,sound:false},active:null}));localStorage.setItem('polish-fixture','1');
});
const page=await context.newPage(), errors=[],report=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('test-results',{recursive:true});
async function open(id){if(await page.locator('#pause').count()){await page.locator('#pause').click();await page.locator('#leave').click();}else await page.locator('[data-screen="worlds"]:visible').first().click();await page.locator(`[data-world="${+id[1]-1}"]`).click();await page.locator(`[data-level="${id}"]`).click();await page.evaluate(()=>document.fonts.ready);}
async function geometry(id){const r=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,center:r.y+r.height/2};};return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,left:rect('.left-plate .blocks'),right:rect('.right-plate .blocks'),equal:rect('.equal-sign'),sizes:[...document.querySelectorAll('.blocks .block:not(.group)')].map(e=>getComputedStyle(e).fontSize),font:getComputedStyle(document.querySelector('.block')).fontFamily,loaded:document.fonts.check('450 32px Outfit'),uiLoaded:document.fonts.check('500 14px "DM Sans"')};});assert.ok(r.scrollWidth<=r.width+1,`${id}: page overflow`);assert.ok(Math.abs(r.left.center-r.equal.center)<2,`${id}: left/equal ${JSON.stringify(r)}`);assert.ok(Math.abs(r.right.center-r.equal.center)<2,`${id}: right/equal ${JSON.stringify(r)}`);assert.ok(r.loaded&&r.uiLoaded);assert.ok(new Set(r.sizes).size<=1,`Inconsistent term sizes ${JSON.stringify(r.sizes)}`);assert.match(r.font,/Outfit/);report.push({id,...r});}
try{
 await page.goto(url);await page.locator('#play').waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'test-results/polish-home.png',fullPage:true});
 for(const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1440,height:900},{width:844,height:390}]){
  await page.setViewportSize(size);for(const id of ['w1-5','w3-4','w4-6','w5-3','w6-2']){await open(id);await geometry(`${id} ${size.width}×${size.height}`);}
  await open('w1-5');await page.screenshot({path:`test-results/polish-${size.width}x${size.height}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await open('w1-5');
 const from=await page.locator('[data-node="l.1"]').boundingBox(),to=await page.locator('.right-plate').boundingBox();await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:10});await page.waitForSelector('.drop-over');
 const start=performance.now();await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#moves').textContent==='1');const mergeMs=performance.now()-start;assert.ok(mergeMs<600,`Reduction too slow ${mergeMs}`);report.push({test:'drop to reduced result',mergeMs});
 assert.deepEqual(errors,[]);await writeFile('test-results/polish-report.json',JSON.stringify({url,errors,report},null,2));console.log(JSON.stringify({passed:true,alignmentChecks:report.length-1,mergeMs,errors},null,2));
}catch(error){await page.screenshot({path:'test-results/polish-failure.png',fullPage:true});console.log(await page.locator('body').innerText());throw error;}finally{await browser.close();}
