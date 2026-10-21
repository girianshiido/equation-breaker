import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createServer} from 'vite';import {chromium} from 'playwright';
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const {fresh}=await vite.ssrLoadModule('/src/app/persistence.ts'),{campaignStages}=await vite.ssrLoadModule('/src/levels/progression.ts');
const {getSystemLevel}=await vite.ssrLoadModule('/src/systems/generator.ts'),{getCurveLevel}=await vite.ssrLoadModule('/src/curves/generator.ts');
const {systemReady,systemHint,transformSystem,reduceSystem}=await vite.ssrLoadModule('/src/systems/engine.ts'),{solutionText}=await vite.ssrLoadModule('/src/systems/render.ts');
const {curvePlan}=await vite.ssrLoadModule('/tests/shared/curve-plans.ts');await vite.close();
const profile=await mkdtemp(join(tmpdir(),'equation-laboratory-')),context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const url=process.env.QA_URL||'http://127.0.0.1:5202/';let currentLevel={method:'choice'};
await page.addInitScript(()=>{window.qaSeed=Number(sessionStorage.getItem('qa-seed')||0);crypto.getRandomValues=array=>{array[0]=window.qaSeed++;sessionStorage.setItem('qa-seed',String(window.qaSeed));return array;};});
async function laboratory(){await page.locator('.brand').click();await page.locator('[data-screen="practice"]:visible').first().click();}
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('equation-breaker-v1')));
const variable=async(row,j)=>await page.locator(`[data-system-row="${row}"] [data-variable="${j}"]`).click();
async function dragTerm(selector,row,side){
 await page.locator('#sys-board').scrollIntoViewIfNeeded();const from=await page.locator(selector).boundingBox(),to=await page.locator(`[data-system-row="${row}"] .sys-${side==='left'?'right':'left'}`).boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(from.x+from.width/2+10,from.y+from.height/2);await page.locator('.sys-term-ghost').waitFor();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:5});await page.mouse.up();
}
async function act(action){
 if(currentLevel.method==='substitution'&&(action.kind==='scale'||action.kind==='add'))return legacyFixture(action);
 if(action.kind==='factor'){
  await page.locator(`[data-system-row="${action.row}"] [data-side="${action.side}"]${action.term===undefined?`[data-system-term="${action.variable===null?'constant':action.variable}"]`:`[data-written-term="${action.term}"]`}`).click();
  await page.locator(`[data-pick-system-factor="${action.part}"]`).click();await page.locator('#sys-apply-factor').click();
 }else  if(action.kind==='scale'){
  const factor=action.factor.split('/'),operation=action.operation||(factor[1]?'divide':'multiply'),operand=action.operand||(factor[1]?(factor[0]==='-1'?'-':'')+factor[1]:factor[0]);
  await page.locator(`[data-handle="${action.row}"]`).click();await page.locator(`[data-wheel-mode="${operation}"]`).click();await page.locator('#sys-wheel-input').fill(operand);await page.locator('#sys-wheel-input').press('Enter');
 }else if(action.kind==='add'){await page.locator(`[data-system-row="${action.source}"] [data-variable]`).first().click();await page.locator(`[data-add="${action.target}"]`).click();}
 else if(action.kind==='move'){await dragTerm(`[data-system-row="${action.row}"] [data-system-term="${action.variable===null?'constant':action.variable}"][data-side="${action.side}"]`,action.row,action.side);}
 else if(action.kind==='written-move'){await dragTerm(`[data-system-row="${action.row}"] [data-written-term="${action.term}"][data-side="${action.side}"]`,action.row,action.side);}
 else if(action.kind==='expand'){await page.locator(`[data-system-row="${action.row}"] [data-written-term="${action.term}"][data-side="${action.side}"]`).click();await page.locator('#sys-expand').click();}
 else if(action.kind==='merge'){for(const i of action.terms)await page.locator(`[data-system-row="${action.row}"] [data-written-term="${i}"][data-side="${action.side}"]`).click();await page.locator('#sys-merge').click();}
 else if(action.kind==='substitute'){await variable(action.row,action.variable);await page.locator(`[data-substitute="${action.variable}"]`).click();}
 else throw Error('Automatic isolation must never be exposed.');
 await page.waitForFunction(()=>!document.querySelector('.sys-modal'));
 await page.waitForFunction(()=>!document.querySelector('.sys-game[data-numeric-preview="true"]'));

}

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

