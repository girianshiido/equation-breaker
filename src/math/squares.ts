import { c, nodeAt, sum, product, x, terms, type Equation, type Expr } from './ast';
import { monomial } from './normalize';
import { div, mul, neg, one, rat, gcd, zero, type Rational } from './rational';
import { rootExpr, sRoot, sMul, scalar, scalarExpr, exactPoly, pAdd, pSub, exactFromPoly, sZero, sSign } from './exact';

function pair(eq:Equation,ids:string[]) {
    if(ids.length!==2||ids[0]===ids[1])throw Error('Sélectionne deux termes distincts.');
    const parent=ids[0].split('.').slice(0,-1).join('.');
    if(!/^[lr]$/.test(parent)||parent!==ids[1].split('.').slice(0,-1).join('.'))throw Error('Sélectionne deux termes de la même somme.');
    const original=nodeAt(eq,parent);if(original.kind!=='sum')throw Error('Sélectionne deux termes de la même somme.');
    const indices=ids.map(id=>Number(id.split('.')[1]));
    return {parent,original,indices,nodes:ids.map(id=>nodeAt(eq,id))};
}
function replacingPair(original:Expr,indices:number[],replacement:Expr[]):Expr {
    if(original.kind!=='sum')throw Error('Une somme est attendue.');
    const out=original.terms.filter((_,i)=>!indices.includes(i));out.splice(Math.min(...indices),0,...replacement);return sum(...out);
}
export function squareCompletion(eq: Equation, ids: string[], local=true): { side: 'l' | 'r'; parent: string; expression: Expr; added: Rational } {
    const {parent,original,indices,nodes}=pair(eq,ids),mm=nodes.map(monomial);
    const quadratic=mm.find(m=>m?.degree===2),linear=mm.find(m=>m?.degree===1);
    if(!quadratic||!linear||quadratic.q.n<=0n)throw Error('Sélectionne ax² et bx avec a positif. Multiplie d’abord par −1 si nécessaire.');
    if(!local&&!one(quadratic.q))throw Error('Le coefficient doit être 1 pour cet ancien geste.');
    const half=div(linear.q,mul(rat(2),quadratic.q)),added=div(mul(linear.q,linear.q),mul(rat(4),quadratic.q));
    const base=local?sum(product(rootExpr(quadratic.q),x()),scalarExpr(sMul(scalar(half),sRoot(quadratic.q)))):sum(x(),c(half));
    const square:Expr=local?{kind:'square',base}:{kind:'power',base,exponent:2};
    return {side:parent as 'l'|'r',parent,expression:replacingPair(original,indices,local?[square,c(neg(added))]:[square]),added};
}
export function signedSquare(e:Expr):{base:Expr;sign:1|-1}|null {
    if(e.kind==='square'||(e.kind==='power'&&e.exponent===2))return {base:e.base,sign:1};
    if(e.kind==='product'&&e.factors.length===2&&e.factors[0].kind==='constant'&&e.factors[0].value.n===-e.factors[0].value.d){const square=signedSquare(e.factors[1]);if(square)return{base:square.base,sign:square.sign===1?-1:1};}
    return null;
}
export function writeSquare(e:Expr):Expr {
    if(signedSquare(e))throw Error('Ce terme est déjà écrit comme un carré.');
    const m=monomial(e);if(!m||zero(m.q)||![0,2].includes(m.degree))throw Error('Choisis un nombre non nul ou un terme en x².');
    const positive=m.q.n<0n?neg(m.q):m.q;
    const root=rootExpr(positive),base=m.degree?product(root,x()):root;
    const square:Expr={kind:'square',base};return m.q.n<0n?product(c(-1),square):square;
}
export function differenceOfSquares(eq:Equation,ids:string[]):{parent:string;expression:Expr} {
    const {parent,original,indices,nodes}=pair(eq,ids),squares=nodes.map(signedSquare);
    const a=squares.find(s=>s?.sign===1),b=squares.find(s=>s?.sign===-1);
    if(!a||!b)throw Error('Écris les deux termes comme des carrés : a² − b².');
    const plus=exactFromPoly(pAdd(exactPoly(a.base),exactPoly(b.base))),minus=exactFromPoly(pSub(exactPoly(a.base),exactPoly(b.base)));
    return {parent,expression:replacingPair(original,indices,[product(plus,minus)])};
}
export function commonFactor(eq:Equation,ids:string[],maximal=false):{parent:string;expression:Expr;factor:Expr;q:Rational} {
    const {parent,original,indices,nodes}=pair(eq,ids),mm=nodes.map(monomial);
    const a=mm.find(m=>m?.degree===2),b=mm.find(m=>m?.degree===1);
    if(!a||!b||zero(a.q)||zero(b.q))throw Error('Sélectionne ax² et bx pour mettre x en facteur.');
    const common=maximal?rat(gcd(a.q.n,b.q.n),a.q.d*b.q.d/gcd(a.q.d,b.q.d)):rat(1);
    const factor=one(common)?x():product(c(common),x());
    const inside=sum(product(c(div(a.q,common)),x()),c(div(b.q,common)));
    return {parent,expression:replacingPair(original,indices,[product(factor,inside)]),factor,q:common};
}
export function positiveSquareSum(eq:Equation):boolean {
    const source=exactPoly(eq.right).every(sZero)?eq.left:exactPoly(eq.left).every(sZero)?eq.right:null;
    if(!source)return false;
    let strict=false;
    for(const term of terms(source)) {
        const p=exactPoly(term);
        if(sZero(p[1])&&sZero(p[2])){const sign=sSign(p[0]);if(sign<0)return false;if(sign>0)strict=true;}
        else if(signedSquare(term)?.sign!==1)return false;
    }
    return strict;
}
export function squareEquation(eq: Equation): { base: Expr; value: Rational } {
    for (const [square, constant] of [[eq.left, eq.right], [eq.right, eq.left]]) {
        const m = monomial(constant),signed=signedSquare(square);
        if(signed?.sign===1&&m?.degree===0)return {base:signed.base,value:m.q};
    }
    throw Error('Isole d’abord le carré : (x + a)² = k.');
}
