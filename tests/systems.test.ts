import { constant, variable, expressionSum, fromAffine, hasVariable } from '../src/systems/expression';
import { rowText } from '../src/systems/render';
import { expect, it, vi } from 'vitest';
import { rat, str, zero } from '../src/math/rational';
import { makeRows, calculateSystemNumbers, manualSystemMoves, rowHasVariable, factorAction, displayParts, scaleByInteger, transformSystem, reduceSystem, systemReady, verifySystem, systemHint, systemKey, canSubstitute, satisfies } from '../src/systems/engine';
import { systemLevels, systemInitialRows } from '../src/systems/levels';
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
it('résout les 30 niveaux par des opérations proposées et conserve toutes les solutions',()=>{
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


it('saisit un coefficient entier, négatif ou fractionnaire sans toucher aux autres lignes',()=>{
 for(const value of ['2','-1','-3','3/4','-3/4']){
  let rows=makeRows([[2,4,8],[1,1,5]]);rows=transformSystem(rows,{kind:'scale',row:0,factor:value});
  const before=rows,key=systemKey(rows),q=str(displayParts(rows[0]).leftVariables[0]);
  const next=transformSystem(rows,factorAction(0,rows[0],'left',0,'coefficient'));
  expect(displayParts(next[0]).leftVariables.map(str)).toEqual(['1','2']);expect(str(displayParts(next[0]).rightConstant)).toBe('4');
  expect(next[1]).toEqual(before[1]);expect(systemKey(next)).toBe(key);expect(q).not.toBe('1');
 }
});
it('saisit séparément le numérateur ou le dénominateur, aussi dans le membre droit',()=>{
 let rows=transformSystem(makeRows([[3,6,12],[1,1,5]]),scaleByInteger(0,'divide','4'));
 const numerator=transformSystem(rows,factorAction(0,rows[0],'left',0,'numerator'));
 expect(displayParts(numerator[0]).leftVariables.map(str)).toEqual(['1/4','1/2']);expect(str(displayParts(numerator[0]).rightConstant)).toBe('1');
 const denominator=transformSystem(rows,factorAction(0,rows[0],'left',0,'denominator'));
 expect(displayParts(denominator[0]).leftVariables.map(str)).toEqual(['3','6']);expect(str(displayParts(denominator[0]).rightConstant)).toBe('12');
 rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:0});
 const right=transformSystem(rows,factorAction(0,rows[0],'right',0,'coefficient'));
 expect(displayParts(right[0]).rightVariables.map(str)).toEqual(['1','0']);expect(str(displayParts(right[0]).rightConstant)).toBe('-4');expect(systemKey(right)).toBe(systemKey(rows));
 expect(()=>transformSystem(rows,{kind:'factor',row:0,side:'right',variable:0,part:'coefficient',value:'99'})).toThrow(/changé/);
 expect(()=>factorAction(0,rows[0],'left',0,'coefficient')).toThrow();
});
it('ajoute et soustrait aux deux membres puis extrait le dénominateur d’une constante',()=>{
 let rows=makeRows([[1,0,2],[0,2,8]]),original=rows;
 rows=transformSystem(rows,{kind:'offset',row:1,operand:'-2/3'});let p=displayParts(rows[1]);
 expect(str(p.leftConstant)).toBe('-2/3');expect(str(p.rightConstant)).toBe('22/3');expect(rows[0]).toEqual(original[0]);
 rows=transformSystem(rows,factorAction(1,rows[1],'left',null,'denominator'));p=displayParts(rows[1]);
 expect(str(p.leftConstant)).toBe('-2');expect(str(p.rightConstant)).toBe('22');expect(p.leftVariables.map(str)).toEqual(['0','6']);expect(systemKey(rows)).toBe(systemKey(original));
 expect(()=>transformSystem(rows,{kind:'offset',row:1,operand:'0'})).toThrow();
});
it('restaure les opérations et les prises de facteurs après sauvegarde',()=>{
 const game=newSystemGame('s2');const offset={kind:'offset' as const,row:1,operand:'-3/4'};
 for(const action of [offset,factorAction(1,transformSystem(game.rows,offset)[1],'left',null,'denominator')]){game.rows=transformSystem(game.rows,action);game.events.push(action);game.moves++;}
 expect(readSystemSnapshot(systemSnapshot(game))?.rows).toEqual(game.rows);
});


