import { it, expect } from 'vitest';
import { campaign } from '../src/levels/campaign';
import { equation } from '../src/math/ast';
import { start, perform, validate, suggestion, visibleBranchIndices, undo } from '../src/gameplay/game';
import { restore, snapshot } from '../src/app/persistence';
import { zeroBranches } from '../src/math/transformations';
import { equationText } from '../src/math/format';
import { solutionText } from '../src/math/solve';

it('valide une porte, passe à la suivante et réunit les solutions au dernier clic', () => {
    const g = start(campaign.find(l => l.id === 'w5-1')!);
    perform(g, {kind:'split'});
    const before = snapshot(g, 'campaign', 0, 0);
    expect(() => validate(g)).toThrow(/Isole x/);
    expect(g.events).toHaveLength((before as {events:unknown[]}).events.length);
    perform(g, {kind:'drag',id:'l.1',part:'term'});
    expect(validate(g)).toBe('branch');
    expect(g.s.branch).toBe(1); expect(g.s.completed[0]).not.toBeNull(); expect(g.s.completed[1]).toBeNull(); expect(g.won).toBe(false);
    const resumed = restore(snapshot(g, 'campaign', 0, 0))!.game;
    expect(resumed.s).toEqual(g.s);
    perform(resumed, {kind:'drag',id:'l.1',part:'term'});
    expect(validate(resumed)).toBe('win');
    expect(resumed.events.slice(-2).map(e=>e.kind)).toEqual(['confirm-branch','collect']);
    expect(solutionText(resumed.s.answer!)).toBe('S = { −3 ; 2 }');
});
it('choisit la porte inachevée même si la seconde a été résolue en premier', () => {
    const g = start(campaign.find(l => l.id === 'w5-1')!);
    perform(g, {kind:'split'}); perform(g, {kind:'branch',index:1}); perform(g, {kind:'drag',id:'l.1',part:'term'});
    expect(validate(g)).toBe('branch'); expect(g.s.branch).toBe(0);
    perform(g, {kind:'drag',id:'l.1',part:'term'}); expect(validate(g)).toBe('win');
});
it('réunit sans doublon les racines doubles et termine une porte unique', () => {
    const level = campaign.find(l => l.id === 'w5-1')!;
    for (const source of ['(x-2)(x-2)=0','(x-2)^2=0']) {
        const g = start({...level, initial:equation(source)}); perform(g,{kind:'split'});
        expect(g.s.branches).toHaveLength(1);
        for(let i=0;i<12&&!g.won;i++) { const tip=suggestion(g); if(tip.action) perform(g,tip.action); else validate(g); }
        expect(g.won).toBe(true); expect(solutionText(g.s.answer!)).toBe('S = { 2 }');
    }
});
it('les 72 niveaux restent résolubles avec la progression automatique des portes', () => {
    for(const level of campaign) {
        const g=start(level);
        for(let i=0;i<60&&!g.won;i++) { const tip=suggestion(g); if(tip.action) perform(g,tip.action); else validate(g); }
        expect(g.won,level.id).toBe(true);
    }
});

it('ouvre une seule porte pour un carré nul et garde deux portes pour des facteurs distincts', () => {
    for(const source of ['(x-2)^2=0','0=(x-2)^2','(x-2)(x-2)=0','(2x-4)(x-2)=0','3(x-2)^2=0'])
        expect(zeroBranches(equation(source)),source).toHaveLength(1);
    expect(zeroBranches(equation('(x-2)(x+2)=0'))).toHaveLength(2);
    const g=start(campaign.find(l=>l.id==='w5-4')!);
    perform(g,{kind:'split'});
    expect(equationText(g.s.eq)).toBe('x − 2 = 0');
    const saved=snapshot(g,'campaign',0,0);
    expect(restore(saved)!.game.s.branches).toHaveLength(1);
    expect(undo(g)).toBe(true); expect(g.s.branches).toHaveLength(0);
    perform(g,{kind:'split'}); perform(g,{kind:'drag',id:'l.1',part:'term'});
    expect(validate(g)).toBe('win'); expect(solutionText(g.s.answer!)).toBe('S = { 2 }');
});
it('reprend une ancienne seconde porte sans afficher ni imposer le doublon', () => {
    const g=start(campaign.find(l=>l.id==='w5-4')!);
    perform(g,{kind:'split',distinct:false}); perform(g,{kind:'branch',index:1});
    const saved=snapshot(g,'campaign',0,0) as {events:Record<string,unknown>[]};
    delete saved.events[0].distinct;
    const resumed=restore(saved)!.game;
    expect(resumed.s.branch).toBe(1); expect(visibleBranchIndices(resumed.s)).toEqual([1]);
    perform(resumed,{kind:'drag',id:'l.1',part:'term'}); expect(validate(resumed)).toBe('win');
    expect(solutionText(resumed.s.answer!)).toBe('S = { 2 }');
    expect(restore(snapshot(resumed,'campaign',0,0))!.game.s.answer).toEqual(resumed.s.answer);
});
