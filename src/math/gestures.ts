import { c, nodeAt, product, sum, terms, type Equation, type Expr } from './ast';
import { mono, monomial, tidy } from './normalize';
import { add, div, mul, neg, one, rat, zero, type Rational } from './rational';
import { format, operandText } from './format';

export type Grip = 'term' | 'coefficient' | 'denominator';
export type DragAction = { kind: 'drag'; id: string; part: Grip };
export type Side = 'l' | 'r';
export interface GesturePlan {
    action: DragAction;
    source: Side;
    destination: Side;
    inFlightSource: Expr;
    landing: Equation;
    result: Equation;
    carried: Expr;
    arrived: Expr;
    mirror: string;
    label: string;
    why: string;
}
const sideExpr = (eq: Equation, side: Side) => side === 'l' ? eq.left : eq.right;
const withSides = (source: Side, origin: Expr, destination: Expr): Equation => source === 'l' ? { left: origin, right: destination } : { left: destination, right: origin };
function reduceTop(e: Expr): Expr {
    const out: Expr[] = [];
    for (const t of terms(e)) {
        const m = monomial(t);
        if (!m) { out.push(t); continue; }
        const i = out.findIndex(q => monomial(q)?.degree === m.degree);
        if (i < 0) { if (!zero(m.q)) out.push(tidy(t)); }
        else {
            const q = add(monomial(out[i])!.q, m.q);
            if (zero(q)) out.splice(i, 1); else out[i] = mono(q, m.degree);
        }
    }
    return out.length ? sum(...out) : c(0);
}
function scaleSource(e: Expr, q: Rational): Expr {
    return sum(...terms(e).map(t => {
        const m = monomial(t);
        return m ? mono(mul(m.q, q), m.degree) : product(c(q), t);
    }));
}
export function gripValue(e: Expr, grip: Exclude<Grip, 'term'>): Rational {
    const m = monomial(e);
    if (!m || !m.degree || zero(m.q)) throw Error('Sélectionne un terme non nul en x.');
    const value = grip === 'denominator' ? rat(m.q.d) : rat(m.q.n);
    if (one(value)) throw Error('Ce facteur vaut 1 et ne transforme pas l’équation.');
    return value;
}
/** A transit preview is deliberately NOT an equation state. Only the final drop is committed. */
export function gesturePlan(eq: Equation, id: string, part: Grip): GesturePlan {
    if (!/^[lr](\.\d+)?$/.test(id)) throw Error('Saisis un terme entier dans une somme de premier niveau.');
    const source = id[0] as Side, destination = source === 'l' ? 'r' : 'l';
    const origin = sideExpr(eq, source), target = sideExpr(eq, destination), term = nodeAt(eq, id);
    if (origin.kind === 'sum' && !id.includes('.')) throw Error('Choisis un bloc de cette somme.');
    const m = monomial(term);
    if (!m || zero(m.q) || m.degree > 1) throw Error('Développe ce groupe avant de déplacer ses termes.');
    let inFlightSource: Expr, rawTarget: Expr, carried: Expr, arrived: Expr, mirror: string, label: string, why: string;
    if (part === 'term') {
        const index = origin.kind === 'sum' ? Number(id.split('.')[1]) : 0;
        const rest = terms(origin).filter((_, i) => i !== index);
        inFlightSource = rest.length ? sum(...rest) : c(0);
        carried = tidy(term); arrived = mono(neg(m.q), m.degree);
        rawTarget = sum(...terms(target), arrived);
        mirror = `+ (${format(arrived)})`;
        label = `Ajouter ${format(arrived)} aux deux membres · déplacement de ${format(term)}`;
        why = 'Le changement de signe représente l’ajout de l’opposé aux deux membres. Le terme d’origine s’annule ; le terme déposé se réduit avec ses semblables.';
    } else {
        const value = gripValue(term, part);
        const dividing = part === 'coefficient';
        const scale = dividing ? div(rat(1), value) : value;
        inFlightSource = scaleSource(origin, scale);
        rawTarget = dividing ? { kind: 'fraction', numerator: target, denominator: value } : { kind: 'product', factors: [c(value), target] };
        carried = c(value); arrived = carried;
        mirror = `${dividing ? '÷' : '×'} ${operandText(value)}`;
        label = `${dividing ? 'Diviser' : 'Multiplier'} les deux membres par ${operandText(value)} · saisie du ${dividing ? 'coefficient' : 'dénominateur'}`;
        why = `${dividing ? 'Chaque terme des deux membres est divisé' : 'Chaque terme des deux membres est multiplié'} par ${operandText(value)}, une constante non nulle. Pendant le trajet, le signe égal est suspendu : seule la transformation complète est validée.`;
    }
    const landing = withSides(source, inFlightSource, rawTarget);
    const resultTarget = part === 'term' ? reduceTop(rawTarget) : scaleSource(target, part === 'coefficient' ? div(rat(1), gripValue(term, part)) : gripValue(term, part));
    return { action: { kind: 'drag', id, part }, source, destination, inFlightSource, landing, result: withSides(source, inFlightSource, resultTarget), carried, arrived, mirror, label, why };
}
