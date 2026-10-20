import { exactPoly, exactMono, sZero, rational, sSign, rootExpr, scalar, sEqual, scalarExpr, sNeg } from '../math/exact';
import { squareEquation, positiveSquareSum, differenceOfSquares, squareCompletion, writeSquare, commonFactor } from '../math/squares';
import { format, operandText } from '../math/format';
import { type Equation, type Expr, c, product, nodeAt, terms, x } from '../math/ast';
import { type Action, transform, zeroBranches, quadraticInfo, expandable, factorable } from '../math/transformations';
import { normalize, monomial, isZero, mono } from '../math/normalize';
import { rat, zero, one, neg, str, sqrtRational } from '../math/rational';
import { terminal, solve, union, solutionKey, solutionsEqual, type Solution, solutionText } from '../math/solve';
import { equationText } from '../math/format';
import type { Level } from '../levels/campaign';
export type Event = Action | { kind: 'square-roots'; exact?:boolean } | {kind:'no-real'} | {
    kind: 'split';
    distinct?: boolean;
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
        s.branches = zeroBranches(s.eq, event.distinct !== false);
        s.completed = s.branches.map(() => null);
        s.branch = 0;
        s.eq = s.branches[0];
        s.delta = false;
        s.answer = null;
        s.label = s.branches.length === 1 ? 'Un seul cas : annuler le facteur' : 'Produit nul : distinguer les cas';
        s.why = s.branches.length === 1 ? 'Un carré est nul si et seulement si sa base est nulle : X² = 0 ⇔ X = 0. Des facteurs ayant les mêmes zéros donnent un seul cas.' : 'AB = 0 ⇔ A = 0 ou B = 0. Chaque cas doit être résolu ; les solutions seront réunies.';
    }
    else if (event.kind === 'branch') {
        if (!s.branches[event.index])
            throw Error('Cas inexistant.');
        s.branches[s.branch] = s.eq;
        s.branch = event.index;
        s.eq = s.branches[event.index];
        s.delta = false;
        s.answer = null;
        s.label = `Explorer le cas ${event.index + 1}`;
        s.why = 'Les solutions des cas seront réunies, jamais intersectées.';
    }
    else if (event.kind === 'confirm-branch') {
        if (s.branch < 0 || !terminal(s.eq))
            throw Error('Isole x dans ce cas avant de le valider.');
        const solution = solve(s.eq);
        // Confirm equivalent doors together when replaying a save from an older version.
        s.branches.forEach((eq, i) => { if (solutionsEqual(solve(eq),solution)) s.completed[i] = solution; });
        s.label = `Cas ${s.branch + 1} validé : ${solutionText(s.completed[s.branch]!)}`;
        s.why = 'Explore les autres cas puis réunis leurs solutions.';
    }
    else if (event.kind === 'square-roots') {
        if (g.level.world < 4 || s.branches.length) throw Error('Isole un carré dans une équation du second degré.');
        const square = squareEquation(s.eq);
        s.delta = false;
        const exactRoot = sqrtRational(square.value);
        if(square.value.n<0n){s.answer={kind:'none'};s.label='Un carré réel ne peut pas être négatif';}
        else if(event.exact!==false||exactRoot){
            const root=event.exact===false?c(exactRoot!):rootExpr(square.value);
            const roots=zero(square.value)?[root]:[root,product(c(-1),root)];
            s.branches=roots.map(right=>({left:square.base,right}));s.completed=roots.map(()=>null);s.branch=0;s.eq=s.branches[0];s.answer=null;
            s.label=`${format(square.base)} = ${format(root)}${roots.length===2?` ou ${format(square.base)} = −${format(root)}`:''}`;
        }else{s.answer=solve(s.eq);s.label='Construire les deux racines exactes';}
        s.why='X² = k : si k = 0, un seul cas X = 0 ; si k > 0, X = √k ou X = −√k. Les racines et les fractions restent exactes.';
    }
    else if(event.kind==='no-real'){
        if(!positiveSquareSum(s.eq))throw Error('Il faut un carré plus une constante strictement positive, égal à zéro.');
        s.answer={kind:'none'};s.delta=false;s.label='Aucune solution réelle : un carré plus un nombre strictement positif';
        s.why='Un carré réel est positif ou nul. Lui ajouter une quantité strictement positive ne peut jamais donner zéro.';
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
            throw Error('Résous tous les cas avant de réunir leurs solutions.');
        s.answer = union(s.completed as Solution[]);
        s.label = 'Réunir les solutions des cas';
        s.why = 'On prend l’union de toutes les solutions et on retire les doublons.';
    }
    else {
        if (event.kind === 'complete-square' && g.level.world < 4) throw Error('La complétion du carré appartient aux équations du second degré.');
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
/** Keep the active representative when replaying an older save with duplicate doors. */
export function visibleBranchIndices(s: Snapshot): number[] {
    const representatives:number[]=[];
    s.branches.forEach((eq,i)=>{
        const existing=representatives.findIndex(j=>solutionsEqual(solve(s.branches[j]),solve(eq)));
        if(existing<0)representatives.push(i);else if(i===s.branch)representatives[existing]=i;
    });
    return representatives;
}
export function validate(g: Game): 'branch' | 'win' {
    if (g.s.branches.length && !g.s.answer) {
        if (!terminal(g.s.eq)) throw Error('Isole x dans ce cas avant de le valider.');
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
    if (!solutionsEqual(answer,solve(g.level.initial))) throw Error('Il manque une solution. Vérifie tous les cas.');
    s.answer = answer; g.won = true; return 'win';
}
export function undo(g: Game): boolean { if (g.won || !g.history.length)
    return false; g.s = g.history.pop()!; g.events.pop(); g.hintStage = 0; return true; }
export function score(g: Pick<Game, 'errors' | 'hints' | 'moves' | 'level'>): number { return g.errors === 0 && g.hints === 0 && g.moves <= g.level.budget ? 3 : g.errors <= 1 && g.hints <= 1 ? 2 : 1; }
export function suggestion(g: Game): { text:string; action?:Event; ids?:string[] } {
    const {eq,branches,completed}=g.s;
    if(branches.length&&completed.every(Boolean)&&!g.s.answer)return {text:'Tous les cas sont résolus.',action:{kind:'collect'}};
    if(branches.length&&completed[g.s.branch]){const index=completed.findIndex(s=>!s);if(index>=0)return{text:'Explore le prochain cas.',action:{kind:'branch',index}};}
    if(terminal(eq)||g.s.answer)return{text:'La forme de résolution est atteinte. Tu peux valider.'};
    if(g.level.world>=4&&!branches.length){
        if(positiveSquareSum(eq))return{text:'Un carré plus un nombre strictement positif ne peut pas être nul.',action:{kind:'no-real'}};
        try{zeroBranches(eq);return{text:'Le produit est nul. Distingue les cas.',action:{kind:'split'}};}catch{/* Prepare the factors. */}
        try{squareEquation(eq);return{text:'Le carré est isolé : utilise les deux signes, ou un seul cas pour zéro.',action:{kind:'square-roots'}};}catch{/* Prepare the square. */}
    }
    const lp=exactPoly(eq.left),rp=exactPoly(eq.right),quadratic=!sZero(lp[2])||!sZero(rp[2]);
    const idsFor=(side:'l'|'r',e:Expr)=>terms(e).map((_,i)=>e.kind==='sum'?`${side}.${i}`:side);
    if(quadratic&&g.level.world>=4&&!branches.length){
        if(!isZero(eq.right)){
            const tt=terms(eq.right),index=tt.findIndex(t=>{const m=exactMono(t);return !!m&&!sZero(m.q);});
            if(index>=0)return{text:'Ramène ce terme à gauche pour obtenir zéro à droite.',action:{kind:'drag',id:idsFor('r',eq.right)[index],part:'term'}};
        }
        const tt=terms(eq.left),ids=idsFor('l',eq.left);
        for(let i=0;i<tt.length;i++)for(let j=i+1;j<tt.length;j++){
            const a=exactMono(tt[i]),b=exactMono(tt[j]);
            if(a&&b&&a.degree===b.degree)return{text:'Fusionne ces termes semblables.',action:{kind:'combine',ids:[ids[i],ids[j]]},ids:[ids[i],ids[j]]};
            try{differenceOfSquares(eq,[ids[i],ids[j]]);return{text:'Les deux carrés sont prêts : utilise a² − b².',action:{kind:'difference-squares',ids:[ids[i],ids[j]]},ids:[ids[i],ids[j]]};}catch{/* Not a prepared difference. */}
        }
        const a=rational(lp[2]);if(a&&a.n<0n)return{text:'Multiplie par −1 pour obtenir un coefficient positif devant x².',action:{kind:'multiply',constant:rat(-1)}};
        for(let i=0;i<tt.length;i++)for(let j=i+1;j<tt.length;j++){
            if(sZero(lp[0]))try{commonFactor(eq,[ids[i],ids[j]],true);return{text:'Sélectionne les deux termes et mets leur facteur commun en évidence.',action:{kind:'factor-common',ids:[ids[i],ids[j]],maximal:true},ids:[ids[i],ids[j]]};}catch{/* No common x. */}
            try{squareCompletion(eq,[ids[i],ids[j]]);return{text:'Sélectionne ax² et bx pour compléter le carré avec sa compensation.',action:{kind:'complete-square',ids:[ids[i],ids[j]]},ids:[ids[i],ids[j]]};}catch{/* Not this pair. */}
        }
        for(let i=0;i<tt.length;i++)try{writeSquare(tt[i]);return{text:'Écris ce terme comme un carré avant de choisir l’identité.',action:{kind:'write-square',id:ids[i]},ids:[ids[i]]};}catch{/* Already a square. */}
    }
    for(const side of ['l','r'] as const){
        const e=side==='l'?eq.left:eq.right,tt=terms(e),ids=idsFor(side,e);
        for(let i=0;i<tt.length;i++){
            for(let j=i+1;j<tt.length;j++){const a=exactMono(tt[i]),b=exactMono(tt[j]);if(a&&b&&a.degree===b.degree)return{text:'Fusionne ces deux termes semblables.',action:{kind:'combine',ids:[ids[i],ids[j]]},ids:[ids[i],ids[j]]};}
            if(expandable(tt[i]))return{text:'Développe la parenthèse avec les signes de ses termes.',action:{kind:'expand',id:ids[i]},ids:[ids[i]]};
            if(tt[i].kind==='fraction'&&!monomial(tt[i]))return{text:'Simplifie cette fraction.',action:{kind:'simplify',id:ids[i]},ids:[ids[i]]};
        }
    }
    for(const [side,e,degree] of [['r',eq.right,1],['l',eq.left,0]] as const){
        const tt=terms(e),ids=idsFor(side,e),i=tt.findIndex(t=>exactMono(t)?.degree===degree&&!sZero(exactMono(t)!.q));
        if(i>=0)return{text:'Déplace ce terme dans l’autre membre en ajoutant son opposé.',action:{kind:'drag',id:ids[i],part:'term'},ids:[ids[i]]};
    }
    const tt=terms(eq.left),ids=idsFor('l',eq.left),i=tt.findIndex(t=>exactMono(t)?.degree===1);
    if(i>=0){const q=exactMono(tt[i])!.q,r=rational(q);if(!sEqual(q,scalar(1)))return{text:'Divise les deux membres par le coefficient exact de x.',action:{kind:'drag',id:ids[i],part:r?'rational-coefficient':'algebraic-coefficient'},ids:[ids[i]]};}
    return{text:'Réduis l’expression ou prépare une identité remarquable.'};
}
