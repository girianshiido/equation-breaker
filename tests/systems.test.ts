import { expect, it, vi } from 'vitest';
import { rat, str, zero } from '../src/math/rational';
import { makeRows, displayParts, scaleByInteger, transformSystem, reduceSystem, systemReady, verifySystem, systemHint, systemKey, canSubstitute, satisfies } from '../src/systems/engine';
import { systemLevels } from '../src/systems/levels';
import { decodeSystems, newSystemGame, readSystemSnapshot, systemSnapshot, systemUnlocked } from '../src/systems/save';
import { decode, fresh, persist, load, KEY } from '../src/app/persistence';
it('refuse 0 et 1, accepte −1, les autres négatifs et les fractions',()=>{
 const rows=makeRows([[1,1,5],[2,-1,1]]),key=systemKey(rows);
 for(const factor of ['0','1','0/5','7/7'])expect(()=>transformSystem(rows,{kind:'scale',row:0,factor})).toThrow();
 for(const factor of ['-1','-2','-1/2','2/3','2'])expect(systemKey(transformSystem(rows,{kind:'scale',row:0,factor}))).toBe(key);
 expect(rows[0].coefficients.map(str)).toEqual(['1','1']);
});
it('additionne membre à membre et conserve exactement la ligne de départ',()=>{
 const rows=makeRows([[1,1,5],[2,-1,1]]),next=transformSystem(rows,{kind:'add',source:0,target:1});
 expect(next[0]).toEqual(rows[0]);expect(next[1].coefficients.map(str)).toEqual(['3','0']);expect(str(next[1].right)).toBe('6');expect(systemKey(next)).toBe(systemKey(rows));
 expect(()=>transformSystem(rows,{kind:'add',source:0,target:0})).toThrow();
});
it('isole une variable et substitue une expression entière dans les autres lignes',()=>{
 const rows=makeRows([[1,-1,1],[1,1,7]]),isolated=transformSystem(rows,{kind:'isolate',row:0,variable:0});
 expect(isolated[0].isolated).toBe(0);expect(canSubstitute(isolated[0],0)).toBe(true);
 const next=transformSystem(isolated,{kind:'substitute',row:0,variable:0});expect(next[0]).toEqual(isolated[0]);expect(next[1].coefficients.map(str)).toEqual(['0','2']);expect(str(next[1].right)).toBe('6');
 expect(systemKey(next)).toBe(systemKey(rows));
});
it('remplace simultanément dans deux autres équations sans changer la définition',()=>{
 const rows=transformSystem(makeRows([[1,-1,0,1],[1,1,1,6],[2,-1,1,5]]),{kind:'isolate',row:0,variable:0});
 const next=transformSystem(rows,{kind:'substitute',row:0,variable:0});
 expect(next[0]).toEqual(rows[0]);expect(next.slice(1).every(r=>zero(r.coefficients[0]))).toBe(true);expect(next[1].coefficients.map(str)).toEqual(['0','2','1']);expect(next[2].coefficients.map(str)).toEqual(['0','1','1']);expect(systemKey(next)).toBe(systemKey(rows));
});
it('interdit la substitution sans variable isolée et les chemins hors limites',()=>{
 const rows=makeRows([[2,1,7],[1,1,5]]);
 expect(()=>transformSystem(rows,{kind:'substitute',row:0,variable:0})).toThrow(/Isole/);
 expect(()=>transformSystem(rows,{kind:'isolate',row:-1,variable:0})).toThrow();
 expect(()=>transformSystem(rows,{kind:'isolate',row:0,variable:4})).toThrow();
 expect(()=>transformSystem(rows,{kind:'add',source:0,target:NaN})).toThrow();
});
it('distingue une solution unique, une contradiction et une infinité, sans validation prématurée',()=>{
 const unique=makeRows([[1,1,5],[2,-1,1]]);expect(reduceSystem(unique).values.map(str)).toEqual(['2','3']);expect(systemReady(unique)).toBe(false);expect(()=>verifySystem(unique,unique)).toThrow(/Continue/);
 const none=makeRows([[1,2,4],[0,0,2]]);expect(verifySystem(none,none).kind).toBe('none');
 const line=makeRows([[1,-2,3],[0,0,0]]);expect(verifySystem(line,line).kind).toBe('infinite');expect(reduceSystem(line).free).toEqual([1]);
 const r2=makeRows([[0,0,0],[0,0,0]]);expect(verifySystem(r2,r2).free).toHaveLength(2);
 expect(()=>verifySystem(makeRows([[1,0,99],[0,1,3]]),unique)).toThrow(/mêmes solutions/);
});
it('résout les 21 niveaux par des opérations proposées et conserve toutes les solutions',()=>{
 const moves:Record<string,number>={};
 for(const level of systemLevels){let rows=level.rows,count=0,key=systemKey(rows);
  for(;count<100&&!systemReady(rows);count++){const hint=systemHint(rows,level.method);expect(hint.action,`${level.id}: ${hint.text}`).toBeTruthy();rows=transformSystem(rows,hint.action!);expect(systemKey(rows),level.id).toBe(key);}
  expect(systemReady(rows),level.id).toBe(true);const answer=verifySystem(rows,level.rows);if(answer.kind==='unique')expect(satisfies(level.rows,answer.values)).toBe(true);
  moves[level.id]=count;expect(count,`${level.id} budget ${level.budget}`).toBeLessThanOrEqual(level.budget);
 }
});
it('préserve les systèmes lors de centaines de combinaisons exactes avec fractions et signes',()=>{
 for(let seed=1;seed<=100;seed++){
  const x=seed%7-3,y=seed%5-2,a=seed%4+1,b=seed%3-1,c=(seed+1)%5+1,d=seed%5-2;
  let rows=makeRows([[a,b,a*x+b*y],[c,d,c*x+d*y]]);const key=systemKey(rows);
  for(let i=0;i<6;i++){rows=transformSystem(rows,{kind:'scale',row:i%2,factor:i%2?'-2/3':'3/2'});rows=transformSystem(rows,{kind:'add',source:i%2,target:1-i%2});expect(systemKey(rows)).toBe(key);expect(satisfies(rows,[rat(x),rat(y)])).toBe(true);}
 }
});
it('reprend les substitutions, les multiplicateurs et le choix ×/÷ après export et import',()=>{
 const game=newSystemGame('s20');for(const action of [{kind:'isolate' as const,row:0,variable:0},{kind:'substitute' as const,row:0,variable:0}]){game.rows=transformSystem(game.rows,action);game.events.push(action);game.moves++;}
 const data=decodeSystems({results:{s1:{stars:3,moves:2,hints:0,errors:0}},active:systemSnapshot(game),wheelMode:'divide'});
 const save=fresh();save.systems=data;const decoded=decode(JSON.stringify(save));expect(decoded.systems).toEqual(data);expect(readSystemSnapshot(decoded.systems.active)?.rows).toEqual(game.rows);
 expect(systemUnlocked(data,1)).toBe(true);expect(systemUnlocked(data,2)).toBe(false);expect(decode(JSON.stringify({version:1,prefs:{}})).systems.active).toBeNull();
 expect(readSystemSnapshot({level:'s20',events:[{kind:'scale',row:0,factor:'0'}]})).toBeNull();expect(readSystemSnapshot({level:'unknown',events:[]})).toBeNull();
});
it('rejette une croissance excessive avant de modifier le système',()=>{
 let rows=makeRows([[1,1,5],[2,-1,1]]);for(let i=0;i<9;i++)rows=transformSystem(rows,{kind:'scale',row:0,factor:'99999999'});
 const before=systemKey(rows);expect(()=>transformSystem(rows,{kind:'scale',row:0,factor:'99999999'})).toThrow(/trop grands/);expect(systemKey(rows)).toBe(before);
});

