import { squareCompletion } from './squares';
import { gesturePlan, scaleMember, type DragAction } from './gestures';
import { type Equation, type Expr, c, x, sum, product, terms, nodeAt, replace } from './ast';
import { type Rational, rat, add, neg, mul, div, zero, one, str } from './rational';
import { normalize, fromPoly, monomial, mono, tidy, isZero, minus, same } from './normalize';
import { solve, solvePoly, solutionKey, discriminant } from './solve';
import { format, operandText } from './format';
export type Action = DragAction | { kind: 'complete-square'; ids: string[] } | {
    kind: 'combine';
    ids: string[];
} | {
    kind: 'expand' | 'factor' | 'simplify';
    id: string;
} | {
    kind: 'add';
    expression: Expr;
} | {
    kind: 'multiply' | 'divide';
    constant: Rational;
};
export interface Transformation {
    equation: Equation;
    why: string;
    label: string;
    mirror?: string;
}
export function expandable(e: Expr): boolean { return (e.kind === 'product' && e.factors.some(f => f.kind === 'sum' || expandable(f))) || (e.kind === 'power' && e.exponent === 2 && !monomial(e.base)) || (e.kind === 'fraction' && (e.numerator.kind === 'sum' || expandable(e.numerator))); }
function flatten(e: Expr): Expr { return e.kind === 'sum' ? sum(...e.terms.flatMap(t => t.kind === 'sum' ? t.terms : [t])) : e; }
function localReplace(eq: Equation, id: string, next: Expr): Equation { const n = replace(eq, id, next); return { left: flatten(n.left), right: flatten(n.right) }; }
function insert(e: Expr, value: Expr): Expr { const m = monomial(value); if (!m || m.degree > 1)
    throw Error('Ajoute une constante ou un terme en x.'); const tt = [...terms(e)]; const idx = tt.findIndex(t => monomial(t)?.degree === m.degree); if (idx < 0) {
    if (!zero(m.q))
        tt.push(tidy(value));
}
else {
    const q = add(monomial(tt[idx])!.q, m.q);
    if (zero(q))
        tt.splice(idx, 1);
    else
        tt[idx] = mono(q, m.degree);
} return tt.length ? sum(...tt) : c(0); }
export function factorable(e: Expr): Expr | null { if (e.kind !== 'sum')
    return null; const p = normalize(e); if (zero(p[2])) {
    if (zero(p[1]) || zero(p[0]) || one(p[1]))
        return null;
    return product(c(p[1]), sum(x(), c(div(p[0], p[1]))));
} const s = solvePoly(p); if (s.kind !== 'finite' || s.roots.some(r => r.kind !== 'rational'))
    return null; const rr = s.roots.map(r => r.kind === 'rational' ? r.value : rat(0)); const f = (q: Rational) => zero(q) ? x() : sum(x(), c(neg(q))); return product(...(one(p[2]) ? [] : [c(p[2])]), f(rr[0]), f(rr[1] ?? rr[0])); }
