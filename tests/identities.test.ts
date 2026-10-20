import {it,expect} from 'vitest';
import {equation,c} from '../src/math/ast';
import {rat} from '../src/math/rational';
import {exactPoly,pEqual,sRoot,scalar,sMul,sEqual} from '../src/math/exact';
import {writeSquare,positiveSquareSum} from '../src/math/squares';
import {transform} from '../src/math/transformations';
import {equationText} from '../src/math/format';
import {campaign} from '../src/levels/campaign';
import {start,perform,validate,suggestion,undo} from '../src/gameplay/game';
import {restore,snapshot} from '../src/app/persistence';
import {solutionKey,solve,solutionText} from '../src/math/solve';
import {math,blocks} from '../src/ui/math';
it('prépare une différence de carrés avant de proposer son identité',()=>{
 const eq=equation('x^2-9=0');
 expect(()=>transform(eq,{kind:'difference-squares',ids:['l.0','l.1']})).toThrow(/carrés/);
 const prepared=transform(eq,{kind:'write-square',id:'l.1'}).equation;
 expect(equationText(prepared)).toBe('x² − (3)² = 0');
 expect(blocks(prepared.left,'l',['l.1'],[])).toContain('written-square');
 const factored=transform(prepared,{kind:'difference-squares',ids:['l.1','l.0']}).equation;
 expect(equationText(factored)).toBe('(x + 3)(x − 3) = 0');
 expect(pEqual(exactPoly(eq.left),exactPoly(factored.left))).toBe(true);
});
it('factorise 2x²−9 sans approximation et permet de résoudre chaque porte radicale',()=>{
 const level=campaign.find(l=>l.id==='w6-4')!,eq=equation('2x^2-9=0'),g=start({...level,initial:eq});
 perform(g,{kind:'write-square',id:'l.0'});perform(g,{kind:'write-square',id:'l.1'});
 expect(math(g.s.eq.left)).toContain('radical');
 perform(g,{kind:'difference-squares',ids:['l.0','l.1']});perform(g,{kind:'split'});
 expect(g.s.branches).toHaveLength(2);
 for(let i=0;i<15&&!g.won;i++){const tip=suggestion(g);if(tip.action)perform(g,tip.action);else validate(g);}
 expect(g.won).toBe(true);expect(solutionKey(g.s.answer!)).toBe(solutionKey(solve(eq)));
 expect(g.events.some(e=>e.kind==='drag'&&e.part==='algebraic-coefficient')).toBe(true);
});
it('propose x ou le facteur commun maximal sans perdre la racine zéro',()=>{
 const eq=equation('4x^2+2x=0'),ids=['l.0','l.1'];
 expect(equationText(transform(eq,{kind:'factor-common',ids}).equation)).toBe('x(4x + 2) = 0');
 const maximal=transform(eq,{kind:'factor-common',ids,maximal:true}).equation;
 expect(equationText(maximal)).toBe('2x(2x + 1) = 0');
 expect(solutionKey(solve(maximal))).toBe(solutionKey(solve(eq)));
 expect(()=>transform(equation('x^2+2=0'),{kind:'factor-common',ids})).toThrow();
});
it('complète les carrés non moniques en conservant exactement le polynôme et la compensation',()=>{
 for(let a=1;a<=7;a++)for(let b=-6;b<=6;b++)if(b){
  const eq=equation(`${a}x^2${b>0?'+':''}${b}x+3=0`),result=transform(eq,{kind:'complete-square',ids:['l.0','l.1']}).equation;
  expect(pEqual(exactPoly(eq.left),exactPoly(result.left))).toBe(true);
  expect(result.right).toEqual(eq.right);
  expect(result.left.kind).toBe('sum');
 }
 expect(()=>transform(equation('-2x^2+3x=0'),{kind:'complete-square',ids:['l.0','l.1']})).toThrow(/positif/);
});
it('ne confond jamais somme de carrés et absence de solution lorsque la constante vaut zéro',()=>{
 expect(positiveSquareSum(equation('(x+1)^2+4=0'))).toBe(true);
 expect(positiveSquareSum(equation('(x+1)^2=0'))).toBe(false);
 expect(positiveSquareSum(equation('-(x+1)^2+4=0'))).toBe(false);
 const level=campaign.find(l=>l.id==='w6-3')!,g=start(level);perform(g,{kind:'no-real'});expect(validate(g)).toBe('win');expect(solutionText(g.s.answer!)).toBe('S = ∅');
});
it('restaure chaque nouvelle identité, et rejoue les anciennes complétions sans changer leur sens',()=>{
 const g=start(campaign.find(l=>l.id==='w6-2')!);
 for(const action of [{kind:'complete-square',ids:['l.0','l.1']},{kind:'combine',ids:['l.1','l.2']},{kind:'write-square',id:'l.1'},{kind:'difference-squares',ids:['l.0','l.1']}] as const){
  perform(g,action as Parameters<typeof perform>[1]);expect(restore(snapshot(g,'campaign',0,0))!.game.s.eq).toEqual(g.s.eq);
 }
 const legacy=start(g.level);perform(legacy,{kind:'complete-square',ids:['l.0','l.1'],local:false});
 const old=snapshot(legacy,'campaign',0,0) as {events:Record<string,unknown>[]};delete old.events[0].local;
 expect(equationText(restore(old)!.game.s.eq)).toBe('(x − 5/2)² + 6 = 25/4');
 expect(undo(g)).toBe(true);expect(equationText(g.s.eq)).toBe('(x − 5/2)² − (1/2)² = 0');
});
it('affiche les fractions et les grandes racines avec une barre extensible',()=>{
 for(const q of [rat(2),rat(2,3),rat(99999989,99999971),rat(12345678901234567890123456789n,9876543210987654321n)]){
  const html=math({kind:'radical',radicand:q});expect(html).toContain('class="radicand"');expect(html).toContain('preserveAspectRatio="none"');if(q.d!==1n)expect(html).toContain('class="fraction"');
 }
 const root=writeSquare(equation('2x^2=0').left);expect(pEqual(exactPoly(root),exactPoly(equation('2x^2=0').left))).toBe(true);
});
it('ne donne plus de raccourci factorisation globale ou discriminant dans les indices',()=>{
 for(const level of campaign.filter(l=>l.world>=4)){
  const g=start(level);for(let i=0;i<60&&!g.won;i++){const tip=suggestion(g);if(tip.action){expect(['factor','delta','roots']).not.toContain(tip.action.kind);perform(g,tip.action);}else validate(g);}
  expect(g.won,level.id).toBe(true);
 }
});

it('restaure les racines manipulables à chaque étape d’un parcours irrationnel',()=>{
 const g=start(campaign.find(l=>l.id==='w6-6')!);
 for(let i=0;i<30&&!g.won;i++){
  const tip=suggestion(g);if(tip.action)perform(g,tip.action);else validate(g);
  const restored=restore(snapshot(g,'campaign',0,0));expect(restored).not.toBeNull();expect(restored!.game.s.eq).toEqual(g.s.eq);
 }
 expect(g.won).toBe(true);
});
it('restaure les anciennes extractions symboliques sans imposer des portes nouvelles',()=>{
 const level=campaign.find(l=>l.id==='w6-11')!,g=start(level);perform(g,{kind:'square-roots',exact:false});
 const old=snapshot(g,'campaign',0,0) as {events:Record<string,unknown>[]};delete old.events[0].exact;
 const recovered=restore(old)!.game;expect(recovered.s.branches).toHaveLength(0);expect(solutionKey(recovered.s.answer!)).toBe(solutionKey(solve(level.initial)));
});
