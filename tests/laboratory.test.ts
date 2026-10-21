import {it,expect} from 'vitest';
import {generatedSystem,getSystemLevel} from '../src/systems/generator';
import {generatedCurve,getCurveLevel} from '../src/curves/generator';
import {systemReady,systemHint,transformForMethod,verifySystem,systemKey} from '../src/systems/engine';
import {newSystemGame,systemSnapshot,readSystemSnapshot} from '../src/systems/save';
import {curveSnapshot,newCurveGame,readCurveGame} from '../src/curves/save';
import {curvePlan} from './shared/curve-plans';
import {expectedScalar,satisfiesCurve,verifyCurve} from '../src/curves/algebra';
import {decode,fresh} from '../src/app/persistence';
import {campaignStars,campaignCompleted} from '../src/levels/progression';
it('résout 600 systèmes linéaires générés par les gestes disponibles, dont les cas dégénérés',()=>{
 const kinds=new Set<string>(),keys=new Set<string>();
 for(const world of [2,3] as const)for(let seed=0;seed<300;seed++){
  const level=generatedSystem(world,seed);expect(getSystemLevel(level.id)).toEqual(level);keys.add(systemKey(level.rows));let rows=level.rows;
  for(let i=0;i<200&&!systemReady(rows);i++){const action=systemHint(rows,level.method).action;expect(action,level.id).toBeTruthy();rows=transformForMethod(rows,action!,level.method);}
  const solution=verifySystem(rows,level.rows);kinds.add(solution.kind);expect(solution.kind).toMatch(/unique|none|infinite/);
 }
 expect(kinds.size).toBe(3);expect(keys.size).toBeGreaterThan(500);
});
it('résout 120 intersections inédites exactement, avec tangences, quatre points et radicaux décalés',()=>{
 const templates=new Set<string>(),equations=new Set<string>();for(let seed=0;seed<120;seed++){
  const level=generatedCurve(seed);templates.add(level.template!);equations.add(JSON.stringify(level.curves));expect(getCurveLevel(level.id)).toEqual(level);
  expect(level.expected.every(p=>satisfiesCurve(level,p.map(expectedScalar) as any)),level.id).toBe(true);
  let plan;try{plan=curvePlan(level);}catch(e){throw Error(level.id+' / '+level.template+' / '+JSON.stringify(level.curves)+' / '+String(e));}expect(verifyCurve(level,plan.state)).toHaveLength(level.expected.length);expect(plan.moves,level.id).toBeLessThanOrEqual(level.budget);
 }
 expect(templates.size).toBe(12);expect(equations.size).toBeGreaterThan(115);
});
it('rejoue une partie générée et ses brouillons sans ajouter de résultat de campagne',()=>{
 const save=fresh(),linear=newSystemGame(generatedSystem(3,23).id),action=systemHint(linear.rows,'choice').action!;
 linear.rows=transformForMethod(linear.rows,action,'choice');linear.events.push(action);linear.moves++;
 save.systems.active=systemSnapshot(linear);expect(readSystemSnapshot(save.systems.active)?.rows).toEqual(linear.rows);
 const level=generatedCurve(15),plan=curvePlan(level),curve=newCurveGame(level.id);curve.actions=plan.prep;curve.draft={kind:'reduce',row:plan.problems[0].row,events:plan.problems[0].events.slice(0,1),moves:1,errors:0,hints:0};save.curves.active=curveSnapshot(curve);
 expect(readCurveGame(save.curves.active)?.draft?.events.length).toBe(1);const restored=decode(JSON.stringify(save));expect(restored.systems.active?.level).toBe(linear.level);expect(restored.curves.active?.level).toBe(curve.level);expect(campaignStars(restored)).toBe(0);expect(campaignCompleted(restored)).toBe(0);
 for(const id of ['ps1-4-3','ps1-2-4294967296','ps1-3--1','ps1-2-01'])expect(getSystemLevel(id)).toBeUndefined();for(const id of ['pc1-4294967296','pc1--1','pc1-01'])expect(getCurveLevel(id)).toBeUndefined();
});