it('substitue littéralement sans développer ni fusionner, puis laisse chaque étape au joueur',()=>{
 let rows=makeRows([[1,-1,1],[2,1,7]]);rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});const source=rows[0],key=systemKey(rows);
 rows=transformSystem(rows,{kind:'substitute',row:0,variable:0});const substituted=rows;
 expect(rowText(rows[1])).toBe('2(y + 1) + y = 7');expect(systemReady(rows)).toBe(false);expect(rows[0]).toEqual(source);
 rows=transformSystem(rows,{kind:'expand',row:1,side:'left',term:0});expect(rowText(rows[1])).toBe('2y + 2 + y = 7');expect(rowText(substituted[1])).toBe('2(y + 1) + y = 7');
 rows=transformSystem(rows,{kind:'merge',row:1,side:'left',terms:[0,2]});expect(rowText(rows[1])).toBe('3y + 2 = 7');expect(systemKey(rows)).toBe(key);
 expect(()=>transformSystem(rows,{kind:'merge',row:1,side:'left',terms:[0,1]})).toThrow(/semblables/);
});
it('remplace toutes les occurrences sur les deux membres, même quand elles se compensent',()=>{
 let rows=makeRows([[1,-1,1],[0,1,5]]);rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});
 rows[1]={...rows[1],layout:{rightVariables:[rat(1),rat(0)],leftConstant:rat(0)},written:{left:expressionSum([variable(0),variable(1)]),right:expressionSum([variable(0),constant(rat(5))])}};
 expect(rowHasVariable(rows[1],0)).toBe(true);const source=rows[0],key=systemKey(rows);
 rows=transformSystem(rows,{kind:'substitute',row:0,variable:0});
 expect(rowText(rows[1])).toBe('y + 1 + y = y + 1 + 5');expect(hasVariable(rows[1].written!.left,0)||hasVariable(rows[1].written!.right,0)).toBe(false);expect(rows[0]).toEqual(source);expect(systemKey(rows)).toBe(key);expect(systemReady(rows)).toBe(false);
});
it('conserve le produit numérique après remplacement d’une valeur',()=>{
 let rows=makeRows([[1,0,3],[2,1,7]]);rows=transformSystem(rows,{kind:'substitute',row:0,variable:0});
 expect(rowText(rows[1])).toBe('2 × 3 + y = 7');expect(systemReady(rows)).toBe(false);
 rows=transformSystem(rows,{kind:'expand',row:1,side:'left',term:0});expect(rowText(rows[1])).toBe('6 + y = 7');
 rows=transformSystem(rows,{kind:'written-move',row:1,side:'left',term:0});expect(rowText(rows[1])).toBe('y = 7 − 6');expect(systemReady(rows)).toBe(false);
 rows=transformSystem(rows,{kind:'merge',row:1,side:'right',terms:[0,1]});expect(rowText(rows[1])).toBe('y = 1');expect(verifySystem(rows,makeRows([[1,0,3],[2,1,7]])).values.map(str)).toEqual(['3','1']);
});
it('les gestes sur un produit substitué gardent ses parenthèses et les autres lignes',()=>{
 let rows=makeRows([[1,-1,1],[2,1,7]]);rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});rows=transformSystem(rows,{kind:'substitute',row:0,variable:0});const key=systemKey(rows),source=rows[0];
 const divided=transformSystem(rows,factorAction(1,rows[1],'left',null,'coefficient',0));expect(rowText(divided[1])).toBe('y + 1 + 1/2y = 7/2');expect(divided[0]).toEqual(source);expect(systemKey(divided)).toBe(key);
 const moved=transformSystem(rows,{kind:'written-move',row:1,side:'left',term:0});expect(rowText(moved[1])).toBe('y = 7 − 2(y + 1)');expect(systemKey(moved)).toBe(key);
});
it('sauvegarde les parenthèses, les occurrences et chaque développement ou fusion',()=>{
 const game=newSystemGame('s3');for(const action of [{kind:'move' as const,row:0,side:'left' as const,variable:1},{kind:'substitute' as const,row:0,variable:0},{kind:'expand' as const,row:1,side:'left' as const,term:0}]){game.rows=transformSystem(game.rows,action);game.events.push(action);game.moves++;}
 const restored=readSystemSnapshot(systemSnapshot(game))!;expect(restored.rows).toEqual(game.rows);expect(rowText(restored.rows[1])).toBe('y + 1 + y = 7');
});


