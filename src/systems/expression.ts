import { rat, add, mul, neg, one, zero, str, type Rational } from '../math/rational';

/** Written linear expressions preserve the player's parentheses and repeated terms. */
export type LinearExpr = {kind:'constant';value:Rational} | {kind:'variable';variable:number} | {kind:'sum';terms:LinearExpr[]} | {kind:'scale';factor:Rational;body:LinearExpr};
export const constant=(value:Rational):LinearExpr=>({kind:'constant',value});
export const variable=(index:number):LinearExpr=>({kind:'variable',variable:index});
export const expressionTerms=(e:LinearExpr):LinearExpr[]=>e.kind==='sum'?e.terms:[e];
export function expressionSum(terms:LinearExpr[]):LinearExpr{terms=terms.filter(t=>t.kind!=='constant'||!zero(t.value));return terms.length===0?constant(rat(0)):terms.length===1?terms[0]:{kind:'sum',terms};}
export function negateExpression(e:LinearExpr):LinearExpr{return e.kind==='constant'?constant(neg(e.value)):e.kind==='scale'?scaled(neg(e.factor),e.body):scaled(rat(-1),e);}
export function scaled(factor:Rational,body:LinearExpr):LinearExpr{return zero(factor)?constant(rat(0)):one(factor)?body:{kind:'scale',factor,body};}
export function fromAffine(coefficients:Rational[],value:Rational):LinearExpr{
 const terms:LinearExpr[]=coefficients.flatMap((q,j)=>zero(q)?[]:[scaled(q,variable(j))]);
 if(!zero(value)||!terms.length)terms.push(constant(value));return expressionSum(terms);
}
export function evaluateExpression(e:LinearExpr,n:number):{coefficients:Rational[];constant:Rational}{
 if(e.kind==='constant')return {coefficients:Array.from({length:n},()=>rat(0)),constant:e.value};
 if(e.kind==='variable')return {coefficients:Array.from({length:n},(_,j)=>rat(j===e.variable?1:0)),constant:rat(0)};
 if(e.kind==='scale'){const body=evaluateExpression(e.body,n);return {coefficients:body.coefficients.map(q=>mul(q,e.factor)),constant:mul(body.constant,e.factor)};}
 return e.terms.reduce((a,t)=>{const b=evaluateExpression(t,n);return {coefficients:a.coefficients.map((q,j)=>add(q,b.coefficients[j])),constant:add(a.constant,b.constant)};},{coefficients:Array.from({length:n},()=>rat(0)),constant:rat(0)});
}
export function simpleTerm(e:LinearExpr):{q:Rational;variable:number|null}|null{
 if(e.kind==='constant')return {q:e.value,variable:null};if(e.kind==='variable')return {q:rat(1),variable:e.variable};
 if(e.kind==='scale'&&e.body.kind==='variable')return {q:e.factor,variable:e.body.variable};return null;
}
export function scaleExpression(e:LinearExpr,q:Rational):LinearExpr{
 // Scaling an equation changes outer coefficients without opening parentheses.
 return expressionSum(expressionTerms(e).map(t=>t.kind==='constant'?constant(mul(t.value,q)):t.kind==='scale'?scaled(mul(t.factor,q),t.body):scaled(q,t)));
}
export function replaceVariable(e:LinearExpr,j:number,replacement:LinearExpr):LinearExpr{
 if(e.kind==='variable')return e.variable===j?replacement:e;
 if(e.kind==='sum')return {kind:'sum',terms:e.terms.map(t=>replaceVariable(t,j,replacement))};
 if(e.kind==='scale')return {...e,body:replaceVariable(e.body,j,replacement)};return e;
}
export function hasVariable(e:LinearExpr,j?:number):boolean{return e.kind==='variable'?(j===undefined||e.variable===j):e.kind==='sum'?e.terms.some(t=>hasVariable(t,j)):e.kind==='scale'?hasVariable(e.body,j):false;}
export const canExpand=(e:LinearExpr)=>simpleTerm(e)===null;
export function expandExpression(e:LinearExpr,q=rat(1)):LinearExpr[]{
 if(e.kind==='sum')return e.terms.flatMap(t=>expandExpression(t,q));
 if(e.kind==='scale')return expandExpression(e.body,mul(q,e.factor));
 return [e.kind==='constant'?constant(mul(q,e.value)):scaled(q,e)];
}
export function signedExpression(e:LinearExpr):{negative:boolean;absolute:LinearExpr}{
 if(e.kind==='constant'&&e.value.n<0n)return {negative:true,absolute:constant(neg(e.value))};
 if(e.kind==='scale'&&e.factor.n<0n)return {negative:true,absolute:scaled(neg(e.factor),e.body)};
 return {negative:false,absolute:e};
}
export function expressionText(e:LinearExpr,names:readonly string[]):string{
 if(e.kind==='constant')return str(e.value);if(e.kind==='variable')return names[e.variable];
 if(e.kind==='sum')return e.terms.map((t,i)=>{const {negative,absolute}=signedExpression(t);return `${negative?(i?' − ':'-'):(i?' + ':'')}${expressionText(absolute,names)}`;}).join('');
 const b=expressionText(e.body,names);
 return `${e.body.kind==='variable'&&e.factor.n===-e.factor.d?'-':str(e.factor)}${e.body.kind==='variable'?b:e.body.kind==='sum'?`(${b})`:` × ${b.startsWith('-')?`(${b})`:b}`}`;
}
export function boundExpression(e:LinearExpr):void{
 let count=0;const visit=(node:LinearExpr,depth:number)=>{if(++count>800||depth>30)throw Error('Cette expression devient trop longue. Développe ou fusionne quelques termes avant de continuer.');
 const q=node.kind==='constant'?node.value:node.kind==='scale'?node.factor:null;if(q&&(q.n.toString().length>80||q.d.toString().length>80))throw Error('Les nombres deviennent trop grands.');
 if(node.kind==='sum')node.terms.forEach(t=>visit(t,depth+1));if(node.kind==='scale')visit(node.body,depth+1);
 };visit(e,0);
}
