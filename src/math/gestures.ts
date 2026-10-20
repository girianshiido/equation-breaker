import { exactMono, exactMonoExpr, scalarExpr, scalar, sNeg, sAdd, sZero, sDiv, sMul, exactPoly, exactFromPoly, pScale, rational } from './exact';
import { c, nodeAt, product, sum, terms, type Equation, type Expr } from './ast';
import { mono, monomial, tidy } from './normalize';
import { add, div, mul, neg, one, rat, zero, type Rational } from './rational';
import { format, operandText } from './format';

export type Grip = 'term' | 'coefficient' | 'denominator' | 'rational-coefficient' | 'algebraic-coefficient';
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
    const out:Expr[]=[];
    for(const term of terms(e)) {
        const m=exactMono(term);if(!m){out.push(term);continue;}
        const i=out.findIndex(t=>exactMono(t)?.degree===m.degree);
        if(i<0){if(!sZero(m.q))out.push(exactMonoExpr(m.q,m.degree));}
        else {const q=sAdd(exactMono(out[i])!.q,m.q);if(sZero(q))out.splice(i,1);else out[i]=exactMonoExpr(q,m.degree);}
    }
    return sum(...out);
}
/** Separate only outer constant factors; never extract a coefficient from inside a sum. */
export function groupedFactor(e: Expr): { q: Rational; base: Expr } | null {
    if (monomial(e) || (e.kind !== 'product' && e.kind !== 'fraction')) return null;
    let q = rat(1);
    const factors: Expr[] = [];
    const visit = (f: Expr) => {
        if (f.kind === 'constant') q = mul(q, f.value);
        else if (f.kind === 'product') f.factors.forEach(visit);
        else if (f.kind === 'fraction') { q = div(q, f.denominator); visit(f.numerator); }
        else factors.push(f);
    };
    visit(e);
    return factors.length ? { q, base: product(...factors) } : null;
}
export function scaleMember(e: Expr, q: Rational): Expr {
    return sum(...terms(e).flatMap(t => {
        const m = monomial(t);
        if (m) return [mono(mul(m.q, q), m.degree)];
        const group = groupedFactor(t), base = group?.base ?? t;
        const coefficient = mul(group?.q ?? rat(1), q);
        return terms(one(coefficient) ? base : product(c(coefficient), base));
    }));
}
export function gripValue(e: Expr, grip: Exclude<Grip, 'term'>): Rational {
    if(grip==='algebraic-coefficient')throw Error('Utilise le coefficient exact avec sa racine.');
    const m = monomial(e), group = groupedFactor(e);
    const q = m?.degree ? m.q : group?.q;
    if (!q || zero(q)) throw Error('Sélectionne un terme en x ou un facteur constant devant un groupe.');
    const value = grip === 'rational-coefficient' ? q : grip === 'denominator' ? rat(q.d) : rat(q.n);
    if (one(value)) throw Error('Ce facteur vaut 1 et ne transforme pas l’équation.');
    return value;
}
export function gripExpression(e:Expr,grip:Exclude<Grip,'term'>):Expr {
    if(grip!=='algebraic-coefficient')return c(gripValue(e,grip));
    const m=exactMono(e);if(!m||m.degree!==1||rational(m.q))throw Error('Sélectionne un coefficient contenant une racine.');
    return scalarExpr(m.q);
}
/** A transit preview is deliberately NOT an equation state. Only the final drop is committed. */
export function gesturePlan(eq: Equation, id: string, part: Grip): GesturePlan {
    if (!/^[lr](\.\d+)?$/.test(id)) throw Error('Saisis un terme entier dans une somme de premier niveau.');
    const source = id[0] as Side, destination = source === 'l' ? 'r' : 'l';
    const origin = sideExpr(eq, source), target = sideExpr(eq, destination), term = nodeAt(eq, id);
    if (origin.kind === 'sum' && !id.includes('.')) throw Error('Choisis un bloc de cette somme.');
    const m = exactMono(term);
    if (part === 'term' && (!m || sZero(m.q) || m.degree > 2)) throw Error('Développe ce groupe pour déplacer ses termes, ou saisis son facteur par un appui long.');
    let inFlightSource: Expr, rawTarget: Expr, carried: Expr, arrived: Expr, mirror: string, label: string, why: string;
    if (part === 'term') {
        const index = origin.kind === 'sum' ? Number(id.split('.')[1]) : 0;
        const rest = terms(origin).filter((_, i) => i !== index);
        inFlightSource = rest.length ? sum(...rest) : c(0);
        carried = exactMonoExpr(m!.q,m!.degree); arrived = exactMonoExpr(sNeg(m!.q), m!.degree);
        rawTarget = sum(...terms(target), arrived);
        mirror = `+ (${format(arrived)})`;
        label = `Ajouter ${format(arrived)} aux deux membres · déplacement de ${format(term)}`;
        why = 'Le changement de signe représente l’ajout de l’opposé aux deux membres. Le terme d’origine s’annule ; le terme déposé se réduit avec ses semblables.';
    } else if(part==='algebraic-coefficient') {
        carried=gripExpression(term,part);arrived=carried;
        const q=sDiv(scalar(1),exactPoly(carried)[0]);
        inFlightSource=exactFromPoly(pScale(exactPoly(origin),q));
        rawTarget={kind:'quotient',numerator:target,denominator:carried};
        mirror=`÷ (${format(carried)})`;label=`Diviser les deux membres par ${format(carried)}`;
        why='Le coefficient avec sa racine est une constante exacte non nulle. Chaque terme des deux membres est divisé par ce même nombre.';
    } else {
        const value = gripValue(term, part);
        const dividing = part !== 'denominator';
        const scale = dividing ? div(rat(1), value) : value;
        inFlightSource = scaleMember(origin, scale);
        rawTarget = dividing ? { kind: 'fraction', numerator: target, denominator: value } : { kind: 'product', factors: [c(value), target] };
        carried = c(value); arrived = carried;
        mirror = `${dividing ? '÷' : '×'} ${operandText(value)}`;
        label = `${dividing ? 'Diviser' : 'Multiplier'} les deux membres par ${operandText(value)} · saisie du ${dividing ? 'coefficient' : 'dénominateur'}`;
        why = `${dividing ? 'Chaque terme des deux membres est divisé' : 'Chaque terme des deux membres est multiplié'} par ${operandText(value)}, une constante non nulle. Pendant le trajet, le signe égal est suspendu : seule la transformation complète est validée.`;
    }
    const landing = withSides(source, inFlightSource, rawTarget);
    const resultTarget = part === 'term' ? reduceTop(rawTarget) : part==='algebraic-coefficient'?exactFromPoly(exactPoly(rawTarget)):scaleMember(target, part !== 'denominator' ? div(rat(1), gripValue(term, part)) : gripValue(term, part));
    return { action: { kind: 'drag', id, part }, source, destination, inFlightSource, landing, result: withSides(source, inFlightSource, resultTarget), carried, arrived, mirror, label, why };
}
