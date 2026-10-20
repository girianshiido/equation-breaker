import { expressionTerms, expressionText, signedExpression, simpleTerm, negateExpression, hasVariable, type LinearExpr } from './expression';
import { math, fenced } from '../ui/math';
import { c } from '../math/ast';
import { escape } from '../math/format';
import { zero, one, neg, str, type Rational } from '../math/rational';
import { variables, displayParts, writtenSides, writtenTerm, type Row, type Side, type Reduction } from './engine';
export const qMath=(q:Rational)=>math(c(q));
export function variableTerm(q:Rational,variable:string):string {
    const abs=q.n<0n?neg(q):q;
    const numerator=`<span data-system-grip="numerator">${abs.n===1n?'':abs.n}</span><i data-system-grip="coefficient">${escape(variable)}</i>`;
    return abs.d===1n?numerator:`<span class="fraction"><span>${numerator}</span><span data-system-grip="denominator">${abs.d}</span></span>`;
}
export function affine(coefficients:Rational[],constant:Rational,names:readonly string[]=variables):string {
    let content='',seen=false;
    coefficients.forEach((q,j)=>{if(zero(q))return;content+=`${q.n<0n?' − ':seen?' + ':''}${variableTerm(q,names[j])}`;seen=true;});
    if(!zero(constant)||!seen)content+=`${constant.n<0n?' − ':seen?' + ':''}${qMath(constant.n<0n?neg(constant):constant)}`;
    return content;
}
export function termValue(row:Row,side:Side,variable:number|null):Rational{const p=displayParts(row);return variable===null?(side==='left'?p.leftConstant:p.rightConstant):(side==='left'?p.leftVariables:p.rightVariables)[variable];}
export function carriedTerm(row:Row,side:Side,variable:number|null,reversed=false):string{let q=termValue(row,side,variable);if(reversed)q=neg(q);return `${q.n<0n?'−':''}${variable===null?qMath(q.n<0n?neg(q):q):variableTerm(q,variables[variable])}`;}

