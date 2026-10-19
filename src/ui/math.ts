import { type Expr, terms } from '../math/ast';
import { monomial } from '../math/normalize';
import { neg, one, type Rational, str } from '../math/rational';
import { escape, format } from '../math/format';
const fraction = (q: Rational) => q.d === 1n ? escape(String(q.n)) : `<span class="fraction"><span>${escape(String(q.n))}</span><span>${escape(String(q.d))}</span></span>`;
export function math(e: Expr): string { const m = monomial(e); if (m) {
    const sign = m.q.n < 0n ? '−' : '';
    const abs = m.q.n < 0n ? neg(m.q) : m.q;
    if (!m.degree)
        return sign + fraction(abs);
    return `${sign}${one(abs) ? '' : fraction(abs)}<i>x</i>${m.degree === 2 ? '<sup>2</sup>' : ''}`;
} switch (e.kind) {
    case 'sum': return e.terms.map((t, i) => { const s = math(t); return i ? (s.startsWith('−') ? ' − ' + s.slice(1) : ' + ' + s) : s; }).join('');
    case 'product': return e.factors.map((f, i) => f.kind === 'sum' ? `<span class="paren">(</span>${math(f)}<span class="paren">)</span>` : f.kind === 'constant' && str(f.value) === '-1' ? '−' : `${i ? '·' : ''}${math(f)}`).join('');
    case 'power': return `(${math(e.base)})<sup>${e.exponent}</sup>`;
    case 'fraction': return `<span class="fraction"><span>${math(e.numerator)}</span><span>${fraction(e.denominator)}</span></span>`;
    default: return escape(format(e));
} }
export function blocks(e: Expr, side: 'l' | 'r', selected: string[], highlight: string[]): string { return terms(e).map((t, i) => { const id = e.kind === 'sum' ? `${side}.${i}` : side; const m = monomial(t); const type = m ? (m.degree ? 'variable' : 'constant') : t.kind === 'fraction' ? 'rational' : 'group'; return `<button type="button" class="block ${type} ${selected.includes(id) ? 'selected' : ''} ${highlight.includes(id) ? 'hinted' : ''}" data-node="${id}" aria-pressed="${selected.includes(id)}" aria-label="${escape(format(t))}, membre ${side === 'l' ? 'gauche' : 'droit'}">${i && !format(t).startsWith('−') ? '<span class="term-plus">+</span>' : ''}${math(t)}</button>`; }).join(''); }
