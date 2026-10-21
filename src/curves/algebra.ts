import {rat,add,mul,div,neg,zero,one,str,readRational,type Rational} from '../math/rational';
import {scalar,sAdd,sMul,sZero,sEqual,sRoot,sNeg,exactPoly,type Scalar} from '../math/exact';
import {c,x,sum,product,type Expr,type Equation} from '../math/ast';
import {solve,rootExpression,type Root} from '../math/solve';
import {start,perform,validate,type Game} from '../gameplay/game';
import {eventRead} from '../gameplay/events';
import type {Level} from '../levels/campaign';
import type {CurveLevel} from './levels';
export interface Term {q:Rational;a:number;b:number}
export interface CurveRow {left:Term[];right:Term[]}
export type CurveAction={kind:'move';row:number;side:'left'|'right';term:number}|{kind:'scale';row:number;value:string;operation:'multiply'|'divide'}|{kind:'add';source:number;target:number}|{kind:'substitute';row:number;variable:0|1}|{kind:'expand';row:number}|{kind:'merge';row:number;side:'left'|'right';terms:number[]}|{kind:'reduce';row:number;events:unknown[]}|{kind:'coordinate';index:number;events:unknown[]};
export interface Pending {row:number;original:CurveRow;variable:0|1;replacement:Term[]}
export interface ReductionState {row:number;variable:0|1;roots:Root[];points:[Scalar,Scalar][];completed:number[]}
export interface CurveState {rows:CurveRow[];pending:Pending|null;reduction:ReductionState|null}
const powers=[[2,0],[1,1],[0,2],[1,0],[0,1],[0,0]];
const term=(q:Rational,a=0,b=0):Term=>({q,a,b});
const same=(a:Term,b:Term)=>a.a===b.a&&a.b===b.b;
export function combine(list:Term[]):Term[]{const out:Term[]=[];for(const t of list){const at=out.findIndex(v=>same(v,t));if(at<0)out.push({...t});else out[at]={...t,q:add(out[at].q,t.q)};}return out.filter(t=>!zero(t.q));}
export const norm=(r:CurveRow)=>combine([...r.left,...r.right.map(t=>({...t,q:neg(t.q)}))]);
export function initialCurve(level:CurveLevel):CurveState{return {rows:level.curves.map(values=>({left:values.slice(0,5).flatMap((n,i)=>n?[term(rat(n),...powers[i] as [number,number])]:[]),right:values[5]?[term(rat(values[5]))]:[]})),pending:null,reduction:null};}
function times(a:Term[],b:Term[]):Term[]{return a.flatMap(t=>b.map(u=>term(mul(t.q,u.q),t.a+u.a,t.b+u.b)));}
function replacementTerms(list:Term[],variable:0|1,replacement:Term[]):Term[]{return list.flatMap(t=>{let out=[term(t.q,variable===0?0:t.a,variable===1?0:t.b)];for(let i=0;i<(variable===0?t.a:t.b);i++)out=times(out,replacement);return out;});}
export function isolated(row:CurveRow,variable:0|1):Term[]|null{for(const side of ['left','right'] as const){const left=combine(row[side]),other=combine(row[side==='left'?'right':'left']);if(left.length===1&&one(left[0].q)&&left[0].a===(variable===0?1:0)&&left[0].b===(variable===1?1:0)&&other.every(t=>!(variable===0?t.a:t.b)))return other;}return null;}
export function oneVariable(row:CurveRow):0|1|null {const p=norm(row),hasX=p.some(t=>t.a),hasY=p.some(t=>t.b);return hasX&&!hasY?0:hasY&&!hasX?1:null;}
export function rowEquation(row:CurveRow,variable:0|1):Equation{const side=(tt:Term[])=>sum(...tt.map(t=>{const power=variable===0?t.a:t.b;if((variable===0?t.b:t.a)!==0)throw Error('Il reste deux inconnues.');return power?product(c(t.q),power===1?x():{kind:'power',base:x(),exponent:2}):c(t.q);}));return {left:side(row.left),right:side(row.right)};}
export function reductionLevel(level:CurveLevel,eq:Equation,title=level.title):Level{return {id:`curve-${level.id}`,world:5,index:0,title,source:'',initial:eq,budget:level.budget,goal:'Résous cette équation pour poursuivre le système.',tutorial:false,transfer:false};}
export function replayEquation(level:Level,events:unknown[]):Game{if(events.length>200)throw Error('Trop d’étapes.');const game=start(level);for(const e of events)perform(game,eventRead(e));return game;}
const rootScalar=(r:Root)=>exactPoly(rootExpression(r))[0];
export function evaluateTerms(tt:Term[],values:[Scalar,Scalar]):Scalar{return tt.reduce((s,t)=>{let v=scalar(t.q);for(let a=0;a<t.a;a++)v=sMul(v,values[0]);for(let b=0;b<t.b;b++)v=sMul(v,values[1]);return sAdd(s,v);},scalar(0));}
export function satisfiesCurve(level:CurveLevel,values:[Scalar,Scalar]):boolean{return initialCurve(level).rows.every(r=>sEqual(evaluateTerms(r.left,values),evaluateTerms(r.right,values)));}
export function coordinateEquation(level:CurveLevel,reduction:ReductionState,index:number):Equation {
 const value=rootScalar(reduction.roots[index]);if(!value)throw Error('Cas inexistant.');
 const candidate=initialCurve(level).rows.map(row=>{const poly:[Scalar,Scalar,Scalar]=[scalar(0),scalar(0),scalar(0)];for(const t of norm(row)){let q=scalar(t.q);for(let i=0;i<(reduction.variable===0?t.a:t.b);i++)q=sMul(q,value);const degree=reduction.variable===0?t.b:t.a;poly[degree]=sAdd(poly[degree],q);}return poly;}).filter(p=>!sZero(p[1])||!sZero(p[2])).sort((a,b)=>Number(!sZero(a[2]))-Number(!sZero(b[2])))[0];
 if(!candidate)throw Error('Cette courbe laisse une coordonnée libre.');
 // Scalar coefficients may contain radicals; the existing exact engine retains them.
 const expr=(p:Scalar[])=>sum(...p.map((q,i)=>i?product(scalarExpression(q),i===1?x():{kind:'power',base:x(),exponent:2}):scalarExpression(q)));
 return {left:expr(candidate),right:c(0)};
}
import {scalarExpr as scalarExpression} from '../math/exact';
export function applyCurve(level:CurveLevel,state:CurveState,action:CurveAction):CurveState{
 const next:CurveState={rows:state.rows.map(r=>({left:r.left.map(t=>({...t})),right:r.right.map(t=>({...t}))})),pending:state.pending,reduction:state.reduction?{...state.reduction,points:[...state.reduction.points],completed:[...state.reduction.completed]}:null};
 const rowAt=(i:number)=>{if(!Number.isInteger(i)||!next.rows[i])throw Error('Ligne inconnue.');return next.rows[i];};
 if(action.kind==='reduce'){
  if(state.pending)throw Error('Développe d’abord le remplacement.');const row=rowAt(action.row),v=oneVariable(row);if(v===null)throw Error('Élimine d’abord une inconnue.');const game=replayEquation(reductionLevel(level,rowEquation(row,v)),action.events);validate(game);const answer=game.s.answer!;if(answer.kind==='all')throw Error('Cette identité ne suffit pas pour conclure.');next.reduction={row:action.row,variable:v,roots:answer.kind==='finite'?answer.roots:[],points:[],completed:[]};return next;
 }
 if(action.kind==='coordinate'){
  const r=next.reduction;if(!r||!Number.isInteger(action.index)||!r.roots[action.index]||r.completed.includes(action.index))throw Error('Cas inconnu ou déjà terminé.');
  const eq=coordinateEquation(level,r,action.index),game=replayEquation(reductionLevel(level,eq),action.events);validate(game);const answer=game.s.answer!;if(answer.kind==='all')throw Error('Il manque une contrainte.');
  if(answer.kind==='finite')for(const root of answer.roots){const known=rootScalar(r.roots[action.index]),other=rootScalar(root),point:[Scalar,Scalar]=r.variable===0?[known,other]:[other,known];if(satisfiesCurve(level,point)&&!r.points.some(p=>sEqual(p[0],point[0])&&sEqual(p[1],point[1])))r.points.push(point);}
  r.completed.push(action.index);return next;
 }
 if(state.reduction)throw Error('Annule la résolution pour modifier le système.');
 if(state.pending&&action.kind!=='expand')throw Error('Développe d’abord le remplacement.');
 if(action.kind==='expand'){const p=next.pending;if(!p||p.row!==action.row)throw Error('Aucun remplacement à développer.');next.rows[p.row]={left:replacementTerms(p.original.left,p.variable,p.replacement),right:replacementTerms(p.original.right,p.variable,p.replacement)};next.pending=null;}
 else if(action.kind==='move'){const row=rowAt(action.row);if(action.side!=='left'&&action.side!=='right')throw Error('Membre inconnu.');const tt=row[action.side],t=tt[action.term];if(!Number.isInteger(action.term)||!t)throw Error('Terme inconnu.');tt.splice(action.term,1);const target=action.side==='left'?'right':'left';row[target]=combine([...row[target],{...t,q:neg(t.q)}]);}
 else if(action.kind==='scale'){const row=rowAt(action.row),q=readRational(action.value);if(zero(q)||one(q)||!['multiply','divide'].includes(action.operation))throw Error('Choisis un nombre différent de 0 et 1.');const f=action.operation==='divide'?div(rat(1),q):q;for(const side of ['left','right'] as const)row[side]=row[side].map(t=>({...t,q:mul(t.q,f)}));}
 else if(action.kind==='add'){if(action.source===action.target)throw Error('Choisis une autre ligne.');const a=rowAt(action.source),b=rowAt(action.target);b.left=combine([...b.left,...a.left]);b.right=combine([...b.right,...a.right]);}
 else if(action.kind==='merge'){const row=rowAt(action.row),tt=row[action.side];if(action.terms.length!==2||action.terms[0]===action.terms[1])throw Error('Choisis deux termes.');const selected=action.terms.map(i=>tt[i]);if(selected.some(t=>!t)||!same(selected[0],selected[1]))throw Error('Choisis deux termes semblables.');const first=Math.min(...action.terms),q=add(selected[0].q,selected[1].q);row[action.side]=tt.flatMap((t,i)=>i===first?(zero(q)?[]:[{...t,q}]):action.terms.includes(i)?[]:[t]);}
 else if(action.kind==='substitute'){
  const replacement=isolated(rowAt(action.row),action.variable);if(!replacement)throw Error('Isole d’abord cette inconnue.');const target=1-action.row,original=rowAt(target);const left=replacementTerms(original.left,action.variable,replacement),right=replacementTerms(original.right,action.variable,replacement);if([...combine(left),...combine(right)].some(t=>t.a+t.b>2))throw Error('Cette substitution donne un degré supérieur à 2 : choisis une combinaison de lignes.');
  if(replacement.every(t=>t.a+t.b===0))next.rows[target]={left:combine(left),right:combine(right)};
  else next.pending={row:target,original,variable:action.variable,replacement};
 }
 for(const row of next.rows)for(const t of [...row.left,...row.right])if(t.a+t.b>2||t.q.n.toString().length>60||t.q.d.toString().length>60)throw Error('Expression trop grande.');return next;
}
export function expectedScalar(text:string):Scalar{const sign=text.startsWith('-')?-1:1,body=sign<0?text.slice(1):text;if(body.startsWith('sqrt('))return sign<0?sNeg(sRoot(readRational(body.slice(5,-1)))):sRoot(readRational(body.slice(5,-1)));return scalar(readRational(text));}
export function verifyCurve(level:CurveLevel,state:CurveState):[Scalar,Scalar][]{const r=state.reduction;if(!r||r.completed.length!==r.roots.length)throw Error('Résous toutes les coordonnées avant de conclure.');const wanted=level.expected.map(p=>p.map(expectedScalar) as [Scalar,Scalar]);if(wanted.length!==r.points.length||!wanted.every(p=>r.points.some(q=>sEqual(p[0],q[0])&&sEqual(p[1],q[1]))))throw Error('Il manque des intersections. Reprends les cas.');return r.points;}
export function curveKey(row:CurveRow):string{return norm(row).map(t=>`${str(t.q)}:${t.a},${t.b}`).sort().join(';');}