function writtenMath(e:LinearExpr):string {
 if(e.kind==='constant')return qMath(e.value);
 if(e.kind==='variable')return `<i data-system-grip="coefficient">${variables[e.variable]}</i>`;
 if(e.kind==='sum')return fenced(expressionTerms(e).map((t,i)=>{const {negative,absolute}=signedExpression(t);return `<span class="sys-sign ${i?'sys-binary-sign':'sys-unary-sign'}">${negative?'−':i?'+':''}</span>${writtenMath(absolute)}`;}).join(''));
 const negative=e.factor.n<0n,abs=negative?neg(e.factor):e.factor;
 if(e.body.kind==='variable')return `${negative?'−':''}${variableTerm(abs,variables[e.body.variable])}`;
 const body=writtenMath(e.body),coefficient=`<span data-system-grip="numerator">${abs.n===1n?'':abs.n}</span>`;
 const multiplication=e.body.kind==='sum'?'':abs.n===1n?'':' × ';
 const shown=e.body.kind==='constant'&&e.body.value.n<0n?fenced(body):body;
 return `${negative?'−':''}${abs.d===1n?`${coefficient}${multiplication}${shown}`:`<span class="fraction"><span>${coefficient}${multiplication}${shown}</span><span data-system-grip="denominator">${abs.d}</span></span>`}`;
}
export function carriedWrittenTerm(row:Row,side:Side,index:number,reversed=false):string{const e=writtenTerm(row,side,index);return writtenMath(reversed?negateExpression(e):e);}
function writtenSideHTML(e:LinearExpr,row:number,side:Side,interactive:boolean):string{
 return expressionTerms(e).map((node,index)=>{
  const {negative,absolute}=signedExpression(node),simple=simpleTerm(node),j=simple?.variable;
  const content=`<span class="sys-sign ${index?'sys-binary-sign':'sys-unary-sign'}">${negative?'−':index?'+':''}</span><span>${writtenMath(absolute)}</span>`;
  return interactive?`<button class="sys-variable sys-term" aria-keyshortcuts="Alt+${side==='left'?'ArrowRight':'ArrowLeft'}" data-written-term="${index}" data-system-term="${j===null?'constant':j===undefined?'group':j}" ${j===null||j===undefined?'':`data-variable="${j}"`} data-row="${row}" data-side="${side}" aria-label="Sélectionner ${escape(expressionText(node,variables))} dans la ligne ${row+1}"><span>${content}</span></button>`:`<span class="sys-term">${content}</span>`;
 }).join('');
}
export function rowSides(row:Row,rowIndex:number,interactive=true):[string,string]{
 if(row.written)return [writtenSideHTML(row.written.left,rowIndex,'left',interactive),writtenSideHTML(row.written.right,rowIndex,'right',interactive)];
 const p=displayParts(row);
 const renderSide=(coefficients:Rational[],constant:Rational,side:Side)=>{
  let seen=false;
  const term=(q:Rational,j:number|null)=>{const binary=seen,sign=q.n<0n?'−':seen?'+':'';seen=true;const abs=q.n<0n?neg(q):q;const value=j===null?(q.d===1n?qMath(abs):`<span class="fraction"><span>${abs.n}</span><span data-system-grip="denominator">${abs.d}</span></span>`):variableTerm(q,variables[j]);const content=`<span class="sys-sign ${binary?'sys-binary-sign':'sys-unary-sign'}">${sign}</span><span>${value}</span>`;
   return interactive?`<button class="sys-variable sys-term" aria-keyshortcuts="Alt+${side==='left'?'ArrowRight':'ArrowLeft'}" data-system-term="${j===null?'constant':j}" ${j===null?'':`data-variable="${j}"`} data-side="${side}" data-row="${rowIndex}" aria-label="Sélectionner ${j===null?'la constante':variables[j]} dans la ligne ${rowIndex+1}, membre ${side==='left'?'gauche':'droit'}"><span>${content}</span></button>`:`<span class="sys-term">${content}</span>`;};
  const body=coefficients.map((q,j)=>zero(q)?'':term(q,j)).join('')+(!zero(constant)?term(constant,null):'');
  return seen?body:'0';
 };
 return[renderSide(p.leftVariables,p.leftConstant,'left'),renderSide(p.rightVariables,p.rightConstant,'right')];
}
export const equationHTML=(row:Row,index:number,interactive=true)=>{const [left,right]=rowSides(row,index,interactive);return `<span class="sys-side sys-left"><span class="sys-expression">${left}</span></span><span class="sys-equal">=</span><span class="sys-side sys-right"><span class="sys-expression">${right}</span></span>`;};
export function rowText(row:Row):string{
 if(row.written)return `${expressionText(row.written.left,variables)} = ${expressionText(row.written.right,variables)}`;
 const p=displayParts(row);
 const side=(coefficients:Rational[],constant:Rational)=>{const parts=coefficients.map((q,j)=>zero(q)?'':`${str(q)}${variables[j]}`).filter(Boolean);if(!zero(constant))parts.push(str(constant));return(parts.join(' + ').replaceAll('+ -','− ')||'0').replace(/(^| )1([xyz])/g,'$1$2').replaceAll('-1x','−x').replaceAll('-1y','−y').replaceAll('-1z','−z');};
 return `${side(p.leftVariables,p.leftConstant)} = ${side(p.rightVariables,p.rightConstant)}`;
}
export function solutionHTML(solution:Reduction):string {
    if(solution.kind==='none')return 'S = ∅';
    const n=solution.values.length;
    if(solution.kind==='unique')return `S = ${fenced(fenced(solution.values.map(qMath).join(' ; ')),'set')}`;
    if(solution.free.length===n)return `S = ℝ<sup>${n}</sup>`;
    const parameters=['t','u','v'];
    const components=Array.from({length:n},(_,j)=>{
        const free=solution.free.indexOf(j);if(free>=0)return `<i>${parameters[free]}</i>`;
        const row=solution.rows[solution.pivots.indexOf(j)];
        return affine(solution.free.map(k=>neg(row.coefficients[k])),row.right,parameters);
    });
    return `S = ${fenced(`${fenced(components.join(' ; '))} <span class="sys-set-condition">| ${parameters.slice(0,solution.free.length).join(', ')} ∈ ℝ</span>`,'set')}`;
}
export function solutionText(solution:Reduction):string {
    if(solution.kind==='none')return 'S = ∅';
    if(solution.kind==='unique')return `S = { (${solution.values.map(str).join(' ; ')}) }`;
    return 'Le système possède une infinité de solutions.';
}
