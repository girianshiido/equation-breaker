import { rat, type Rational, readRational, mul } from './rational';
export type Expr = {
    kind: 'constant';
    value: Rational;
} | {
    kind: 'variable';
} | {
    kind: 'sum';
    terms: Expr[];
} | {
    kind: 'product';
    factors: Expr[];
} | {
    kind: 'power';
    base: Expr;
    exponent: 0 | 1 | 2;
} | {
    kind: 'fraction';
    numerator: Expr;
    denominator: Rational;
};
export interface Equation {
    left: Expr;
    right: Expr;
}
export const c = (n: bigint | number | Rational): Expr => ({ kind: 'constant', value: typeof n === 'object' ? n : rat(n) });
export const x = (): Expr => ({ kind: 'variable' });
export const sum = (...terms: Expr[]): Expr => { const kept = terms.filter(e => e.kind !== 'constant' || e.value.n !== 0n); return !kept.length ? c(0) : kept.length === 1 ? kept[0] : { kind: 'sum', terms: kept }; };
export const product = (...factors: Expr[]): Expr => { if (factors.some(e => e.kind === 'constant' && e.value.n === 0n))
    return c(0); if (factors.every(e => e.kind === 'constant'))
    return c(factors.reduce((v, e) => mul(v, e.kind === 'constant' ? e.value : rat(1)), rat(1))); return factors.length === 1 ? factors[0] : { kind: 'product', factors }; };
export const terms = (e: Expr): Expr[] => e.kind === 'sum' ? e.terms : [e];
export function children(e: Expr): Expr[] { return e.kind === 'sum' ? e.terms : e.kind === 'product' ? e.factors : e.kind === 'power' ? [e.base] : e.kind === 'fraction' ? [e.numerator] : []; }
export function nodeAt(eq: Equation, id: string): Expr { const [side, ...indices] = id.split('.'); if (side !== 'l' && side !== 'r')
    throw Error('Sélection invalide.'); let e = side === 'l' ? eq.left : eq.right; for (const i of indices) {
    e = children(e)[Number(i)];
    if (!e)
        throw Error('Ce bloc n’existe plus.');
} return e; }
export function replace(eq: Equation, id: string, value: Expr): Equation { const [side, ...rest] = id.split('.'); if (side !== 'l' && side !== 'r')
    throw Error('Membre inconnu.'); const rec = (e: Expr, path: string[]): Expr => { if (!path.length)
    return value; const i = Number(path[0]), cc = children(e).map((ch, j) => j === i ? rec(ch, path.slice(1)) : ch); switch (e.kind) {
    case 'sum': return sum(...cc);
    case 'product': return product(...cc);
    case 'power': return { ...e, base: cc[0] };
    case 'fraction': return { ...e, numerator: cc[0] };
    default: throw Error('Sélection invalide.');
} }; return side === 'l' ? { ...eq, left: rec(eq.left, rest) } : { ...eq, right: rec(eq.right, rest) }; }
// Recursive descent: strings are parsed once at level/input boundaries, never used as algebra state.
export function parse(source: string): Expr { const text = source.replaceAll('−', '-').replaceAll('²', '^2').replaceAll('×', '*').replace(/\s/g, ''); if (text.length > 140)
    throw Error('Expression trop longue.'); const tokens = text.match(/\d+|x|[()+\-*/^]/g) || []; if (tokens.join('') !== text)
    throw Error('Expression non reconnue.'); let i = 0; const peek = () => tokens[i]; const atom = (): Expr => { let e: Expr; const t = tokens[i++]; if (t === 'x')
    e = x();
else if (t === '(') {
    e = expression();
    if (tokens[i++] !== ')')
        throw Error('Parenthèse manquante.');
}
else if (t && /^\d{1,8}$/.test(t))
    e = c(readRational(t));
else
    throw Error('Nombre ou x attendu.'); if (peek() === '^') {
    i++;
    const exp = tokens[i++];
    if (!['0', '1', '2'].includes(exp))
        throw Error('Le degré est limité à 2.');
    e = { kind: 'power', base: e, exponent: Number(exp) as 0 | 1 | 2 };
} return e; }; const unary = (): Expr => peek() === '-' ? (i++, product(c(-1), unary())) : peek() === '+' ? (i++, unary()) : atom(); const term = (): Expr => { let e = unary(); while (peek() === '*' || peek() === '/' || peek() === 'x' || peek() === '(') {
    const t = peek();
    if (t === '/') {
        i++;
        const d = unary();
        if (d.kind !== 'constant')
            throw Error('Seuls les dénominateurs constants sont autorisés.');
        e = { kind: 'fraction', numerator: e, denominator: d.value };
        if (!d.value.n)
            throw Error('Dénominateur nul.');
    }
    else {
        if (t === '*')
            i++;
        e = product(e, unary());
    }
} return e; }; const expression = (): Expr => { const tt = [term()]; while (peek() === '+' || peek() === '-') {
    const op = tokens[i++];
    const t = term();
    tt.push(op === '-' ? product(c(-1), t) : t);
} return sum(...tt); }; const e = expression(); if (i !== tokens.length)
    throw Error('Expression incomplète.'); return e; }
export function equation(source: string): Equation { const parts = source.split('='); if (parts.length !== 2)
    throw Error('Une égalité est attendue.'); return { left: parse(parts[0]), right: parse(parts[1]) }; }
