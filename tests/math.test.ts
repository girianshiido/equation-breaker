import { describe, it, expect } from 'vitest';
import { rat, add, mul, div, str, readRational } from '../src/math/rational';
import { equation, parse, c } from '../src/math/ast';
import { normalize, same } from '../src/math/normalize';
import { solve, solutionText, solutionKey } from '../src/math/solve';
import { transform, zeroBranches } from '../src/math/transformations';
import { format, equationText } from '../src/math/format';
import { campaign } from '../src/levels/campaign';
import { generated } from '../src/levels/generator';
import { start, perform, validate, suggestion, score, undo } from '../src/gameplay/game';
import { decode, fresh, snapshot, restore } from '../src/app/persistence';
describe('Arithmétique exacte', () => {
    it('normalise signes et pgcd', () => { expect(str(rat(6, -8))).toBe('-3/4'); expect(str(rat(0, -3))).toBe('0'); expect(str(add(rat(1, 3), rat(1, 6)))).toBe('1/2'); expect(str(div(rat(-2, 3), rat(4, 5)))).toBe('-5/6'); expect(() => rat(1, 0)).toThrow(); expect(() => readRational('x')).toThrow(); });
    it('préserve les grands entiers', () => expect(str(add(rat(9007199254740993n), rat(1)))).toBe('9007199254740994'));
});
const cases: [
    string,
    string
][] = [['x+3=8', 'S = { 5 }'], ['-2x=10', 'S = { −5 }'], ['3x+2=x+10', 'S = { 4 }'], ['2x+3=2x+8', 'S = ∅'], ['3x+3=3x+3', 'S = ℝ'], ['3(x-2)+5=2x+7', 'S = { 8 }'], ['x/3-x/2=1', 'S = { −6 }'], ['(x-2)(x+3)=0', 'S = { −3 ; 2 }'], ['(x-2)^2=0', 'S = { 2 }'], ['x^2+1=0', 'S = ∅'], ['2x^2-3x-2=0', 'S = { −1/2 ; 2 }'], ['x^2-2=0', 'S = { −√2 ; √2 }'], ['x^2+2x-1=0', 'S = { −1−√2 ; −1+√2 }'], ['x^2-4x+4=0', 'S = { 2 }']];
for (const [source, result] of cases)
    it(`résout ${source}`, () => expect(solutionText(solve(equation(source)))).toBe(result));
it('annule les facteurs négatifs des groupes quand les membres sont multipliés ou divisés', () => {
    for (const kind of ['multiply', 'divide'] as const) for (const [source, expected] of [
        ['-(x+2)=4', 'x + 2 = −4'],
        ['-2(x+2)=-4', '2(x + 2) = 4'],
        ['5-(x+2)=4', '−5 + x + 2 = −4'],
        ['4=-(x+2)', '−4 = x + 2'],
        ['-(x+2)/2=4', '1/2(x + 2) = −4'],
    ]) {
        const eq = equation(source), result = transform(eq, { kind, constant: rat(-1) }).equation;
        expect(equationText(result)).toBe(expected);
        expect(solutionKey(solve(result))).toBe(solutionKey(solve(eq)));
    }
});
it('développe le moins devant une parenthèse', () => { const tr = transform(equation('-(x+2)=4'), { kind: 'expand', id: 'l' }); expect(equationText(tr.equation)).toBe('−x − 2 = 4'); });
it('préserve les membres avec aperçu miroir', () => { const tr = transform(equation('3x-1=2x+7'), { kind: 'add', expression: parse('-2x') }); expect(equationText(tr.equation)).toBe('x − 1 = 7'); expect(tr.mirror).toContain('−2x'); });
it('fusionne seulement une même somme', () => { const eq = equation('3x-2x+5=11'); expect(equationText(transform(eq, { kind: 'combine', ids: ['l.0', 'l.1'] }).equation)).toBe('x + 5 = 11'); expect(() => transform(eq, { kind: 'combine', ids: ['l.0', 'r'] })).toThrow(); expect(() => transform(eq, { kind: 'combine', ids: ['l.0', 'l.2'] })).toThrow(); });
it('rejette les opérations interdites sans mutation', () => { const eq = equation('x+3=8'), before = equationText(eq); expect(() => transform(eq, { kind: 'divide', constant: rat(0) })).toThrow(/diviser par 0/); expect(() => transform(eq, { kind: 'multiply', constant: rat(0) })).toThrow(/équivalence/); expect(() => parse('x/(x-1)')).toThrow(); expect(() => normalize(parse('x^2*x'))).toThrow(); expect(equationText(eq)).toBe(before); });
it('simplifie et factorise par identité exacte', () => { const eq = equation('(2x-1)/3=5'); expect(same(normalize(transform(eq, { kind: 'simplify', id: 'l' }).equation.left), normalize(eq.left))).toBe(true); const f = transform(equation('2x^2-3x-2=0'), { kind: 'factor', id: 'l' }); expect(solutionText(solve(f.equation))).toBe('S = { −1/2 ; 2 }'); expect(zeroBranches(f.equation)).toHaveLength(2); });
it('refuse la victoire prématurée', () => expect(() => validate(start(campaign[0]))).toThrow(/pas encore résolue/));
for (const level of campaign)
    it(`parcours complet ${level.id} : ${level.source}`, () => { const g = start(level); for (let i = 0; i < 50 && !g.won; i++) {
        const tip = suggestion(g);
        if (tip.action)
            perform(g, tip.action);
        else
            validate(g);
    } expect(g.won).toBe(true); expect(g.moves).toBeLessThanOrEqual(level.budget); expect(score(g)).toBe(3); });
