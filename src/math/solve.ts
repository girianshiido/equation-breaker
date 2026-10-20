import { exactPoly, pSub, rationalPoly, rational, sZero, sDiv, sNeg, scalarExpr, exactMono, scalar, sEqual, sSub, sSign, sMul, sRoot, sAdd, type Scalar } from './exact';
import { c, product, sum } from './ast';
import { format } from './format';
import type { Equation, Expr } from './ast';
import { normalize, minus, monomial, type Poly } from './normalize';
import { type Rational, rat, mul, sub, div, neg, zero, sqrtRational, str, isqrt } from './rational';
export type Root = { kind: 'algebraic'; expression: Expr } | {
    kind: 'rational';
    value: Rational;
} | {
    kind: 'radical';
    center: Rational;
    coefficient: Rational;
    radicand: bigint;
    sign: -1 | 1;
};
export type Solution = {
    kind: 'all';
} | {
    kind: 'none';
} | {
    kind: 'finite';
    roots: Root[];
};
export function discriminant(p: Poly): Rational { return sub(mul(p[1], p[1]), mul(rat(4), mul(p[2], p[0]))); }
export function solvePoly(p: Poly): Solution {
    if (!zero(p[2]))
        p = p.map(q => div(q, p[2])) as Poly;
    const [cc, b, a] = p;
    if (zero(a)) {
        if (zero(b))
            return { kind: zero(cc) ? 'all' : 'none' };
        return { kind: 'finite', roots: [{ kind: 'rational', value: div(neg(cc), b) }] };
    }
    const d = discriminant(p);
    if (d.n < 0n)
        return { kind: 'none' };
    const den = mul(rat(2), a), center = div(neg(b), den), s = sqrtRational(d);
    if (s) {
        const rr = [div(sub(neg(b), s), den), div(sub(s, b), den)];
        const roots = rr.filter((q, i) => !i || str(q) !== str(rr[0])).sort((u, v) => u.n * v.d < v.n * u.d ? -1 : 1).map(value => ({ kind: 'rational' as const, value }));
        return { kind: 'finite', roots };
    }
    // sqrt(n/d) = sqrt(n*d)/d. Extract square factors using integer arithmetic.
    let rad = d.n * d.d, out = 1n;
    for (let k = 2n; k * k <= rad && k <= 10000n; k++) {
        while (rad % (k * k) === 0n) {
            rad /= k * k;
            out *= k;
        }
    }
    const rest = isqrt(rad);
    if (rest * rest === rad) {
        out *= rest;
        rad = 1n;
    }
    const coefficient = div(rat(out, d.d), den);
    const positive = coefficient.n < 0n ? neg(coefficient) : coefficient;
    return { kind: 'finite', roots: [{ kind: 'radical', center, coefficient: positive, radicand: rad, sign: -1 }, { kind: 'radical', center, coefficient: positive, radicand: rad, sign: 1 }] };
}
export function rootFromScalar(value: Scalar):Root {
    const q=rational(value);if(q)return {kind:'rational',value:q};
    const center=value.get(1n)??rat(0), radicals=[...value].filter(([n])=>n!==1n);
    if(radicals.length===1){const [radicand,coefficient]=radicals[0];return {kind:'radical',center,coefficient:coefficient.n<0n?neg(coefficient):coefficient,radicand,sign:coefficient.n<0n?-1:1};}
    return {kind:'algebraic',expression:scalarExpr(value)};
}
export function rootExpression(root:Root):Expr {
    if(root.kind==='rational')return c(root.value);
    if(root.kind==='algebraic')return root.expression;
    return scalarExpr(sAdd(scalar(root.center),sMul(scalar(root.sign<0?neg(root.coefficient):root.coefficient),sRoot(rat(root.radicand)))));
}
export function solve(eq:Equation):Solution {
    const p=pSub(exactPoly(eq.left),exactPoly(eq.right));
    if(sZero(p[2])) {
        if(sZero(p[1]))return {kind:sZero(p[0])?'all':'none'};
        return {kind:'finite',roots:[rootFromScalar(sDiv(sNeg(p[0]),p[1]))]};
    }
    return solvePoly(rationalPoly(p.map(q=>sDiv(q,p[2])) as typeof p));
}
export function rootText(r: Root): string { if(r.kind==='algebraic')return format(r.expression); if (r.kind === 'rational')
    return str(r.value).replaceAll('-', '−'); const term = `${r.coefficient.n === r.coefficient.d ? '' : str(r.coefficient)}√${r.radicand}`; return `${zero(r.center) ? '' : str(r.center)}${r.sign < 0 ? '−' : zero(r.center) ? '' : '+'}${term}`.replaceAll('-', '−'); }
export function solutionText(s: Solution): string { return s.kind === 'all' ? 'S = ℝ' : s.kind === 'none' ? 'S = ∅' : `S = { ${s.roots.map(rootText).join(' ; ')} }`; }
export const solutionKey = (s: Solution) => s.kind === 'finite' ? s.roots.map(rootText).sort().join('|') : s.kind;
export function solutionsEqual(a:Solution,b:Solution):boolean {
    if(a.kind!==b.kind)return false;
    if(a.kind!=='finite'||b.kind!=='finite')return true;
    return a.roots.length===b.roots.length&&a.roots.every(r=>b.roots.some(q=>sEqual(exactPoly(rootExpression(r))[0],exactPoly(rootExpression(q))[0])));
}
export function union(ss:Solution[]):Solution {
    if(ss.some(s=>s.kind==='all'))return {kind:'all'};
    const roots=ss.flatMap(s=>s.kind==='finite'?s.roots:[]),value=(r:Root)=>exactPoly(rootExpression(r))[0];
    const unique=roots.filter((r,i)=>roots.findIndex(q=>sEqual(value(q),value(r)))===i);
    unique.sort((a,b)=>sSign(sSub(value(a),value(b))));return unique.length?{kind:'finite',roots:unique}:{kind:'none'};
}
export function terminal(eq: Equation): boolean {
    const constant=(e:Expr)=>{const p=exactPoly(e);return sZero(p[1])&&sZero(p[2]);};
    const isolated=(a:Expr,b:Expr)=>{const m=exactMono(a);return m?.degree===1&&sEqual(m.q,scalar(1))&&constant(b);};
    return isolated(eq.left,eq.right)||isolated(eq.right,eq.left)||(constant(eq.left)&&constant(eq.right));
}