export function transform(eq: Equation, a: Action): Transformation {
    let next = eq, why = '', label = '', mirror: string | undefined;
    switch (a.kind) {
        case 'complete-square': {
            const completion = squareCompletion(eq, a.ids);
            const added = c(completion.added);
            next = completion.side === 'l' ? { left: completion.expression, right: insert(eq.right, added) } : { left: insert(eq.left, added), right: completion.expression };
            mirror = `+ ${operandText(completion.added)}`;
            label = `Compléter le carré : ajouter ${operandText(completion.added)} aux deux membres`;
            why = 'Pour x² + bx, on ajoute (b/2)² aux deux membres puis on utilise x² + bx + (b/2)² = (x + b/2)². Les autres termes restent présents.';
            break;
        }
        case 'drag': {
            const plan = gesturePlan(eq, a.id, a.part);
            next = plan.result; why = plan.why; label = plan.label; mirror = plan.mirror;
            break;
        }
        case 'combine': {
            if (a.ids.length !== 2 || a.ids[0] === a.ids[1])
                throw Error('Sélectionne deux blocs distincts.');
            const aa = a.ids.map(id => id.split('.'));
            const parent = aa[0].slice(0, -1).join('.');
            if (!parent || parent !== aa[1].slice(0, -1).join('.'))
                throw Error('Fusionne deux termes dans la même somme, sans traverser = ni une parenthèse.');
            const p = nodeAt(eq, parent);
            if (p.kind !== 'sum')
                throw Error('La fusion s’applique dans une somme.');
            const nodes = a.ids.map(id => nodeAt(eq, id)), mm = nodes.map(monomial);
            if (!mm[0] || !mm[1] || mm[0].degree !== mm[1].degree)
                throw Error('Ces blocs ne sont pas des termes semblables.');
            const q = add(mm[0].q, mm[1].q), idx = aa.map(v => Number(v.at(-1)));
            const out = p.terms.filter((_, i) => !idx.includes(i));
            if (!zero(q))
                out.splice(Math.min(...idx), 0, mono(q, mm[0].degree));
            next = replace(eq, parent, out.length ? sum(...out) : c(0));
            why = 'On additionne les coefficients des termes de même degré, dans une même somme.';
            label = `Fusion : ${format(nodes[0])} et ${format(nodes[1])}`;
            break;
        }
        case 'expand': {
            const e = nodeAt(eq, a.id);
            if (!expandable(e))
                throw Error('Sélectionne un produit contenant une parenthèse.');
            next = localReplace(eq, a.id, fromPoly(normalize(e)));
            why = e.kind === 'fraction' ? 'Diviser une somme par une constante non nulle revient à diviser chacun de ses termes par cette constante.' : 'Distributivité : chaque terme de la parenthèse est multiplié par le facteur, avec son signe.';
            label = `Développer ${format(e)}`;
            break;
        }
        case 'factor': {
            const e = nodeAt(eq, a.id), f = factorable(e);
            if (!f || !same(normalize(e), normalize(f)))
                throw Error('Aucune factorisation rationnelle disponible pour cette somme.');
            next = replace(eq, a.id, f);
            why = 'Le développement du produit redonne exactement le polynôme sélectionné.';
            label = `Factoriser ${format(e)}`;
            break;
        }
        case 'simplify': {
            const e = nodeAt(eq, a.id);
            if (e.kind !== 'fraction')
                throw Error('Sélectionne une fraction à dénominateur constant.');
            next = localReplace(eq, a.id, fromPoly(normalize(e)));
            why = 'On divise exactement chaque coefficient par le dénominateur constant non nul.';
            label = 'Simplifier la fraction';
            break;
        }
        case 'add': {
            const m = monomial(a.expression);
            if (!m || m.degree > 1 || zero(m.q))
                throw Error('Choisis un terme non nul constant ou en x.');
            next = { left: insert(eq.left, a.expression), right: insert(eq.right, a.expression) };
            mirror = `+ (${format(a.expression)})`;
            label = `Ajouter ${format(a.expression)} aux deux membres`;
            why = 'Ajouter une même quantité aux deux membres conserve exactement les solutions. Le terme ajouté se réduit avec un terme semblable lorsqu’il est présent.';
            break;
        }
        case 'multiply':
        case 'divide': {
            if (zero(a.constant))
                throw Error(a.kind === 'divide' ? 'On ne peut pas diviser par 0.' : 'Multiplier par 0 détruirait l’équivalence.');
            if (one(a.constant))
                throw Error('Avec 1, rien ne change. Choisis un autre nombre.');
            const q = a.kind === 'divide' ? div(rat(1), a.constant) : a.constant;
            next = { left: scaleMember(eq.left, q), right: scaleMember(eq.right, q) };
            mirror = `${a.kind === 'divide' ? '÷' : '×'} (${str(a.constant).replaceAll('-', '−')})`;
            label = `${a.kind === 'divide' ? 'Diviser' : 'Multiplier'} les deux membres par ${operandText(a.constant)}`;
            why = 'Multiplier ou diviser les deux membres par une constante non nulle est une opération réversible.';
            break;
        }
    }
    // All operations above preserve the difference polynomial up to a nonzero rational factor.
    const before = minus(normalize(eq.left), normalize(eq.right)), after = minus(normalize(next.left), normalize(next.right));
    const pivot = before.findIndex(q => !zero(q));
    if (pivot < 0 ? after.some(q => !zero(q)) : zero(after[pivot]) || !same(before.map(q => mul(q, div(after[pivot], before[pivot]))) as typeof before, after))
        throw Error('Échec de la vérification d’équivalence.');
    for (const q of [...normalize(next.left), ...normalize(next.right)])
        if (q.n.toString().length > 36 || q.d.toString().length > 36)
            throw Error('Les coefficients deviennent trop grands pour cette arène. Annule ou simplifie.');
    return { equation: next, why, label, mirror };
}
export function zeroBranches(eq: Equation, distinct = true): Equation[] { let e: Expr; if (isZero(eq.right))
    e = eq.left;
else if (isZero(eq.left))
    e = eq.right;
else
    throw Error('Le produit doit être égal à 0.'); const collect = (v: Expr): Expr[] => v.kind === 'product' ? v.factors.flatMap(collect) : v.kind === 'power' && v.exponent === 2 ? [v.base, v.base] : [v]; const factors = collect(e).filter(f => { const m = monomial(f); return !(m && m.degree === 0 && !zero(m.q)); }); if (factors.length < 2 || factors.some(f => zero(normalize(f)[1]) && zero(normalize(f)[2])))
    throw Error('Sélectionne une équation produit nul avec des facteurs non constants.');
    const branches = factors.map(left => ({ left, right: c(0) }));
    if (!distinct) return branches; // Replay saves written before identical doors were merged.
    const seen = new Set<string>();
    return branches.filter(branch => { const key = solutionKey(solve(branch)); if (seen.has(key)) return false; seen.add(key); return true; });
}
export function quadraticInfo(eq: Equation) { if (!isZero(eq.right))
    throw Error('Ramène d’abord tous les termes à gauche, avec 0 à droite.'); const p = minus(normalize(eq.left), normalize(eq.right)); if (zero(p[2]) || expandable(eq.left))
    throw Error('Développe et réduis le trinôme avant de calculer Δ.'); return { p, delta: discriminant(p) }; }
