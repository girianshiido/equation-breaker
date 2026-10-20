import { exactPoly, pSub, pScale, sZero, sDiv, pEqual, checkExactBounds, exactMono, sAdd, exactMonoExpr, scalarExpr, exactFromPoly } from './exact';
import { squareCompletion, writeSquare, differenceOfSquares, commonFactor } from './squares';
import { gesturePlan, scaleMember, type DragAction } from './gestures';
import { type Equation, type Expr, c, x, sum, product, terms, nodeAt, replace } from './ast';
import { type Rational, rat, add, neg, mul, div, zero, one, str } from './rational';
import { normalize, fromPoly, monomial, mono, tidy, isZero, minus, same } from './normalize';
import { solve, solvePoly, solutionKey, solutionsEqual, type Solution, discriminant } from './solve';
import { format, operandText } from './format';
export type Action = DragAction | { kind: 'complete-square'; ids: string[]; local?: boolean } | {kind:'write-square';id:string} | {kind:'difference-squares';ids:string[]} | {kind:'factor-common';ids:string[];maximal?:boolean} | {
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
export function expandable(e: Expr): boolean { return (e.kind === 'product' && e.factors.some(f => f.kind === 'sum' || expandable(f))) || ((e.kind === 'power' && e.exponent === 2 || e.kind === 'square') && !monomial(e.base)) || (e.kind === 'fraction' && (e.numerator.kind === 'sum' || expandable(e.numerator))); }
function flatten(e: Expr): Expr { return e.kind === 'sum' ? sum(...e.terms.flatMap(t => t.kind === 'sum' ? t.terms : [t])) : e; }
function localReplace(eq: Equation, id: string, next: Expr): Equation { const n = replace(eq, id, next); return { left: flatten(n.left), right: flatten(n.right) }; }
function insert(e: Expr, value: Expr): Expr { const m = monomial(value); if (!m || m.degree > 2)
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
            const completion = squareCompletion(eq, a.ids, a.local !== false);
            const added = c(completion.added);
            next = a.local !== false ? replace(eq,completion.parent,completion.expression) : completion.side === 'l' ? { left: completion.expression, right: insert(eq.right, added) } : { left: insert(eq.left, added), right: completion.expression };
            mirror = a.local !== false ? undefined : `+ ${operandText(completion.added)}`;
            label = a.local !== false ? `Compléter le carré : compenser par −${operandText(completion.added)}` : `Compléter le carré : ajouter ${operandText(completion.added)} aux deux membres`;
            why = a.local !== false ? 'On écrit ax² + bx comme un carré, puis on retranche exactement b²/(4a) pour garder la même expression. La compensation reste visible et les autres termes sont conservés.' : 'Pour x² + bx, on ajoute (b/2)² aux deux membres puis on utilise x² + bx + (b/2)² = (x + b/2)².';
            break;
        }
        case 'write-square': {
            const e=nodeAt(eq,a.id);next=replace(eq,a.id,writeSquare(e));label=`Écrire ${format(e)} comme un carré`;
            why='On écrit la valeur positive comme le carré de sa racine exacte ; le signe moins éventuel reste à l’extérieur.';break;
        }
        case 'difference-squares': {
            const result=differenceOfSquares(eq,a.ids);next=replace(eq,result.parent,result.expression);
            label='a² − b² = (a + b)(a − b)';why='Chaque carré a été préparé et sélectionné. L’identité de la différence de deux carrés donne un produit de deux facteurs.';break;
        }
        case 'factor-common': {
            const result=commonFactor(eq,a.ids,a.maximal);next=replace(eq,result.parent,result.expression);
            label=`Mettre ${format(result.factor)} en facteur`;why='Les deux termes contiennent ce facteur commun. On factorise sans diviser par x : la solution x = 0 est conservée.';break;
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
            const nodes = a.ids.map(id => nodeAt(eq, id)), mm = nodes.map(exactMono);
            if (!mm[0] || !mm[1] || mm[0].degree !== mm[1].degree)
                throw Error('Ces blocs ne sont pas des termes semblables.');
            const q = sAdd(mm[0].q, mm[1].q), idx = aa.map(v => Number(v.at(-1)));
            const out = p.terms.filter((_, i) => !idx.includes(i));
            if (!sZero(q))
                out.splice(Math.min(...idx), 0, exactMonoExpr(q, mm[0].degree));
            next = replace(eq, parent, out.length ? sum(...out) : c(0));
            why = 'On additionne les coefficients des termes de même degré, dans une même somme.';
            label = `Fusion : ${format(nodes[0])} et ${format(nodes[1])}`;
            break;
        }
        case 'expand': {
            const e = nodeAt(eq, a.id);
            if (!expandable(e))
                throw Error('Sélectionne un produit contenant une parenthèse.');
            next = localReplace(eq, a.id, exactFromPoly(exactPoly(e)));
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
            next = localReplace(eq, a.id, exactFromPoly(exactPoly(e)));
            why = 'On divise exactement chaque coefficient par le dénominateur constant non nul.';
            label = 'Simplifier la fraction';
            break;
        }
        case 'add': {
            const m = monomial(a.expression);
            if (!m || m.degree > 2 || zero(m.q))
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
    const before=pSub(exactPoly(eq.left),exactPoly(eq.right)),after=pSub(exactPoly(next.left),exactPoly(next.right));
    const pivot=before.findIndex(q=>!sZero(q));
    if(pivot<0?after.some(q=>!sZero(q)):sZero(after[pivot])||!pEqual(pScale(before,sDiv(after[pivot],before[pivot])),after))throw Error('Échec de la vérification d’équivalence.');
    checkExactBounds(exactPoly(next.left));checkExactBounds(exactPoly(next.right));
    return { equation: next, why, label, mirror };
}
export function zeroBranches(eq: Equation, distinct = true): Equation[] { let e: Expr; if (isZero(eq.right))
    e = eq.left;
else if (isZero(eq.left))
    e = eq.right;
else
    throw Error('Le produit doit être égal à 0.'); const collect = (v: Expr): Expr[] => v.kind === 'product' ? v.factors.flatMap(collect) : (v.kind === 'power' && v.exponent === 2 || v.kind === 'square') ? [v.base, v.base] : [v]; const factors = collect(e).filter(f => { const m = exactMono(f); return !(m && m.degree === 0 && !sZero(m.q)); }); if (factors.length < 2 || factors.some(f => sZero(exactPoly(f)[1]) && sZero(exactPoly(f)[2])))
    throw Error('Sélectionne une équation produit nul avec des facteurs non constants.');
    const branches = factors.map(left => ({ left, right: c(0) }));
    if (!distinct) return branches; // Replay saves written before identical doors were merged.
    const seen:Solution[]=[];
    return branches.filter(branch=>{const solution=solve(branch);if(seen.some(previous=>solutionsEqual(previous,solution)))return false;seen.push(solution);return true;});
}
export function quadraticInfo(eq: Equation) { if (!isZero(eq.right))
    throw Error('Ramène d’abord tous les termes à gauche, avec 0 à droite.'); const p = minus(normalize(eq.left), normalize(eq.right)); if (zero(p[2]) || expandable(eq.left))
    throw Error('Développe et réduis le trinôme avant de calculer Δ.'); return { p, delta: discriminant(p) }; }
