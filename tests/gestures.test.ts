import { describe, it, expect } from 'vitest';
import { c, equation, nodeAt } from '../src/math/ast';
import { gesturePlan, gripValue } from '../src/math/gestures';
import { transform } from '../src/math/transformations';
import { equationText, format } from '../src/math/format';
import { solve, solutionKey } from '../src/math/solve';
import { normalize, same } from '../src/math/normalize';
import { generated } from '../src/levels/generator';
import { campaign } from '../src/levels/campaign';
import { start, perform, undo } from '../src/gameplay/game';
import { restore, snapshot } from '../src/app/persistence';
import { blocks, math } from '../src/ui/math';

describe('Manipulations progressives', () => {
    it('réserve les parenthèses des produits numériques aux facteurs négatifs après le premier', () => {
        for (const [a, b, expected] of [[4, 3, '4 × 3'], [4, -3, '4 × (−3)'], [-3, 4, '−3 × 4'], [-3, -4, '−3 × (−4)']] as const)
            expect(math({ kind: 'product', factors: [c(a), c(b)] }, true)).toBe(expected);
    });
    it('sépare le signe visuel tout en transportant le terme signé', () => {
        const p = gesturePlan(equation('x-4=2'), 'l.1', 'term');
        expect(format(p.carried)).toBe('−4');expect(format(p.arrived)).toBe('4');
        const html = blocks(p.landing.right, 'r', [], [], true);
        expect(html).toContain('class="term-operator" aria-hidden="true">+</span>');
        const negative = blocks(equation('5-x=3').left, 'l', [], []);
        expect(negative).toContain('class="term-operator" aria-hidden="true">−</span>');
        expect(negative).toContain('aria-label="−x, membre gauche"');
        const revealed = blocks(equation('5-x=3').left, 'l', ['l.1'], []);
        expect(revealed).toContain('class="term-operator" aria-hidden="true">+</span>');
        expect(revealed).toContain('(−1)</span>');
    });
    it('retire le terme choisi et inverse son signe sans toucher au modèle de départ', () => {
        const eq = equation('3x+5=-3'), before = equationText(eq), p = gesturePlan(eq, 'l.1', 'term');
        expect(format(p.inFlightSource)).toBe('3x');
        expect(equationText(p.landing)).toBe('3x = −3 − 5');
        expect(equationText(p.result)).toBe('3x = −8');
        expect(equationText(eq)).toBe(before);
        expect(transform(eq, p.action).equation).toEqual(p.result);
    });
    it('garde 3x + 2x sous forme compacte avant de fusionner en 5x', () => {
        const p = gesturePlan(equation('-2x+5=3x'), 'l.0', 'term');
        expect(equationText(p.landing)).toBe('5 = 3x + 2x');
        const html = blocks(p.landing.right, 'r', [], [], true);
        expect(html).toContain('3<i>x</i>');
        expect(html).toContain('2<i>x</i>');
        expect(html).not.toContain(' × ');
        expect(equationText(p.result)).toBe('5 = 5x');
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
    it('détache le facteur d’une parenthèse sans la développer', () => {
        const eq = equation('3(x+3)=6'), p = gesturePlan(eq, 'l', 'coefficient');
        expect(format(p.inFlightSource)).toBe('x + 3');
        expect(p.landing.right.kind).toBe('fraction');
        expect(equationText(p.result)).toBe('x + 3 = 2');
        expect(transform(eq, p.action).equation).toEqual(p.result);
        expect(equationText(eq)).toBe('3(x + 3) = 6');
    });
    it('divise aussi les autres termes et fonctionne depuis la droite et avec un signe négatif', () => {
        for (const [source, id, expected] of [
            ['3(x+3)+5=6', 'l.0', 'x + 3 + 5/3 = 2'],
            ['6=3(x+3)', 'r', '2 = x + 3'],
            ['-3(x+3)=6', 'l', 'x + 3 = −2'],
            ['3(x+3)+2(x-1)=6', 'l.0', 'x + 3 + 2/3(x − 1) = 2'],
            ['3(x+3)/4=6', 'l', '1/4(x + 3) = 2'],
        ]) {
            const eq = equation(source), p = gesturePlan(eq, id, 'coefficient');
            expect(equationText(p.result)).toBe(expected);
            expect(solutionKey(solve(transform(eq, p.action).equation))).toBe(solutionKey(solve(eq)));
        }
    });
    it('saisit également le dénominateur d’un groupe sans développer sa somme', () => {
        const eq = equation('(x+3)/4=6'), p = gesturePlan(eq, 'l', 'denominator');
        expect(equationText(p.result)).toBe('x + 3 = 24');
        expect(transform(eq, p.action).equation).toEqual(p.result);
        expect(() => gripValue(eq.left, 'coefficient')).toThrow();
        const requested = equation('(x+4)/2=6');
        expect(equationText(gesturePlan(requested, 'l', 'denominator').result)).toBe('x + 4 = 12');
        expect(equationText(transform(requested, { kind: 'expand', id: 'l' }).equation)).toBe('1/2x + 2 = 6');
    });
    it('conserve les solutions avec les facteurs de groupes générés, sans extraire un terme intérieur', () => {
        for (const world of [2, 3]) for (let seed = 0; seed < 150; seed++) {
            const eq = generated(world, seed).initial;
            for (const [side, expr] of [['l', eq.left], ['r', eq.right]] as const) {
                const ids = expr.kind === 'sum' ? expr.terms.map((_, i) => `${side}.${i}`) : [side];
                for (const id of ids) for (const part of ['coefficient', 'denominator'] as const) {
                    try { gripValue(nodeAt(eq, id), part); } catch { continue; }
                    const result = transform(eq, gesturePlan(eq, id, part).action).equation;
                    expect(solutionKey(solve(result))).toBe(solutionKey(solve(eq)));
                }
            }
        }
        expect(() => gripValue(equation('3x+4=6').left, 'coefficient')).toThrow();
    });
    it('restaure un facteur de groupe détaché sans développer les parenthèses', () => {
        const game = start(campaign[24]);
        perform(game, { kind: 'drag', id: 'l', part: 'coefficient' });
        const restored = restore(snapshot(game, 'campaign', 0, 0));
        expect(equationText(restored!.game.s.eq)).toBe('x + 3 = 7');
        expect(restored!.game.moves).toBe(1);
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
