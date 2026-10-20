import { squareEquation } from '../math/squares';
import { format, operandText } from '../math/format';
import { type Equation, c, nodeAt, terms, x } from '../math/ast';
import { type Action, transform, zeroBranches, quadraticInfo, expandable, factorable } from '../math/transformations';
import { normalize, monomial, isZero, mono } from '../math/normalize';
import { rat, zero, one, neg, str, sqrtRational } from '../math/rational';
import { terminal, solve, union, solutionKey, type Solution, solutionText } from '../math/solve';
import { equationText } from '../math/format';
import type { Level } from '../levels/campaign';
export type Event = Action | { kind: 'square-roots' } | {
    kind: 'split';
} | {
    kind: 'branch';
    index: number;
} | {
    kind: 'delta';
} | {
    kind: 'roots';
} | {
    kind: 'collect';
} | {
    kind: 'confirm-branch';
};
export interface Snapshot {
    eq: Equation;
    branches: Equation[];
    completed: (Solution | null)[];
    branch: number;
    delta: boolean;
    answer: Solution | null;
    label: string;
    why: string;
    mirror?: string;
}
export interface Game {
    level: Level;
    s: Snapshot;
    history: Snapshot[];
    events: Event[];
    moves: number;
    errors: number;
    hints: number;
    hintStage: number;
    started: number;
    elapsed: number;
    won: boolean;
    expanded: number;
    combined: number;
}
export function start(level: Level): Game { return { level, s: { eq: level.initial, branches: [], completed: [], branch: -1, delta: false, answer: null, label: 'Équation de départ', why: 'Les solutions sont cherchées dans ℝ.' }, history: [], events: [], moves: 0, errors: 0, hints: 0, hintStage: 0, started: Date.now(), elapsed: 0, won: false, expanded: 0, combined: 0 }; }
export function perform(g: Game, event: Event): void {
    if (g.won)
        throw Error('Ce niveau est terminé.');
    if (g.events.length >= 200)
        throw Error('Cette expérience a 200 étapes. Recommence pour repartir simplement.');
    let s = { ...g.s, branches: [...g.s.branches], completed: [...g.s.completed] };
    if (event.kind === 'split') {
        if (g.level.world < 4 || s.branches.length)
            throw Error('Le produit nul n’est pas disponible ici.');
        s.branches = zeroBranches(s.eq);
        s.completed = s.branches.map(() => null);
        s.branch = 0;
        s.eq = s.branches[0];
        s.delta = false;
        s.answer = null;
        s.label = 'Produit nul : ouvrir toutes les branches';
        s.why = 'AB = 0 ⇔ A = 0 ou B = 0. Chaque branche doit être résolue ; les solutions seront réunies.';
    }
    else if (event.kind === 'branch') {
        if (!s.branches[event.index])
            throw Error('Branche inexistante.');
        s.branches[s.branch] = s.eq;
        s.branch = event.index;
        s.eq = s.branches[event.index];
        s.delta = false;
        s.answer = null;
        s.label = `Explorer la porte ${event.index + 1}`;
        s.why = 'Les solutions des branches seront réunies, jamais intersectées.';
    }
    else if (event.kind === 'confirm-branch') {
        if (s.branch < 0 || !terminal(s.eq))
            throw Error('Isole x dans cette branche avant de la valider.');
        s.completed[s.branch] = solve(s.eq);
        s.label = `Branche ${s.branch + 1} validée : ${solutionText(s.completed[s.branch]!)}`;
        s.why = 'Explore les autres branches puis réunis leurs solutions.';
    }
    else if (event.kind === 'square-roots') {
        if (g.level.world < 5 || s.branches.length) throw Error('L’extraction des racines appartient au monde 6.');
        const square = squareEquation(s.eq);
        s.delta = false;
        const exactRoot = sqrtRational(square.value);
        if (exactRoot) {
            const roots = zero(exactRoot) ? [exactRoot] : [exactRoot, neg(exactRoot)];
            s.branches = roots.map(root => ({ left: square.base, right: c(root) }));
            s.completed = roots.map(() => null); s.branch = 0; s.eq = s.branches[0]; s.answer = null;
            s.label = `${format(square.base)} = ${str(exactRoot)}${roots.length === 2 ? ` ou ${format(square.base)} = ${str(neg(exactRoot))}` : ''}`;
        } else s.answer = solve(s.eq);
        if (square.value.n < 0n) s.label = 'Un carré réel ne peut pas être négatif';
        else if (!exactRoot) s.label = `${format(square.base)} = √(${operandText(square.value)}) ou ${format(square.base)} = −√(${operandText(square.value)})`;
        s.why = square.value.n < 0n ? 'Aucune solution réelle : un carré est toujours positif ou nul.' : 'Y² = k : si k = 0, Y = 0 ; si k > 0, Y = √k ou Y = −√k. On traite les deux signes et on réunit les solutions sans doublon.';
    }
    else if (event.kind === 'delta') {
        if (g.level.world < 5 || s.branches.length)
            throw Error('Le discriminant appartient au monde 6.');
        const info = quadraticInfo(s.eq);
        s.delta = true;
        s.label = `Δ = b² − 4ac = ${str(info.delta)}`;
        s.why = `a = ${str(info.p[2])}, b = ${str(info.p[1])}, c = ${str(info.p[0])}. ${info.delta.n < 0n ? 'Δ < 0 : aucune racine réelle.' : info.delta.n === 0n ? 'Δ = 0 : une racine double.' : 'Δ > 0 : deux racines réelles distinctes.'}`;
    }
    else if (event.kind === 'roots') {
        if (!s.delta)
            throw Error('Calcule d’abord le discriminant.');
        s.answer = solve(s.eq);
        s.label = 'Appliquer la formule des racines';
        s.why = 'Δ < 0 : ∅. Δ = 0 : −b/(2a). Δ > 0 : (−b − √Δ)/(2a) et (−b + √Δ)/(2a), en valeurs exactes.';
    }
    else if (event.kind === 'collect') {
        if (!s.branches.length || s.completed.some(v => !v))
            throw Error('Résous toutes les branches avant de réunir leurs solutions.');
        s.answer = union(s.completed as Solution[]);
        s.label = 'Réunir les solutions des branches';
        s.why = 'On prend l’union de toutes les solutions et on retire les doublons.';
    }
    else {
        if (event.kind === 'complete-square' && g.level.world < 5) throw Error('La complétion du carré appartient au monde 6.');
        const tr = transform(s.eq, event);
        s = { ...s, eq: tr.equation, label: tr.label, why: tr.why, mirror: tr.mirror, delta: false, answer: null };
        if (s.branch >= 0) {
            s.branches[s.branch] = s.eq;
            s.completed[s.branch] = null;
        }
    }
    if (event.kind !== 'add' && event.kind !== 'multiply' && event.kind !== 'divide' && event.kind !== 'drag' && event.kind !== 'complete-square')
        s.mirror = undefined;
    g.history.push(g.s);
    g.events.push(event);
    g.s = s;
    if (event.kind !== 'confirm-branch')
        g.moves++;
    g.hintStage = 0;
    if (event.kind === 'expand')
        g.expanded++;
    if (event.kind === 'combine')
        g.combined++;
}
export function validate(g: Game): 'branch' | 'win' {
    if (g.s.branches.length && !g.s.answer) {
        if (!terminal(g.s.eq)) throw Error('Isole x dans cette branche avant de la valider.');
        if (!g.s.completed[g.s.branch]) perform(g, { kind: 'confirm-branch' });
        const next = g.s.completed.findIndex(solution => !solution);
        if (next >= 0) {
            perform(g, { kind: 'branch', index: next });
            return 'branch';
        }
        perform(g, { kind: 'collect' });
    }
    const s = g.s;
    if (!s.answer && !terminal(s.eq)) throw Error('L’équation est équivalente, mais pas encore résolue. Isole x ou construis l’ensemble des racines.');
    const answer = s.answer ?? solve(s.eq);
    if (solutionKey(answer) !== solutionKey(solve(g.level.initial))) throw Error('Il manque une solution. Vérifie toutes les branches.');
    s.answer = answer; g.won = true; return 'win';
}
export function undo(g: Game): boolean { if (g.won || !g.history.length)
    return false; g.s = g.history.pop()!; g.events.pop(); g.hintStage = 0; return true; }
