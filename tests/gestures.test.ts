import { describe, it, expect } from 'vitest';
import { equation, nodeAt } from '../src/math/ast';
import { gesturePlan, gripValue } from '../src/math/gestures';
import { transform } from '../src/math/transformations';
import { equationText, format } from '../src/math/format';
import { solve, solutionKey } from '../src/math/solve';
import { normalize, same } from '../src/math/normalize';
import { generated } from '../src/levels/generator';
import { campaign } from '../src/levels/campaign';
import { start, perform, undo } from '../src/gameplay/game';
import { restore, snapshot } from '../src/app/persistence';

describe('Manipulations progressives', () => {
    it('retire le terme choisi et inverse son signe sans toucher au modèle de départ', () => {
        const eq = equation('3x+5=-3'), before = equationText(eq), p = gesturePlan(eq, 'l.1', 'term');
        expect(format(p.inFlightSource)).toBe('3x');
        expect(equationText(p.landing)).toBe('3x = −3 − 5');
        expect(equationText(p.result)).toBe('3x = −8');
        expect(equationText(eq)).toBe(before);
        expect(transform(eq, p.action).equation).toEqual(p.result);
    });
    it('divise tout le membre de départ pendant le trajet, puis tout le membre d’arrivée au dépôt', () => {
        const eq = equation('3x+5=-3'), p = gesturePlan(eq, 'l.0', 'coefficient');
        expect(format(p.inFlightSource)).toBe('x + 5/3');
        expect(p.landing.right.kind).toBe('fraction');
        expect(equationText(p.result)).toBe('x + 5/3 = −1');
        expect(same(normalize(eq.right), normalize(p.landing.right))).toBe(false);
        expect(solutionKey(solve(eq))).toBe(solutionKey(solve(transform(eq, p.action).equation)));
    });
    it('saisit le dénominateur et multiplie chaque terme', () => {
        const eq = equation('x/4+5=-3'), p = gesturePlan(eq, 'l.0', 'denominator');
        expect(format(p.inFlightSource)).toBe('x + 20');
        expect(equationText(p.result)).toBe('x + 20 = −12');
        expect(transform(eq, p.action).equation).toEqual(p.result);
    });
    it('préserve le signe du coefficient −1', () => {
        const eq = equation('-x=3'), p = gesturePlan(eq, 'l', 'coefficient');
        expect(format(p.carried)).toBe('−1');
        expect(format(p.inFlightSource)).toBe('x');
        expect(equationText(p.result)).toBe('x = −3');
        expect(p.label).toContain('par (−1)');
    });
    it('peut agir dans les deux sens', () => {
        const eq = equation('7=3x+5'), p = gesturePlan(eq, 'r.1', 'term');
        expect(equationText(p.result)).toBe('2 = 3x');
        expect(transform(eq, p.action).equation).toEqual(p.result);
        const scale = gesturePlan(eq, 'r.0', 'coefficient');
        expect(equationText(scale.result)).toBe('7/3 = x + 5/3');
    });
    it('retire exactement le bloc choisi, même si une autre constante précède', () => {
        const p = gesturePlan(equation('x+5+3=9'), 'l.2', 'term');
        expect(format(p.inFlightSource)).toBe('x + 5');
        expect(equationText(p.result)).toBe('x + 5 = 6');
    });
    it('rejette les groupes, les zéros et les faux facteurs', () => {
        expect(() => gesturePlan(equation('3(x+1)=12'), 'l', 'term')).toThrow();
        expect(() => gesturePlan(equation('x+3=8'), 'l', 'term')).toThrow();
        expect(() => gesturePlan(equation('0=0'), 'l', 'term')).toThrow();
        expect(() => gripValue(nodeAt(equation('x=3'), 'l'), 'coefficient')).toThrow();
        expect(() => gesturePlan(equation('x=3'), 'l', 'denominator')).toThrow();
    });
    it('conserve les solutions de 600 gestes sur des équations générées', () => {
        for (let seed = 0; seed < 300; seed++) {
            const eq = generated(1, seed).initial;
            const id = eq.left.kind === 'sum' ? 'l.0' : 'l';
            for (const part of ['term', 'coefficient'] as const) {
                try { const p = gesturePlan(eq, id, part); expect(solutionKey(solve(transform(eq, p.action).equation))).toBe(solutionKey(solve(eq))); }
                catch (e) { if (String(e).includes('facteur vaut 1')) continue; throw e; }
            }
        }
    });
    it('enregistre un seul geste, le restaure et l’annule sans perdre les tentatives', () => {
        const game = start(campaign[4]);
        perform(game, { kind: 'drag', id: 'l.0', part: 'coefficient' });
        expect(game.moves).toBe(1);
        const restored = restore(snapshot(game, 'campaign', 0, 0));
        expect(restored?.game.s.eq).toEqual(game.s.eq);
        expect(undo(game)).toBe(true);
        expect(game.s.eq).toEqual(game.level.initial);
        expect(game.moves).toBe(1);
    });
});
