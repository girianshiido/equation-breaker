import { it, expect } from 'vitest';
import { equation } from '../src/math/ast';
import { squareCompletion } from '../src/math/squares';
import { transform } from '../src/math/transformations';
import { equationText } from '../src/math/format';
import { str } from '../src/math/rational';
import { solve, solutionKey, solutionText } from '../src/math/solve';
import { campaign } from '../src/levels/campaign';
import { start, perform, validate, suggestion } from '../src/gameplay/game';
import { restore, snapshot } from '../src/app/persistence';
it('complète x² − 5x avec 25/4 et conserve les termes non sélectionnés', () => {
    const eq = equation('x^2-5x+6=0'), ids = ['l.0', 'l.1'];
    expect(str(squareCompletion(eq, ids).added)).toBe('25/4');
    const next = transform(eq, { kind: 'complete-square', ids });
    expect(equationText(next.equation)).toBe('(x − 5/2)² − 25/4 + 6 = 0');
    expect(solutionKey(solve(next.equation))).toBe(solutionKey(solve(eq)));
});
it('complète un carré à droite et accepte les coefficients positifs non moniques et rejette les sélections entre membres', () => {
    expect(str(squareCompletion(equation('0=x^2+3x+1'), ['r.0', 'r.1']).added)).toBe('9/4');
    expect(str(squareCompletion(equation('2x^2-5x=0'), ['l.0', 'l.1']).added)).toBe('25/8');
    expect(() => squareCompletion(equation('x^2=5x'), ['l', 'r'])).toThrow();
});
it('résout entièrement le trinôme par carré complété et racines, et restaure cette méthode', () => {
    const g = start(campaign.find(l => l.id === 'w6-2')!);
    perform(g, { kind: 'complete-square', ids: ['l.0', 'l.1'] });
    expect(equationText(g.s.eq)).toBe('(x − 5/2)² − 25/4 + 6 = 0');
    perform(g,{kind:'combine',ids:['l.1','l.2']});
    expect(equationText(g.s.eq)).toBe('(x − 5/2)² − 1/4 = 0');
    perform(g,{kind:'write-square',id:'l.1'});
    perform(g,{kind:'difference-squares',ids:['l.0','l.1']});
    expect(equationText(g.s.eq)).toBe('(x − 2)(x − 3) = 0');
    perform(g, { kind: 'split' });
    expect(g.s.branches).toHaveLength(2);
    perform(g, { kind: 'drag', id: 'l.1', part: 'term' }); validate(g);
    expect(g.s.branch).toBe(1);
    perform(g, { kind: 'drag', id: 'l.1', part: 'term' }); expect(validate(g)).toBe('win');
    expect(solutionText(g.s.answer!)).toBe('S = { 2 ; 3 }');
    expect(restore(snapshot(g, 'campaign', 0, 0))?.game.s).toEqual(g.s);
    expect(validate(g)).toBe('win');
});
for (const [source, answer] of [['(x+1)^2=2', 'S = { −1−√2 ; −1+√2 }'], ['(x+1)^2=0', 'S = { −1 }'], ['(x+1)^2=-2', 'S = ∅']]) it(`extrait exactement les racines de ${source}`, () => {
    const level = { ...campaign.find(l => l.id === 'w6-2')!, initial: equation(source) }, g = start(level);
    perform(g, { kind: 'square-roots' });
    for(let i=0;i<15&&!g.won;i++){const tip=suggestion(g);if(tip.action)perform(g,tip.action);else validate(g);}
    expect(solutionText(g.s.answer!)).toBe(answer); expect(validate(g)).toBe('win');
});
