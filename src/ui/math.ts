import { exactMono, exactMonoExpr, rational, scalarExpr, sNeg, sSign } from '../math/exact';
import { rootExpression, type Solution } from '../math/solve';
import { signedSquare } from '../math/squares';
import { type Expr, terms, c, product } from '../math/ast';
import { monomial, mono } from '../math/normalize';
import { groupedFactor } from '../math/gestures';
import { neg, one, type Rational, str } from '../math/rational';
import { escape, format } from '../math/format';
const fraction = (q: Rational) => q.d === 1n ? escape(String(q.n)) : `<span class="fraction"><span>${escape(String(q.n))}</span><span>${escape(String(q.d))}</span></span>`;
/** One inline expression inside stretchy fences; its children never become separate flex items. */
const fenced=(content:string, kind:'round'|'set'='round')=>{
    const set=kind==='set';
    const left=set?'M11 1 C4 1 4 5 4 10 L4 15 Q4 20 1 20 Q4 20 4 25 L4 30 C4 35 4 39 11 39':'M11 1 C-1 8 -1 32 11 39';
    const right=set?'M1 1 C8 1 8 5 8 10 L8 15 Q8 20 11 20 Q8 20 8 25 L8 30 C8 35 8 39 1 39':'M1 1 C13 8 13 32 1 39';
    return `<span class="math-group${set?' math-set':''}"><span class="math-fence" aria-hidden="true"><span class="sr-only">${set?'{':'('}</span><svg viewBox="0 0 12 40" preserveAspectRatio="none"><path d="${left}"/></svg></span><span class="math-group-content">${content}</span><span class="math-fence" aria-hidden="true"><span class="sr-only">${set?'}':')'}</span><svg viewBox="0 0 12 40" preserveAspectRatio="none"><path d="${right}"/></svg></span></span>`;
};
export function math(e: Expr, raw = false): string {
    if(e.kind==='radical')return `<span class="radical" aria-label="racine carrée de ${escape(str(e.radicand))}"><span class="radical-symbol" aria-hidden="true"><span class="sr-only">√</span><svg viewBox="0 0 20 32" preserveAspectRatio="none"><path d="M1 19 L5 17 L10 29 L17 1 L20 1"/></svg></span><span class="radicand">${math(c(e.radicand))}</span></span>`;
    if(e.kind==='square')return `<span class="written-square">${fenced(math(e.base))}<sup>2</sup></span>`;
    if(e.kind==='quotient')return `<span class="fraction"><span>${math(e.numerator)}</span><span>${math(e.denominator)}</span></span>`;

    const m = monomial(e);
    if (raw && e.kind === 'fraction') return `<span class="fraction"><span>${math(e.numerator)}</span><span>${math(c(e.denominator))}</span></span>`;
    if (raw && e.kind === 'product' && !m?.degree) return e.factors.map((f, i) => {
        const text = math(f);
        if(f.kind==='sum')return fenced(text);
        return i>0&&text.startsWith('−')?(text.includes('class=')?fenced(text):`(${text})`):text;
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
        case 'product': {
            const first=e.factors[0],rest=e.factors.slice(1);
            if(first?.kind==='constant'&&rest.length){
                const negative=first.value.n<0n,abs=negative?neg(first.value):first.value;
                const body=math(product(...rest));
                if(abs.d!==1n)return `${negative?'−':''}<span class="fraction scalar-fraction"><span>${abs.n===1n?'':abs.n}${rest.length===1&&rest[0].kind==='sum'?fenced(body):body}</span><span>${abs.d}</span></span>`;
                if(abs.n===1n)return `${negative?'−':''}${rest.length===1&&rest[0].kind==='sum'?fenced(body):body}`;
                return `${negative?'−':''}${abs.n}${rest.length===1&&rest[0].kind==='sum'?fenced(body):body}`;
            }
            return e.factors.map((f,i)=>f.kind==='sum'?fenced(math(f)):`${i&&f.kind!=='variable'&&!(f.kind==='power'&&f.base.kind==='variable')?'·':''}${math(f)}`).join('');
        }
        case 'power': return `${fenced(math(e.base))}<sup>${e.exponent}</sup>`;
        case 'fraction': return `<span class="fraction"><span>${math(e.numerator)}</span><span>${fraction(e.denominator)}</span></span>`;
        default: return escape(format(e));
    }
}
function interactiveTerm(t: Expr, reveal: boolean): string {
    if(signedSquare(t))return math(t);
    const m = monomial(t);
    const exact=exactMono(t);
    if(exact?.degree===1&&!rational(exact.q))return `<span class="factor-grip" data-grip="algebraic-coefficient">${math(scalarExpr(exact.q))}</span><i>x</i>`;
    const group = m ? null : groupedFactor(t);
    if ((!m || !m.degree) && !group) return math(t);
    const q = group?.q ?? m!.q, negative = q.n < 0n, abs = negative ? neg(q) : q;
    const needsParens = group?.base.kind === 'sum' && (abs.d === 1n || abs.n !== 1n || negative);
    const variable = group ? (needsParens ? fenced(math(group.base)) : math(group.base)) : `<i>x</i>${m!.degree === 2 ? '<sup>2</sup>' : ''}`;
    const coefficient = negative && abs.n === 1n && reveal ? '<span class="factor-grip revealed-grip" data-grip="coefficient">(−1)</span><span class="factor-times">×</span>' : `<span class="factor-grip" data-grip="coefficient">${negative ? '−' : ''}${abs.n === 1n ? '' : abs.n}</span>`;
    const numerator = coefficient + variable;
    return abs.d === 1n ? numerator : `<span class="fraction term-fraction" data-grip="rational-coefficient" title="Appui long sur x : saisir le coefficient complet"><span>${numerator}</span><span class="factor-grip" data-grip="denominator">${abs.d}</span></span>`;
}
export function blocks(e: Expr, side: 'l' | 'r', selected: string[], highlight: string[], raw = false): string {
    return terms(e).map((t, i) => {
        const id = e.kind === 'sum' ? `${side}.${i}` : side, m = monomial(t);
        const type = m ? (m.degree ? 'variable' : 'constant') : t.kind === 'fraction' ? 'rational' : 'group';
        const group = m ? null : groupedFactor(t), q = m?.q ?? group?.q;
        const sq=signedSquare(t),em=exactMono(t);
        const negative = sq?.sign===-1 || (!!em&&sSign(em.q)<0) || (!!q && q.n < 0n);
        const revealMinusOne = !raw && selected.includes(id) && !sq && negative && q?.n === -1n && !!(m?.degree || group);
        const separateMinus = i > 0 && negative && !revealMinusOne;
        const shown = separateMinus ? (sq?.sign===-1?t.kind==='product'?t.factors[1]:t : m ? mono(neg(m.q), m.degree) : em? exactMonoExpr(sNeg(em.q),em.degree): product(c(neg(group!.q)), group!.base)) : t;
        const operator = i ? `<span class="term-operator" aria-hidden="true">${separateMinus ? '−' : '+'}</span>` : '';
        return `<span class="term-unit ${i ? 'has-sign' : ''}">${operator}<button type="button" class="block ${type} ${selected.includes(id) ? 'selected' : ''} ${highlight.includes(id) ? 'hinted' : ''}" data-node="${id}" aria-pressed="${selected.includes(id)}" aria-label="${escape(format(t))}, membre ${side === 'l' ? 'gauche' : 'droit'}"><span class="math-expression">${raw ? math(shown, true) : interactiveTerm(shown, selected.includes(id))}</span></button></span>`;
    }).join('');
}

export function solutionMath(s:Solution):string {
    return s.kind==='all'?'S = ℝ':s.kind==='none'?'S = ∅':`S = ${fenced(` ${s.roots.map(root=>math(rootExpression(root))).join(' ; ')} `,'set')}`;
}