it('conserve la progression systèmes quand une ancienne version réécrit la sauvegarde principale',()=>{
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});
 try{const save=fresh();save.systems.results.s1={stars:3,moves:2,errors:0,hints:0};expect(persist(save)).toBe(true);const old=JSON.parse(storage.get(KEY)!);delete old.systems;storage.set(KEY,JSON.stringify(old));expect(load().save.systems.results.s1.stars).toBe(3);expect(persist(fresh())).toBe(true);expect(load().save.systems.results).toEqual({});}finally{vi.unstubAllGlobals();}
});

it('additionne les membres affichés sans déplacer automatiquement un terme',()=>{
 const original=makeRows([[1,0,2],[5,1,13]]);const rows=transformSystem(original,{kind:'move',row:1,side:'left',variable:0});
 const before=displayParts(rows[1]);expect(before.leftVariables.map(str)).toEqual(['0','1']);expect(before.rightVariables.map(str)).toEqual(['-5','0']);
 const next=transformSystem(rows,{kind:'add',source:0,target:1}),shown=displayParts(next[1]);
 expect(next[0]).toEqual(rows[0]);expect(shown.leftVariables.map(str)).toEqual(['1','1']);expect(shown.rightVariables.map(str)).toEqual(['-5','0']);expect(str(shown.rightConstant)).toBe('15');expect(systemKey(next)).toBe(systemKey(original));
});
it('la substitution conserve les constantes dans leur membre et demande leur déplacement manuel',()=>{
 const rows=makeRows([[1,0,2],[1,1,5]]);const next=transformSystem(rows,{kind:'substitute',row:0,variable:0});const shown=displayParts(next[1]);
 expect(str(shown.leftConstant)).toBe('2');expect(str(shown.rightConstant)).toBe('5');expect(systemReady(next)).toBe(false);expect(canSubstitute(next[1],1)).toBe(false);
 const moved=transformSystem(next,{kind:'move',row:1,side:'left',variable:null});expect(systemReady(moved)).toBe(true);expect(verifySystem(moved,rows).values.map(str)).toEqual(['2','3']);
});
it('substitue une inconnue isolée dans le membre droit',()=>{
 const rows=makeRows([[-1,0,-2],[1,1,5]]);let next=transformSystem(rows,{kind:'move',row:0,side:'left',variable:0});next=transformSystem(next,{kind:'move',row:0,side:'right',variable:null});expect(canSubstitute(next[0],0)).toBe(true);
 next=transformSystem(next,{kind:'substitute',row:0,variable:0});expect(str(next[1].right)).toBe('3');expect(str(displayParts(next[1]).leftConstant)).toBe('2');expect(systemKey(next)).toBe(systemKey(rows));
});
it('la molette accepte uniquement les entiers et note correctement la division',()=>{
 for(const operation of ['multiply','divide'] as const)for(const value of ['0','1','1/2','-1/2','3/2'])expect(()=>scaleByInteger(0,operation,value)).toThrow();
 const action=scaleByInteger(0,'divide','-2');expect(action).toMatchObject({factor:'-1/2',operand:'-2',operation:'divide'});
 const initial=makeRows([[2,4,6],[1,1,5]]),rows=transformSystem(initial,action);expect(rows[0].coefficients.map(str)).toEqual(['-1','-2']);expect(str(rows[0].right)).toBe('-3');
});
it('ne valide pas une dépendance tant que des variables restent affichées dans les deux membres',()=>{
 let rows=makeRows([[1,-1,0],[2,-2,0]]);const original=rows;rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});rows=transformSystem(rows,scaleByInteger(0,'multiply','-2'));rows=transformSystem(rows,{kind:'add',source:0,target:1});expect(systemReady(rows)).toBe(false);rows=transformSystem(rows,{kind:'move',row:1,side:'left',variable:1});expect(systemReady(rows)).toBe(true);expect(verifySystem(rows,original).kind).toBe('infinite');
});