try{
 await mkdir('test-results',{recursive:true});await page.goto(url+'#laboratory');assert.equal(await page.locator('[data-train]').count(),9);for(const i of [6,7,8])assert.equal(await page.locator(`[data-train="${i}"]`).isDisabled(),true);assert.deepEqual(await page.locator('.training-card strong').allTextContents(),['Équilibre','Face-à-face','Explosion','Fractions','Produit nul','Second degré','Systèmes · 2 × 2','Systèmes · 3 × 3','Systèmes · second degré']);checks.push('Nine training cards, French names and campaign prerequisites');
 const fixture=fresh();fixture.prefs.motion=false;for(const l of campaignStages.slice(0,114)){if(l.kind==='equation')fixture.results[l.id]={stars:1,moves:1,time:0,methods:[]};else fixture.systems.results[l.id]={stars:1,moves:1,errors:0,hints:0};}
 await page.evaluate(s=>localStorage.setItem('equation-breaker-v1',JSON.stringify(s)),fixture);await page.reload();const baseline=await saved();await page.screenshot({path:'test-results/laboratory-mobile.png',fullPage:true});
 for(const [card,seed] of [[6,0],[7,7]]){
  await page.evaluate(seed=>window.qaSeed=seed,seed);await page.locator(`[data-train="${card}"]`).click();let snapshot=(await saved()).systems.active;assert.match(snapshot.level,/^ps1-/);assert.match(await page.locator('.sys-heading').innerText(),/LABORATOIRE/);const level=getSystemLevel(snapshot.level);let rows=level.rows;const actions=[];while(!systemReady(rows)){const action=systemHint(rows,'choice').action;if(!action)throw Error('No next gesture');actions.push(action);rows=transformSystem(rows,action);}for(let i=0;i<actions.length;i++){await act(actions[i]);if(i===0){await page.reload();await page.locator('#lab-resume-system').click();assert.equal((await saved()).systems.active.level,snapshot.level);}}
  await page.locator('#sys-validate').click();assert.equal(await page.locator('.sys-solution').getAttribute('aria-label'),solutionText(reduceSystem(rows)));assert.equal((await saved()).systems.active,null);await page.locator('#sys-next').click();assert.notEqual((await saved()).systems.active.level,snapshot.level);await page.locator('#sys-back').click();assert.equal(await page.locator('[data-train]').count(),9);checks.push(`Generated ${level.world}×${level.world}: actual gestures, reload, exact validation, next and return to laboratory`);
 }
 for(const seed of [0,6]){
  await page.evaluate(seed=>window.qaSeed=seed,seed);await page.locator('[data-train="8"]').click();const id=(await saved()).curves.active.level,level=getCurveLevel(id),plan=curvePlan(level);assert.match(id,/^pc1-/);for(const e of plan.prep)await prepAction(e);await page.locator(`[data-curve-reduce="${plan.problems[0].row}"]`).click();
  for(let index=0;index<plan.problems.length;index++){const problem=plan.problems[index];assert.match(await page.locator('.game-heading').innerText(),/LABORATOIRE/);for(let i=0;i<problem.events.length;i++){await classicAction(problem.events[i]);if(seed===6&&index===0&&i===1){await page.reload();await page.locator('#lab-resume-curve').click();assert.equal((await saved()).curves.active.level,id);assert.equal(await page.locator('.game').count(),1);}}if(problem.events.at(-1)?.kind!=='collect')await page.locator('#validate').click();}
  assert.ok(await page.locator('.sys-result').isVisible());assert.equal((await saved()).curves.active,null);await page.locator('#curve-next').click();assert.notEqual((await saved()).curves.active.level,id);await page.locator('#curve-back').click();checks.push(`Generated intersections seed ${seed}: real substitution and identities, exact couples, next and draft recovery`);
 }
 const final=await saved();assert.deepEqual(final.results,baseline.results);assert.deepEqual(final.systems.results,baseline.systems.results);assert.deepEqual(final.curves.results,baseline.curves.results);checks.push('Training never changes campaign stars or unlocks its next level');
 await page.locator('.brand').click();await page.locator('[data-screen="worlds"]:visible').first().click();assert.deepEqual((await page.locator('.world-card > strong').allTextContents()).slice(3,6),['Fractions','Produit nul','Second degré']);
 await page.locator('[data-world="0"]').click();assert.equal(await page.locator('[data-level="w1-1"]').isDisabled(),false);await page.locator('[data-level="w1-1"]').click();assert.equal(await page.locator('#arena').count(),1);checks.push('Earlier completed campaign levels remain directly replayable');
 await laboratory();for(const size of [{width:320,height:568},{width:568,height:320},{width:1280,height:800}]){await page.setViewportSize(size);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);await writeFile('test-results/laboratory-report.json',JSON.stringify({success:true,checks,errors},null,2));console.log(JSON.stringify({success:true,checks,errors},null,2));
}catch(e){await page.screenshot({path:'test-results/laboratory-failure.png',fullPage:true});await writeFile('test-results/laboratory-failure.txt',await page.locator('body').innerText());throw e;}finally{await context.close();await rm(profile,{recursive:true,force:true});}