it('génère et résout 1800 équations reproductibles et accessibles', () => { for (let w = 0; w < 6; w++)
    for (let seed = 0; seed < 300; seed++) {
        const level = generated(w, seed);
        expect(level.source).toBe(generated(w, seed).source);
        expect(solutionKey(solve(level.initial))).toBe(solutionKey(level.expected));
        const g = start(level);
        for (let i = 0; i < 55 && !g.won; i++) {
            const tip = suggestion(g);
            if (tip.action)
                perform(g, tip.action);
            else
                validate(g);
        }
        expect(g.won, `${w}/${seed} ${level.source} ${equationText(g.s.eq)}`).toBe(true);
    } });
it('1200 transformations aléatoires préservent les solutions', () => { for (let seed = 1; seed <= 300; seed++) {
    const eq = generated(seed % 4, seed).initial;
    let now = eq;
    for (const a of [{ kind: 'add', expression: parse(`${seed % 7 + 1}x`) } as const, { kind: 'add', expression: c(rat(-seed, 7)) } as const, { kind: 'multiply', constant: rat(-3, 2) } as const, { kind: 'divide', constant: rat(5, 7) } as const])
        now = transform(now, a).equation;
    expect(solutionKey(solve(now))).toBe(solutionKey(solve(eq)));
} });
it('annulation conserve le décompte et la sauvegarde reconstruit le modèle', () => { const g = start(campaign[0]); perform(g, { kind: 'add', expression: c(-3) }); expect(restore(snapshot(g, 'campaign', 0, 0))?.game.s.eq).toEqual(g.s.eq); expect(undo(g)).toBe(true); expect(g.moves).toBe(1); expect(equationText(g.s.eq)).toBe(equationText(campaign[0].initial)); });
it('récupère les sauvegardes corrompues et borne les compteurs', () => { expect(decode('{oops')).toEqual(fresh()); expect(decode('{"version":9}').results).toEqual({}); expect(decode('{"version":1,"stats":{"wins":-3},"prefs":{"sound":"yes"}}').stats.wins).toBe(0); expect(restore({ events: [{ kind: 'divide', constant: '0' }], level: 'w1-1' })).toBe(null); });
it('restaure les branches validées et leur union à chaque étape', () => { const g = start(campaign.find(l => l.id === 'w5-1')!); for (let i = 0; i < 30 && !g.won; i++) {
    const tip = suggestion(g);
    if (tip.action)
        perform(g, tip.action);
    else
        validate(g);
    if (!g.won) {
        const r = restore(snapshot(g, 'campaign', 0, 0));
        expect(r, JSON.stringify(g.events.map(e => e.kind))).not.toBeNull();
        expect(r!.game.s).toEqual(g.s);
    }
} expect(g.won).toBe(true); });
it('les radicaux restent exacts après changement de coefficient', () => { const e = equation('x^2+2x-1=0'); const scaled = transform(e, { kind: 'multiply', constant: rat(-7, 3) }); expect(solutionKey(solve(scaled.equation))).toBe(solutionKey(solve(e))); });

it('masque les noms des membres par défaut et conserve le choix dans les sauvegardes', () => {
    expect(fresh().prefs.memberLabels).toBe(false);
    expect(decode(JSON.stringify({ version: 1, prefs: { sound: true } })).prefs).toMatchObject({ sound: true, memberLabels: false });
    expect(decode(JSON.stringify({ version: 1, prefs: { memberLabels: true } })).prefs.memberLabels).toBe(true);
    expect(decode(JSON.stringify({ version: 1, prefs: { memberLabels: 'oui' } })).prefs.memberLabels).toBe(false);
});
