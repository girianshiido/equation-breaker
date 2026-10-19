import { type Expr, c, x, product, sum } from './ast';
import { type Rational, rat, add, mul, div, neg, zero, one, equal } from './rational';
export type Poly = [
    Rational,
    Rational,
    Rational
];
export const empty = (): Poly => [rat(0), rat(0), rat(0)];
export const plus = (a: Poly, b: Poly): Poly => a.map((q, i) => add(q, b[i])) as Poly;
export const minus = (a: Poly, b: Poly): Poly => plus(a, b.map(neg) as Poly);
export const scale = (p: Poly, q: Rational): Poly => p.map(a => mul(a, q)) as Poly;
export function times(a: Poly, b: Poly): Poly { const r = empty(); for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
        if (i + j > 2) {
            if (!zero(a[i]) && !zero(b[j]))
                throw Error('Le degré dépasse 2.');
        }
        else
            r[i + j] = add(r[i + j], mul(a[i], b[j]));
    } return r; }
export function normalize(e: Expr): Poly { switch (e.kind) {
    case 'constant': return [e.value, rat(0), rat(0)];
    case 'variable': return [rat(0), rat(1), rat(0)];
    case 'sum': return e.terms.map(normalize).reduce(plus, empty());
    case 'product': return e.factors.map(normalize).reduce(times, [rat(1), rat(0), rat(0)]);
    case 'fraction': return scale(normalize(e.numerator), div(rat(1), e.denominator));
    case 'power': {
        const p = normalize(e.base);
        return e.exponent === 0 ? [rat(1), rat(0), rat(0)] : e.exponent === 1 ? p : times(p, p);
    }
} }
export const same = (a: Poly, b: Poly) => a.every((q, i) => equal(q, b[i]));
export function mono(q: Rational, degree: number): Expr { if (degree === 0 || zero(q))
    return c(q); const base: Expr = degree === 1 ? x() : { kind: 'power', base: x(), exponent: 2 }; return one(q) ? base : product(c(q), base); }
export function fromPoly(p: Poly): Expr { const tt = [2, 1, 0].filter(i => !zero(p[i])).map(i => mono(p[i], i)); return tt.length ? sum(...tt) : c(0); }
// A monomial contains no unexpanded sum, even when its polynomial would reduce to one term.
export function monomial(e: Expr): {
    q: Rational;
    degree: number;
} | null { if (e.kind === 'sum')
    return null; if (e.kind === 'product' && e.factors.some(f => !monomial(f)))
    return null; if (e.kind === 'fraction' && !monomial(e.numerator))
    return null; if (e.kind === 'power' && !monomial(e.base))
    return null; const p = normalize(e), ii = [0, 1, 2].filter(i => !zero(p[i])); return ii.length <= 1 ? { q: p[ii[0] ?? 0], degree: ii[0] ?? 0 } : null; }
export function tidy(e: Expr): Expr { const m = monomial(e); return m ? mono(m.q, m.degree) : e; }
export const isZero = (e: Expr) => normalize(e).every(zero);
