import { type Expr, terms, c, product } from '../math/ast';
import { monomial, mono } from '../math/normalize';
import { groupedFactor } from '../math/gestures';
import { neg, one, type Rational, str } from '../math/rational';
import { escape, format, operandText } from '../math/format';
const fraction = (q: Rational) => q.d === 1n ? escape(String(q.n)) : `<span class="fraction"><span>${escape(String(q.n))}</span><span>${escape(String(q.d))}</span></span>`;
export function math(e: Expr, raw = false): string {
    const m = monomial(e);
    if (raw && e.kind === 'fraction') return `<span class="fraction"><span>${math(e.numerator)}</span><span>${escape(operandText(e.denominator))}</span></span>`;
    if (raw && e.kind === 'product' && !m?.degree) return e.factors.map((f, i) => {
        const text = math(f);
        return f.kind === 'sum' || (i > 0 && text.startsWith('−')) ? `(${text})` : text;
    }).join(' × ');
    if (m) {
        const sign = m.q.n < 0n ? '−' : '', abs = m.q.n < 0n ? neg(m.q) : m.q;
        if (!m.degree) return sign + fraction(abs);
        const variable = `<i>x</i>${m.degree === 2 ? '<sup>2</sup>' : ''}`;
        const numerator = `${abs.n === 1n ? '' : abs.n}${variable}`;
        return sign + (abs.d === 1n ? numerator : `<span class="fraction"><span>${numerator}</span><span>${abs.d}</span></span>`);
    }
    switch (e.kind) {
        case 'sum': return e.terms.map((t, i) => { const s = math(t, raw); return i ? (s.startsWith('−') ? ' − ' + s.slice(1) : ' + ' + s) : s; }).join('');
        case 'product': return e.factors.map((f, i) => f.kind === 'sum' ? `<span class="paren">(</span>${math(f)}<span class="paren">)</span>` : f.kind === 'constant' && str(f.value) === '-1' ? '−' : `${i ? '·' : ''}${math(f)}`).join('');
        case 'power': return `(${math(e.base)})<sup>${e.exponent}</sup>`;
        case 'fraction': return `<span class="fraction"><span>${math(e.numerator)}</span><span>${fraction(e.denominator)}</span></span>`;
        default: return escape(format(e));
    }
}
function interactiveTerm(t: Expr, reveal: boolean): string {
    const m = monomial(t);
    const group = m ? null : groupedFactor(t);
    if ((!m || !m.degree) && !group) return math(t);
    const q = group?.q ?? m!.q, negative = q.n < 0n, abs = negative ? neg(q) : q;
    const needsParens = group?.base.kind === 'sum' && (abs.d === 1n || abs.n !== 1n || negative);
    const variable = group ? (needsParens ? `<span class="paren">(</span>${math(group.base)}<span class="paren">)</span>` : math(group.base)) : `<i>x</i>${m!.degree === 2 ? '<sup>2</sup>' : ''}`;
    const coefficient = negative && abs.n === 1n && reveal ? '<span class="factor-grip revealed-grip" data-grip="coefficient">(−1)</span><span class="factor-times">×</span>' : `<span class="factor-grip" data-grip="coefficient">${negative ? '−' : ''}${abs.n === 1n ? '' : abs.n}</span>`;
    const numerator = coefficient + variable;
    return abs.d === 1n ? numerator : `<span class="fraction term-fraction"><span>${numerator}</span><span class="factor-grip" data-grip="denominator">${abs.d}</span></span>`;
}
export function blocks(e: Expr, side: 'l' | 'r', selected: string[], highlight: string[], raw = false): string {
    return terms(e).map((t, i) => {
        const id = e.kind === 'sum' ? `${side}.${i}` : side, m = monomial(t);
        const type = m ? (m.degree ? 'variable' : 'constant') : t.kind === 'fraction' ? 'rational' : 'group';
        const group = m ? null : groupedFactor(t), q = m?.q ?? group?.q;
        const negative = !!q && q.n < 0n;
        const revealMinusOne = !raw && selected.includes(id) && negative && q!.n === -1n && !!(m?.degree || group);
        const separateMinus = i > 0 && negative && !revealMinusOne;
        const shown = separateMinus ? (m ? mono(neg(m.q), m.degree) : product(c(neg(group!.q)), group!.base)) : t;
        const operator = i ? `<span class="term-operator" aria-hidden="true">${separateMinus ? '−' : '+'}</span>` : '';
        return `<span class="term-unit ${i ? 'has-sign' : ''}">${operator}<button type="button" class="block ${type} ${selected.includes(id) ? 'selected' : ''} ${highlight.includes(id) ? 'hinted' : ''}" data-node="${id}" aria-pressed="${selected.includes(id)}" aria-label="${escape(format(t))}, membre ${side === 'l' ? 'gauche' : 'droit'}">${raw ? math(shown, true) : interactiveTerm(shown, selected.includes(id))}</button></span>`;
    }).join('');
}
