export interface Rational {
    n: bigint;
    d: bigint;
}
export const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) {
    [a, b] = [b, a % b];
} return a; };
export function rat(n: bigint | number, d: bigint | number = 1): Rational { n = BigInt(n); d = BigInt(d); if (!d)
    throw Error('On ne peut pas diviser par 0.'); if (d < 0n) {
    n = -n;
    d = -d;
} const g = gcd(n, d); return { n: n / g, d: d / g }; }
export const add = (a: Rational, b: Rational) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const neg = (a: Rational) => rat(-a.n, a.d);
export const sub = (a: Rational, b: Rational) => add(a, neg(b));
export const mul = (a: Rational, b: Rational) => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational) => rat(a.n * b.d, a.d * b.n);
export const equal = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
export const zero = (a: Rational) => a.n === 0n;
export const one = (a: Rational) => a.n === a.d;
export const str = (a: Rational) => a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
export function readRational(s: string): Rational { if (!/^[+-]?\d{1,8}(\/[+-]?\d{1,8})?$/.test(s.trim()))
    throw Error('Écris un entier ou une fraction, par exemple −3 ou 2/5.'); const [n, d = '1'] = s.trim().split('/'); return rat(BigInt(n), BigInt(d)); }
export function isqrt(n: bigint): bigint { if (n < 0n)
    throw Error('Racine réelle impossible.'); if (n < 2n)
    return n; let x = n, y = (x + 1n) / 2n; while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
} return x; }
export function sqrtRational(q: Rational): Rational | null { if (q.n < 0n)
    return null; const n = isqrt(q.n), d = isqrt(q.d); return n * n === q.n && d * d === q.d ? rat(n, d) : null; }
