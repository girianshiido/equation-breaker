import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {unlockEquations,classicIds} from './qa-campaign-fixture.mjs';
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const {curveLevels}=await vite.ssrLoadModule('/src/curves/levels.ts'),{curvePlan}=await vite.ssrLoadModule('/tests/shared/curve-plans.ts');
const {scalarExpr}=await vite.ssrLoadModule('/src/math/exact.ts'),{format}=await vite.ssrLoadModule('/src/math/format.ts');
const plans=curveLevels.map(l=>({...curvePlan(l),id:l.id,title:l.title,answer:curvePlan(l).state.reduction.points.map(p=>p.map(v=>format(scalarExpr(v))))}));await vite.close();
const profile=await mkdtemp(join(tmpdir(),'curve-qa-'));const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));const url=process.env.QA_URL||'http://127.0.0.1:5202/';
async function select(id){const node=page.locator(`[data-node="${id}"]`);if(await node.count())await node.click();else await page.locator(`[data-whole="${id}"]`).press('Enter');}
async function classicAction(e){
 if(e.kind==='confirm-branch'){await page.locator('#validate').click();return;}
 if(e.kind==='branch'||e.kind==='collect')return;
 if(e.kind==='drag'){await select(e.id);await page.locator(e.part==='term'?'#opposite':e.part==='denominator'?'#denominator':e.part==='algebraic-coefficient'?'#exact-coefficient':'#coefficient').click();}
 else if(['complete-square','difference-squares','factor-common'].includes(e.kind)){for(const id of e.ids)await select(id);await page.locator(e.kind==='factor-common'?(e.maximal&&await page.locator('#factor-common').count()?'#factor-common':'#factor-x'):`#${e.kind}`).click();}
 else if(e.kind==='write-square'){await select(e.id);await page.locator('#write-square').click();}
 else if(['expand','simplify','factor'].includes(e.kind)){await select(e.id);await page.locator(`#${e.kind}`).click();}
 else if(e.kind==='combine'){for(const id of e.ids)await select(id);await page.locator('#combine').click();}
 else if(e.kind==='multiply'&&e.constant==='-1')await page.locator('#negate').click();
 else if(['add','multiply','divide'].includes(e.kind)){await page.locator('#operation').click();await page.locator('#op-kind').selectOption(e.kind);await page.locator('#operand').fill(e.constant??e.expression);await page.locator('#operation-form button[type=submit]').click();}
 else await page.locator(`#${e.kind}`).click();
 if(await page.locator('#apply').count())await page.locator('#apply').click();await page.waitForFunction(()=>document.querySelector('.game')?.getAttribute('aria-busy')!=='true');
}
async function prepAction(e){
 if(e.kind==='scale'){await page.locator(`[data-curve-handle="${e.row}"]`).click();if(e.operation==='divide')await page.locator('[data-curve-mode="divide"]').click();await page.locator('#curve-wheel-value').fill(e.value);await page.locator('#curve-wheel button[type=submit]').click();}
 else if(e.kind==='move'){const from=page.locator(`[data-curve-row="${e.row}"] [data-side="${e.side}"][data-curve-term="${e.term}"]`),to=page.locator(`[data-curve-row="${e.row}"] .sys-${e.side==='left'?'right':'left'}`);await page.locator('#curve-board').scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();}
 else if(e.kind==='add'){await page.locator('#curve-board').scrollIntoViewIfNeeded();const a=await page.locator(`[data-curve-handle="${e.source}"]`).boundingBox(),b=await page.locator(`[data-curve-row="${e.target}"]`).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();}
 else if(e.kind==='substitute'){await page.locator(`[data-curve-row="${e.row}"] [data-curve-term]`).first().click();await page.locator(`[data-curve-substitute="${e.variable}"]`).click();}
 else if(e.kind==='expand')await page.locator('#curve-expand').click();
}
async function geometry(label){const r=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,terms:[...document.querySelectorAll('.sys-side')].map(el=>({w:el.clientWidth,needed:el.firstElementChild.getBoundingClientRect().width}))}));assert.ok(r.scroll<=r.w+1,label+JSON.stringify(r));assert.ok(r.terms.every(t=>t.needed<=t.w+2),label+JSON.stringify(r));}
try{
 await mkdir('test-results',{recursive:true});await page.goto(url);await unlockEquations(page);await page.evaluate(()=>{const save=JSON.parse(localStorage.getItem('equation-breaker-v1'));for(let i=1;i<=42;i++)save.systems.results[`s${i}`]={stars:1,moves:100,errors:0,hints:0};for(let i=1;i<=12;i++)save.curves.results[`c${i}`]={stars:1,moves:100,errors:0,hints:0};save.prefs.explainSteps=false;save.prefs.motion=false;localStorage.setItem('equation-breaker-v1',JSON.stringify(save));});await page.reload();await page.goto(url+'#world-9');
 assert.equal(await page.locator('[data-curve-level]').count(),12);assert.equal(await page.locator('canvas').count(),0);
 for(const plan of plans){console.log('Système du second degré',plan.id);if(!await page.locator('[data-curve-level]').count()){if(await page.locator('#curve-result-worlds').count())await page.locator('#curve-result-worlds').click();else await page.locator('#curve-result-worlds').click();await page.locator('[data-world="8"]').click();}await page.locator(`[data-curve-level="${plan.id}"]`).click();await geometry(plan.id);for(const e of plan.prep)await prepAction(e);await page.locator(`[data-curve-reduce="${plan.problems[0].row}"]`).click();
  for(let index=0;index<plan.problems.length;index++){const problem=plan.problems[index];assert.ok(await page.locator('.game').count(),plan.id+' problem '+index);if(problem.variable===1)assert.doesNotMatch(await page.locator('.arena').innerText(),/x/);for(let i=0;i<problem.events.length;i++){await classicAction(problem.events[i]);if(plan.id==='c1'&&index===0&&i===1){await page.reload();await page.locator('#curve-resume').click();assert.equal(await page.locator('.game').count(),1);}}
   if(problem.events.at(-1)?.kind!=='collect')await page.locator('#validate').click();
  }
  const text=await page.locator('.sys-solution').innerText();assert.match(text,/S/);const result=await page.evaluate(id=>JSON.parse(localStorage.getItem('equation-breaker-v1')).curves.results[id],plan.id);assert.equal(result.stars,3,plan.id);assert.equal(result.errors,0);assert.equal(result.hints,0);assert.equal(result.moves,plan.moves);if(['c3','c5','c7','c10'].includes(plan.id))await page.screenshot({path:`test-results/curves-${plan.id}-result.png`,fullPage:true});if(plan.id==='c10'){await page.setViewportSize({width:320,height:568});const fit=await page.locator('.sys-solution').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(fit.scroll<=fit.width+1);await page.screenshot({path:'test-results/curves-four-points-320.png',fullPage:true});await page.setViewportSize({width:390,height:844});}checks.push({test:plan.id,passed:true,moves:plan.moves,points:plan.answer.length});
 }
 await page.locator('#curve-result-worlds').click();await page.locator('[data-world="8"]').click();
 for(const size of [{width:320,height:480},{width:360,height:640},{width:390,height:844},{width:568,height:320},{width:1280,height:800}]){await page.setViewportSize(size);await page.locator('[data-curve-level="c12"]').click();await geometry(`c12 ${size.width}`);await page.locator('#curve-back').click();}
 assert.deepEqual(errors,[]);await writeFile('test-results/curves-report.json',JSON.stringify({success:true,checks,errors},null,2));console.log(JSON.stringify({success:true,checks,errors},null,2));
}catch(e){await page.screenshot({path:'test-results/curves-failure.png',fullPage:true});await writeFile('test-results/curves-failure.txt',await page.locator('body').innerText());throw e;}finally{await context.close();await rm(profile,{recursive:true,force:true});}