export function score(g: Pick<Game, 'errors' | 'hints' | 'moves' | 'level'>): number { return g.errors === 0 && g.hints === 0 && g.moves <= g.level.budget ? 3 : g.errors <= 1 && g.hints <= 1 ? 2 : 1; }
export function suggestion(g: Game): {
    text: string;
    action?: Event;
    ids?: string[];
} {
    const { eq, branches, completed } = g.s;
    if (branches.length && completed.every(Boolean) && !g.s.answer)
        return { text: 'Toutes les portes sont résolues. Réunis leurs solutions.', action: { kind: 'collect' } };
    if (branches.length && completed[g.s.branch]) {
        const index = completed.findIndex(s => !s);
        if (index >= 0)
            return { text: 'Explore maintenant une autre branche.', action: { kind: 'branch', index } };
    }
    if (terminal(eq) || g.s.answer)
        return { text: 'La forme de résolution est atteinte. Tu peux valider.' };
    if (g.level.world >= 4 && !branches.length) {
        try {
            zeroBranches(eq);
            return { text: 'Le produit est égal à zéro. Ouvre ses branches.', action: { kind: 'split' } };
        }
        catch { /* Not a zero product. */ }
    }
    for (const side of ['l', 'r'] as const) {
        const e = side === 'l' ? eq.left : eq.right;
        const tt = terms(e);
        for (let i = 0; i < tt.length; i++) {
            const id = e.kind === 'sum' ? `${side}.${i}` : side;
            if (expandable(tt[i]))
                return { text: 'Développe la parenthèse en distribuant le facteur à tous ses termes.', action: { kind: 'expand', id }, ids: [id] };
            if (tt[i].kind === 'fraction' && !monomial(tt[i]))
                return { text: 'Simplifie la fraction à dénominateur constant.', action: { kind: 'simplify', id }, ids: [id] };
            for (let j = i + 1; j < tt.length; j++) {
                const a = monomial(tt[i]), b = monomial(tt[j]);
                if (a && b && a.degree === b.degree)
                    return { text: 'Fusionne ces deux termes semblables dans le même membre.', action: { kind: 'combine', ids: [`${side}.${i}`, `${side}.${j}`] }, ids: [`${side}.${i}`, `${side}.${j}`] };
            }
        }
    }
    if (g.level.world >= 4 && !branches.length) {
        try {
            zeroBranches(eq);
            return { text: 'Le produit est égal à zéro. Ouvre ses branches.', action: { kind: 'split' } };
        }
        catch { /* Not a zero product. */ }
    }
    if (g.level.world === 4 && !branches.length && isZero(eq.right) && factorable(eq.left))
        return { text: 'Factorise le membre de gauche pour faire apparaître un produit nul.', action: { kind: 'factor', id: 'l' }, ids: ['l'] };
    const l = normalize(eq.left), r = normalize(eq.right);
    if (!zero(l[2]) || !zero(r[2])) {
        if (!isZero(eq.right)) {
            const index = [0, 1].find(i => !zero(r[i]));
            if (index !== undefined)
                return { text: 'Ramène les termes à gauche en ajoutant leur opposé aux deux membres.', action: { kind: 'add', expression: mono(neg(r[index]), index) } };
        }
        if (g.level.world === 5)
            return g.s.delta ? { text: 'Applique la formule exacte des racines.', action: { kind: 'roots' } } : { text: 'Identifie a, b et c puis calcule le discriminant.', action: { kind: 'delta' } };
    }
    if (!zero(r[1]))
        return { text: 'Ajoute l’opposé du terme en x de droite aux deux membres.', action: { kind: 'add', expression: mono(neg(r[1]), 1) } };
    if (!zero(l[0]))
        return { text: 'Neutralise la constante de gauche en ajoutant son opposé aux deux membres.', action: { kind: 'add', expression: c(neg(l[0])) } };
    if (!zero(l[1]) && !one(l[1]))
        return { text: 'Divise les deux membres par le coefficient de x, qui est non nul.', action: { kind: 'divide', constant: l[1] } };
    return { text: 'Réduis les termes semblables pour mettre en évidence une identité ou une contradiction.' };
}
