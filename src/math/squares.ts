import { c, nodeAt, sum, x, type Equation, type Expr } from './ast';
import { monomial } from './normalize';
import { div, mul, one, rat, type Rational } from './rational';
export function squareCompletion(eq: Equation, ids: string[]): { side: 'l' | 'r'; parent: string; expression: Expr; added: Rational } {
    if (ids.length !== 2 || ids[0] === ids[1]) throw Error('Sélectionne x² et le terme en x dans une même somme.');
    const parent = ids[0].split('.').slice(0, -1).join('.');
    if (!/^[lr]$/.test(parent) || parent !== ids[1].split('.').slice(0, -1).join('.')) throw Error('Le carré se complète dans une seule somme du même membre.');
    const original = nodeAt(eq, parent);
    if (original.kind !== 'sum') throw Error('Sélectionne les deux termes dans une somme.');
    const mm = ids.map(id => monomial(nodeAt(eq, id)));
    const quadratic = mm.find(m => m?.degree === 2), linear = mm.find(m => m?.degree === 1);
    if (!quadratic || !linear || !one(quadratic.q)) throw Error('Pour compléter le carré, le coefficient de x² doit être 1. Divise d’abord les deux membres par ce coefficient.');
    const half = div(linear.q, rat(2)), added = mul(half, half);
    const square: Expr = { kind: 'power', base: sum(x(), c(half)), exponent: 2 };
    const indices = ids.map(id => Number(id.split('.')[1]));
    const kept = original.terms.filter((_, i) => !indices.includes(i));
    kept.splice(Math.min(...indices), 0, square);
    return { side: parent as 'l' | 'r', parent, expression: sum(...kept), added };
}
export function squareEquation(eq: Equation): { base: Expr; value: Rational } {
    for (const [square, constant] of [[eq.left, eq.right], [eq.right, eq.left]]) {
        const m = monomial(constant);
        if (square.kind === 'power' && square.exponent === 2 && m?.degree === 0) return { base: square.base, value: m.q };
    }
    throw Error('Isole d’abord le carré : (x + a)² = k.');
}
