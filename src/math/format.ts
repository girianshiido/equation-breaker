import { type Expr, type Equation } from './ast';
import { str, neg, one, type Rational } from './rational';
import { monomial } from './normalize';
export const operandText = (q: Rational): string => { const text = str(q).replaceAll('-', '−'); return q.n < 0n ? `(${text})` : text; };
export function format(e: Expr, parent = 0): string {
    const m = monomial(e);
    if (m) {
        const q = m.q;
        if (m.degree === 0)
            return str(q).replaceAll('-', '−');
        const sign = q.n < 0n ? '−' : '';
        const abs = q.n < 0n ? neg(q) : q;
        return `${sign}${one(abs) ? '' : str(abs)}x${m.degree === 2 ? '²' : ''}`;
    }
    switch (e.kind) {
        case 'sum': {
            const s = e.terms.map((t, i) => { const text = format(t); return i ? (text.startsWith('−') ? ' − ' + text.slice(1) : ' + ' + text) : text; }).join('');
            return parent > 1 ? `(${s})` : s;
        }
        case 'product': if(e.factors[0]?.kind==='constant' && e.factors[0].value.n===-e.factors[0].value.d && e.factors.length===2) return '−'+format(e.factors[1],parent); return e.factors.map((f, i) => { const s = format(f, 2); return i && f.kind !== 'sum' ? ' × ' + s : s; }).join('');
        case 'radical': return `√(${str(e.radicand)})`;
        case 'square': return `(${format(e.base)})²`;
        case 'quotient': return `(${format(e.numerator)}) / (${format(e.denominator)})`;
        case 'power': return `${format(e.base, 2)}${e.exponent === 2 ? '²' : e.exponent === 0 ? '⁰' : ''}`;
        case 'fraction': return `(${format(e.numerator)}) / ${operandText(e.denominator)}`;
        case 'constant': return str(e.value);
        case 'variable': return 'x';
    }
}
export const equationText = (eq: Equation) => `${format(eq.left)} = ${format(eq.right)}`;
export const escape = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
