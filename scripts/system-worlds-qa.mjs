import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const profile=await mkdtemp(join(tmpdir(),'equation-worlds-'));
const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.QA_URL||'http://127.0.0.1:5202/';
async function fixture(systems){await page.evaluate(systems=>{const save=JSON.parse(localStorage.getItem('equation-breaker-v1'));save.systems=systems;save.prefs.explainSteps=false;localStorage.setItem('equation-breaker-v1',JSON.stringify(save));localStorage.removeItem('equation-breaker-systems-v1');},systems);await page.reload();}
const result={stars:3,moves:5,hints:0,errors:0};
try{
 await page.goto(url+'#systems');await page.locator('[data-system-level="s1"]').click();await page.locator('#sys-back').click();
 await page.locator('[data-system-world="3"]').click();assert.equal(await page.locator('[data-system-level]').count(),9);assert.equal(await page.locator('[data-system-level]:enabled').count(),0);assert.match(await page.locator('.sys-world-locked').innerText(),/Termine le monde/);
 await fixture({results:{s18:result},active:null,wheelMode:'multiply'});await page.locator('[data-system-world="2"]').click();assert.ok(await page.locator('[data-system-level="s28"]').isEnabled());await page.locator('[data-system-world="3"]').click();assert.ok(await page.locator('[data-system-level="s19"]').isDisabled());
 await fixture({results:{s30:result},active:null,wheelMode:'multiply'});await page.locator('[data-system-world="3"]').click();assert.ok(await page.locator('[data-system-level="s19"]').isEnabled());checks.push('World 3 locked until the last 2×2, not the previous s18 boundary');
 await fixture({results:{s20:result},active:null,wheelMode:'divide'});await page.locator('[data-system-world="3"]').click();assert.ok(await page.locator('[data-system-level="s19"]').isEnabled());assert.ok(await page.locator('[data-system-level="s20"]').isEnabled());checks.push('Already acquired 3×3 levels survive the new boundary');
 const old={level:'s7',events:[{kind:'add',source:0,target:1}],moves:1,errors:0,hints:0};
 await fixture({results:{s7:result},active:old,wheelMode:'multiply'});await page.locator('#sys-resume').click();assert.match(await page.locator('[data-system-row="1"] .sys-equation').getAttribute('aria-label'),/3x = 6/);
 await page.locator('#sys-history').click();assert.match(await page.locator('.sys-history').innerText(),/5/);await page.locator('#sys-modal-close').click();await page.locator('#sys-undo').click();assert.match(await page.locator('[data-system-row="1"] .sys-equation').getAttribute('aria-label'),/2x − y = 1/);
 await page.locator('#sys-restart').click();await page.locator('#sys-confirm-restart').click();assert.match(await page.locator('[data-system-row="1"] .sys-equation').getAttribute('aria-label'),/2x − y = -9/);checks.push('Legacy game keeps its original equation through resume, history and undo; restart uses new version');
 await page.locator('#sys-back').click();
 const solved={level:'s7',events:[{kind:'isolate',row:0,variable:0},{kind:'substitute',row:0,variable:0,numeric:true},{kind:'move',row:1,side:'left',variable:null},{kind:'scale',row:1,factor:'-1/3'},{kind:'substitute',row:1,variable:1,numeric:true}],moves:5,hints:0,errors:0};
 await fixture({results:{s7:result},active:solved,wheelMode:'multiply'});await page.locator('#sys-resume').click();await page.locator('#sys-validate').click();assert.equal(await page.locator('.sys-solution').getAttribute('aria-label'),'S = { (2 ; 3) }');checks.push('Validation uses original legacy solutions, not revised level solutions');
 const results=Object.fromEntries(Array.from({length:30},(_,i)=>[`s${i+1}`,result]));
 await fixture({results,active:null,wheelMode:'multiply'});
 for(const size of [{width:320,height:480},{width:360,height:640},{width:390,height:844},{width:568,height:320},{width:1280,height:800}]){
  await page.setViewportSize(size);await page.locator('[data-system-world="2"]').click();
  for(const id of ['s28','s29','s30']){
   await page.locator(`[data-system-level="${id}"]`).click();await page.evaluate(()=>document.fonts.ready);await page.locator('#sys-board').scrollIntoViewIfNeeded();
   const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,sides:[...document.querySelectorAll('.sys-side')].map(e=>({available:e.clientWidth,needed:e.firstElementChild.getBoundingClientRect().width})),equals:[...document.querySelectorAll('.sys-equal')].map(e=>e.getBoundingClientRect().x)}));
   assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));assert.ok(geometry.sides.every(s=>s.needed<=s.available+2),id+JSON.stringify(geometry));assert.ok(Math.abs(geometry.equals[0]-geometry.equals[1])<1);
   if(id==='s28'&&size.width===390)await page.screenshot({path:'test-results/systems-two-members.png',fullPage:true});
   await page.locator('#sys-back').click();
  }
 }
 checks.push('Fractions and two-member equations fit at 320, 360, 390, landscape and desktop; equality column aligned');
 await page.setViewportSize({width:1280,height:800});await page.screenshot({path:'test-results/systems-world-map.png',fullPage:false});
 await page.locator('[data-system-world="3"]').click();await page.screenshot({path:'test-results/systems-three-world-map.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile('test-results/system-worlds-report.json',JSON.stringify({success:true,checks,errors},null,2));console.log(JSON.stringify({success:true,checks,errors},null,2));
}finally{await context.close();await rm(profile,{recursive:true,force:true});}
