import { type Expr, c, product, sum, x } from './ast';
import { type Rational, rat, add, sub, mul, div, neg, zero, one, equal, gcd, isqrt, sqrtRational } from './rational';

/** Exact real multiquadratic constants: sum(q * sqrt(n)), n positive integers. */
export type Scalar = ReadonlyMap<bigint, Rational>;
export type ExactPoly = [Scalar, Scalar, Scalar];
export const scalar = (q: Rational | number): Scalar => { const r = typeof q === 'number' ? rat(q) : q; return zero(r) ? new Map() : new Map([[1n, r]]); };
export const sZero = (a: Scalar) => a.size === 0;
export const rational = (a: Scalar): Rational | null => sZero(a) ? rat(0) : a.size === 1 && a.has(1n) ? a.get(1n)! : null;
const LIMIT = 16;
function put(out: Map<bigint, Rational>, n: bigint, q: Rational) {
    if (zero(q)) return;
    // Square-class comparison uses integer square roots, even for large unfactored radicands.
    for (const [r, coefficient] of out) {
        const root = isqrt(n * r);
        if (root * root !== n * r) continue;
        const next = add(coefficient, mul(q, rat(root, r)));
        if (zero(next)) out.delete(r); else out.set(r, next);
        return;
    }
    out.set(n, q);
    if (out.size > LIMIT) throw Error('Cette expression contient trop de racines différentes. Simplifie-la d’abord.');
}
export function sAdd(a: Scalar, b: Scalar): Scalar { const out = new Map(a); for (const [n,q] of b) put(out,n,q); return out; }
export const sNeg = (a: Scalar): Scalar => new Map([...a].map(([n,q]) => [n,neg(q)]));
export const sSub = (a: Scalar, b: Scalar) => sAdd(a,sNeg(b));
export function sMul(a: Scalar, b: Scalar): Scalar {
    const out = new Map<bigint,Rational>();
    for (const [n,q] of a) for (const [r,v] of b) {
        const g = gcd(n,r); put(out,(n/g)*(r/g),mul(mul(q,v),rat(g)));
    }
    return out;
}
export const sEqual = (a: Scalar,b: Scalar) => sZero(sSub(a,b));
export function sDiv(a: Scalar,b: Scalar): Scalar {
    if (sZero(b)) throw Error('On ne peut pas diviser par 0.');
    if (b.size === 1) {
        const [n,q] = [...b][0];
        return sMul(a,new Map([[n,div(rat(1),mul(q,rat(n)))]]));
    }
    // Build the finite square-class group, then solve b*y=1 over Q. No floating point.
    const basis: bigint[] = [1n];
    const locate = (n: bigint) => {
        for (let i=0;i<basis.length;i++) { const root=isqrt(n*basis[i]); if(root*root===n*basis[i]) return {i,q:rat(root,basis[i])}; }
        if(basis.length>=LIMIT) throw Error('Simplifie les racines avant cette division.');
        basis.push(n); return {i:basis.length-1,q:rat(1)};
    };
    for(let i=0;i<basis.length;i++) for(const n of b.keys()) { const g=gcd(basis[i],n); locate((basis[i]/g)*(n/g)); }
    const rows=basis.map(()=>basis.map(()=>rat(0)));
    basis.forEach((n,col)=>{ for(const [r,q] of b) { const g=gcd(n,r),target=locate((n/g)*(r/g)); rows[target.i][col]=add(rows[target.i][col],mul(q,mul(rat(g),target.q))); } });
    const rhs=basis.map((_,i)=>rat(i===0?1:0));
    for(let col=0;col<basis.length;col++) {
        const pivot=rows.findIndex((row,i)=>i>=col&&!zero(row[col]));
        if(pivot<0) throw Error('Division exacte impossible.');
        [rows[col],rows[pivot]]=[rows[pivot],rows[col]]; [rhs[col],rhs[pivot]]=[rhs[pivot],rhs[col]];
        const q=rows[col][col]; rows[col]=rows[col].map(v=>div(v,q)); rhs[col]=div(rhs[col],q);
        for(let i=0;i<rows.length;i++) if(i!==col&&!zero(rows[i][col])) { const scale=rows[i][col]; rows[i]=rows[i].map((v,j)=>sub(v,mul(scale,rows[col][j]))); rhs[i]=sub(rhs[i],mul(scale,rhs[col])); }
    }
    return sMul(a,new Map(basis.flatMap((n,i)=>zero(rhs[i])?[]:[[n,rhs[i]] as const])));
}
const roots = new Map<string,Scalar>();
export function sRoot(q: Rational): Scalar {
    if(q.n<0n) throw Error('Un nombre négatif ne s’écrit pas comme le carré d’un réel.');
    const key=`${q.n}/${q.d}`, cached=roots.get(key); if(cached) return cached;
    const exact=sqrtRational(q); if(exact) return scalar(exact);
    let n=q.n*q.d,out=1n;
    for(let k=2n;k*k<=n&&k<=10000n;k++) while(n%(k*k)===0n) {n/=k*k;out*=k;}
    const root=isqrt(n); if(root*root===n) {out*=root;n=1n;}
    const value:Scalar=new Map([[n,rat(out,q.d)]]);
    if(roots.size>256) roots.clear(); roots.set(key,value); return value;
}
export function sSign(a:Scalar): -1|0|1 {
    if(sZero(a)) return 0;
    for(let bits=16;bits<=1024;bits*=2) {
        const scale=1n<<BigInt(bits); let lo=rat(0),hi=rat(0);
        for(const [n,q] of a) {
            const r=isqrt(n*scale*scale),lower=rat(r,scale),upper=r*r===n*scale*scale?lower:rat(r+1n,scale);
            lo=add(lo,mul(q,q.n<0n?upper:lower)); hi=add(hi,mul(q,q.n<0n?lower:upper));
        }
        if(lo.n>0n) return 1; if(hi.n<0n) return -1;
    }
    throw Error('Expression trop complexe pour déterminer son signe exactement.');
}
export function scalarExpr(a: Scalar): Expr {
    const tt=[...a].sort(([n],[r])=>n<r?-1:1).map(([n,q]):Expr=> n===1n?c(q):one(q)?{kind:'radical',radicand:rat(n)}:product(c(q),{kind:'radical',radicand:rat(n)}));
    return tt.length?sum(...tt):c(0);
}
export const rootExpr=(q:Rational):Expr=>scalarExpr(sRoot(q));
export const pEmpty=():ExactPoly=>[scalar(0),scalar(0),scalar(0)];
export const pAdd=(a:ExactPoly,b:ExactPoly):ExactPoly=>a.map((v,i)=>sAdd(v,b[i])) as ExactPoly;
export const pSub=(a:ExactPoly,b:ExactPoly):ExactPoly=>a.map((v,i)=>sSub(v,b[i])) as ExactPoly;
export const pScale=(p:ExactPoly,q:Scalar):ExactPoly=>p.map(v=>sMul(v,q)) as ExactPoly;
export function pMul(a:ExactPoly,b:ExactPoly):ExactPoly {
    const p=pEmpty(); for(let i=0;i<3;i++) for(let j=0;j<3;j++) {if(i+j>2){if(!sZero(a[i])&&!sZero(b[j]))throw Error('Le degré dépasse 2.');}else p[i+j]=sAdd(p[i+j],sMul(a[i],b[j]));}return p;
}
const polynomials=new WeakMap<Expr,ExactPoly>();
export function exactPoly(e:Expr):ExactPoly {
    const cached=polynomials.get(e); if(cached)return cached;
    let p:ExactPoly;
    switch(e.kind) {
        case 'constant': p=[scalar(e.value),scalar(0),scalar(0)];break;
        case 'radical': p=[sRoot(e.radicand),scalar(0),scalar(0)];break;
        case 'variable': p=[scalar(0),scalar(1),scalar(0)];break;
        case 'sum': p=e.terms.map(exactPoly).reduce(pAdd,pEmpty());break;
        case 'product': p=e.factors.map(exactPoly).reduce(pMul,[scalar(1),scalar(0),scalar(0)]);break;
        case 'fraction': p=pScale(exactPoly(e.numerator),scalar(div(rat(1),e.denominator)));break;
        case 'quotient': {
            const d=exactPoly(e.denominator);if(!sZero(d[1])||!sZero(d[2]))throw Error('Le dénominateur doit être constant.');
            p=pScale(exactPoly(e.numerator),sDiv(scalar(1),d[0]));break;
        }
        case 'square': {const base=exactPoly(e.base);p=pMul(base,base);break;}
        case 'power': {const base=exactPoly(e.base);p=e.exponent===0?[scalar(1),scalar(0),scalar(0)]:e.exponent===1?base:pMul(base,base);break;}
    }
    polynomials.set(e,p);return p;
}
export const pEqual=(a:ExactPoly,b:ExactPoly)=>a.every((v,i)=>sEqual(v,b[i]));
export function rationalPoly(p:ExactPoly):[Rational,Rational,Rational] {
    const out=p.map(rational);if(out.some(v=>v===null))throw Error('Ce coefficient contient une racine carrée.');return out as [Rational,Rational,Rational];
}
export function hasExact(e:Expr):boolean {
    return e.kind==='radical'||e.kind==='quotient'||e.kind==='square'||(e.kind==='sum'&&e.terms.some(hasExact))||(e.kind==='product'&&e.factors.some(hasExact))||(e.kind==='power'&&hasExact(e.base))||(e.kind==='fraction'&&hasExact(e.numerator));
}
export function exactMono(e:Expr):{q:Scalar;degree:number}|null {
    if(e.kind==='square'||e.kind==='sum'){const p=exactPoly(e);return sZero(p[1])&&sZero(p[2])?{q:p[0],degree:0}:null;}
    if((e.kind==='product'&&e.factors.some(f=>!exactMono(f)))||(e.kind==='power'&&!exactMono(e.base))||(e.kind==='fraction'&&!exactMono(e.numerator)))return null;
    const p=exactPoly(e),ii=[0,1,2].filter(i=>!sZero(p[i]));return ii.length<=1?{q:p[ii[0]??0],degree:ii[0]??0}:null;
}
export function exactMonoExpr(q:Scalar,degree:number):Expr {if(!degree||sZero(q))return scalarExpr(q);const variable:Expr=degree===1?x():{kind:'power',base:x(),exponent:2};return sEqual(q,scalar(1))?variable:product(scalarExpr(q),variable);}
export const exactFromPoly=(p:ExactPoly):Expr=>sum(...[2,1,0].filter(i=>!sZero(p[i])).map(i=>exactMonoExpr(p[i],i)));
export function checkExactBounds(p:ExactPoly) {for(const v of p)for(const [n,q] of v)if(n.toString().length>80||q.n.toString().length>80||q.d.toString().length>80)throw Error('Les coefficients deviennent trop grands. Simplifie l’expression.');}