it('fusionne automatiquement le terme transposé sans réduire une substitution',()=>{
 const rows=makeRows([[5,0,5],[0,1,3]]);rows[0]={...rows[0],layout:{rightVariables:[rat(0),rat(0)],leftConstant:rat(-3)},written:{left:fromAffine([rat(5),rat(0)],rat(-3)),right:constant(rat(2))}};
 const next=transformSystem(rows,{kind:'written-move',row:0,side:'left',term:1,merge:true});
 expect(rowText(next[0])).toBe('5x = 5');expect(next[1]).toEqual(rows[1]);expect(systemKey(next)).toBe(systemKey(rows));expect(rowText(rows[0])).toBe('5x − 3 = 2');
 let substituted=transformSystem(makeRows([[1,0,3],[2,1,7]]),{kind:'substitute',row:0,variable:0});expect(rowText(substituted[1])).toBe('2 × 3 + y = 7');
 substituted=transformSystem(substituted,{kind:'expand',row:1,side:'left',term:0});substituted=transformSystem(substituted,{kind:'written-move',row:1,side:'left',term:0,merge:true});expect(rowText(substituted[1])).toBe('y = 1');expect(systemReady(substituted)).toBe(true);
});
it('fusionne les monômes à l’arrivée, dans les deux sens et avec des fractions',()=>{
 for(const side of ['left','right'] as const){
  const row=makeRows([[0,1,5]])[0];row.written={left:expressionSum([fromAffine([rat(2,3),rat(0)],rat(0)),variable(1)]),right:expressionSum([fromAffine([rat(2,3),rat(0)],rat(0)),constant(rat(5))])};row.layout={rightVariables:[rat(2,3),rat(0)],leftConstant:rat(0)};
  const next=transformSystem([row],{kind:'written-move',row:0,side,term:0,merge:true});expect(rowText(next[0])).toBe('y = 5');expect(systemKey(next)).toBe(systemKey([row]));
 }
});
it('ne développe aucun groupe lors de la fusion consécutive à un déplacement',()=>{
 let rows=makeRows([[1,-1,1],[2,1,7]]);rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});rows=transformSystem(rows,{kind:'substitute',row:0,variable:0});
 rows=transformSystem(rows,{kind:'offset',row:1,operand:'-3'});const next=transformSystem(rows,{kind:'written-move',row:1,side:'left',term:2,merge:true});
 expect(rowText(next[1])).toBe('2(y + 1) + y = 7');expect(rowText(rows[1])).toBe('2(y + 1) + y − 3 = 7 − 3');
});
it('rejoue les anciens déplacements et fusions et conserve la nouvelle fusion automatique',()=>{
 const old={level:'s1',events:[{kind:'substitute',row:0,variable:0},{kind:'written-move',row:1,side:'left',term:0},{kind:'merge',row:1,side:'right',terms:[0,1]}],moves:3,errors:0,hints:0};
 const previous=readSystemSnapshot(old)!;expect(previous).not.toBeNull();expect(rowText(previous.rows[1])).toBe('y = 3');
 const current=readSystemSnapshot({...old,events:[old.events[0],{...old.events[1],merge:true}],moves:2})!;
 expect(rowText(current.rows[1])).toBe('y = 3');expect(systemSnapshot(current).events.at(-1)).toMatchObject({merge:true});
});


it('calcule automatiquement 3+1 et 2×3+1 après substitution, sans étape supplémentaire',()=>{
 for(const coefficient of [1,2]){
  let rows=makeRows([[1,-coefficient,1],[0,1,3]]);rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});
  const source=rows[1],raw=transformSystem(rows,{kind:'substitute',row:1,variable:1}),next=transformSystem(rows,{kind:'substitute',row:1,variable:1,numeric:true});
  expect(rowText(raw[0])).toBe(coefficient===1?'x = 3 + 1':'x = 2 × 3 + 1');expect(rowText(next[0])).toBe(coefficient===1?'x = 4':'x = 7');expect(next[1]).toEqual(source);expect(systemKey(next)).toBe(systemKey(rows));expect(systemReady(next)).toBe(true);
 }
});
it('ne réduit que les sous-expressions numériques et conserve les développements symboliques',()=>{
 let rows=makeRows([[1,-1,1],[2,1,7]]);rows=transformSystem(rows,{kind:'move',row:0,side:'left',variable:1});
 const next=transformSystem(rows,{kind:'substitute',row:0,variable:0,numeric:true});expect(rowText(next[1])).toBe('2(y + 1) + y = 7');
 const numeric=transformSystem(makeRows([[1,0,3],[2,1,7]]),{kind:'substitute',row:0,variable:0,numeric:true});expect(rowText(numeric[1])).toBe('6 + y = 7');
});
it('termine les calculs numériques anciens, négatifs ou fractionnaires sans distribuer un groupe',()=>{
 const rows=makeRows([[1,0,2],[0,1,3]]);rows[0].written={left:variable(0),right:expressionSum([constant(rat(-3)),constant(rat(5))])};
 expect(rowText(calculateSystemNumbers(rows)[0])).toBe('x = 2');expect(rowText(rows[0])).toBe('x = -3 + 5');
 rows[0].written.right=expressionSum([constant(rat(-1,3)),constant(rat(5,6))]);expect(rowText(calculateSystemNumbers(rows)[0])).toBe('x = 1/2');
});
it('enregistre un calcul automatique sans gonfler le nombre de transformations et rejoue son résultat',()=>{
 const game=newSystemGame('s3');for(const action of [{kind:'move' as const,row:0,side:'left' as const,variable:1},{kind:'substitute' as const,row:0,variable:0},{kind:'numeric' as const}]){game.rows=transformSystem(game.rows,action);game.events.push(action);}
 game.moves=manualSystemMoves(game.events);expect(game.moves).toBe(2);const replay=readSystemSnapshot(systemSnapshot(game))!;expect(replay.moves).toBe(2);expect(replay.rows).toEqual(game.rows);
 const current=newSystemGame('s2');for(const action of [{kind:'substitute' as const,row:0,variable:1,numeric:true as const}]){current.rows=transformSystem(current.rows,action);current.events.push(action);current.moves++;}expect(readSystemSnapshot(systemSnapshot(current))!.events[0]).toMatchObject({numeric:true});
});


it('sépare les deux mondes, varie les couples et conserve les fractions sur les deux membres',()=>{
 expect(systemLevels.filter(l=>l.world===2)).toHaveLength(21);expect(systemLevels.filter(l=>l.world===3)).toHaveLength(9);
 expect(systemLevels.map(l=>l.world)).toEqual([...Array(21).fill(2),...Array(9).fill(3)]);
 const pairs=systemLevels.filter(l=>l.world===2).map(l=>reduceSystem(l.rows)).filter(r=>r.kind==='unique').map(r=>r.values.map(str).join(';'));
 expect(pairs.filter(p=>p==='2;3')).toHaveLength(1);expect(new Set(pairs).size).toBeGreaterThanOrEqual(17);
 expect(pairs.some(p=>p.startsWith('0;'))).toBe(true);expect(pairs.some(p=>p.includes('/'))).toBe(true);expect(pairs.some(p=>p.split(';').every(x=>x.startsWith('-')))).toBe(true);
 const level=systemLevels.find(l=>l.id==='s28')!;expect(rowText(level.rows[0])).toBe('1/3x + 2 = 1/4y − 1/3');expect(reduceSystem(level.rows).values.map(str)).toEqual(['-4','4']);
});
it('ouvre le monde suivant après le dernier 2×2 et garde les anciens niveaux acquis accessibles',()=>{
 const data=decodeSystems({});const index=systemLevels.findIndex(l=>l.world===3);
 expect(systemUnlocked(data,index)).toBe(false);data.results.s30={stars:1,moves:20,errors:0,hints:0};expect(systemUnlocked(data,index)).toBe(true);
 delete data.results.s30;data.results.s20={stars:3,moves:18,errors:0,hints:0};expect(systemUnlocked(data,index)).toBe(true);expect(systemUnlocked(data,index+1)).toBe(true);
});
it('reprend une ancienne équation mise à jour sans changer ses solutions ni ses étoiles',()=>{
 const old={level:'s7',events:[{kind:'add',source:0,target:1}],moves:1,hints:0,errors:0};
 const game=readSystemSnapshot(old)!;expect(game.revision).toBe(1);expect(reduceSystem(game.rows).values.map(str)).toEqual(['2','3']);
 expect(readSystemSnapshot(systemSnapshot(game))?.rows).toEqual(game.rows);
 const current=newSystemGame('s7');expect(current.revision).toBe(2);expect(reduceSystem(current.rows).values.map(str)).toEqual(['-2','5']);
 expect(systemKey(systemInitialRows(systemLevels.find(l=>l.id==='s7')!,1))).toBe(systemKey(game.rows));
 const data=decodeSystems({results:{s7:{stars:3,moves:7,hints:0,errors:0}},active:old});expect(data.results.s7.stars).toBe(3);expect(readSystemSnapshot(data.active)?.revision).toBe(1);
 expect(readSystemSnapshot({...old,revision:99})).toBeNull();
});
