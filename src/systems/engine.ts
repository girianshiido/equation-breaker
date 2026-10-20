import { rat, add, sub, mul, div, neg, zero, one, equal, str, readRational, type Rational } from '../math/rational';
export const variables = ['x', 'y', 'z'] as const;
export interface Row { coefficients:Rational[]; right:Rational; isolated?:number; layout?:{rightVariables:Rational[];leftConstant:Rational} }
export type SystemRows=Row[];
export type Side='left'|'right';
export type SystemAction = {kind:'scale';row:number;factor:string;operation?:'multiply'|'divide';operand?:string} | {kind:'add';source:number;target:number} | {kind:'move';row:number;side:Side;variable:number|null} | {kind:'isolate'|'substitute';row:number;variable:number};
export interface Reduction {rows:Row[];pivots:number[];kind:'unique'|'infinite'|'none';values:Rational[];free:number[]}
export function makeRows(values:number[][]):Row[]{return values.map(values=>({coefficients:values.slice(0,-1).map(n=>rat(n)),right:rat(values.at(-1)!)}));}
export const copyRows=(rows:Row[])=>rows.map(r=>({...r,coefficients:[...r.coefficients],...(r.layout?{layout:{rightVariables:[...r.layout.rightVariables],leftConstant:r.layout.leftConstant}}:{})}));
/** Canonical coefficients verify equivalence; layout preserves what is on each side. */
export function displayParts(row:Row):{leftVariables:Rational[];rightVariables:Rational[];leftConstant:Rational;rightConstant:Rational}{
 const rightVariables=row.layout?.rightVariables??row.coefficients.map((q,j)=>row.isolated!==undefined&&j!==row.isolated?neg(q):rat(0)),leftConstant=row.layout?.leftConstant??rat(0);
 return {leftVariables:row.coefficients.map((q,j)=>add(q,rightVariables[j])),rightVariables,leftConstant,rightConstant:add(row.right,leftConstant)};
}
function withSides(coefficients:Rational[],right:Rational,rightVariables:Rational[],leftConstant:Rational):Row{return {coefficients,right,layout:{rightVariables,leftConstant}};}
function bounded(rows:Row[]){for(const r of rows){const p=displayParts(r);for(const q of [...r.coefficients,r.right,...p.rightVariables,p.leftConstant])if(q.n.toString().length>80||q.d.toString().length>80)throw Error('Les nombres deviennent trop grands. Annule une étape et choisis un facteur plus simple.');}}
export function isolatedSide(row:Row,variable:number):Side|null{
 const p=displayParts(row);
 if(one(p.leftVariables[variable])&&zero(p.leftConstant)&&p.leftVariables.every((q,j)=>j===variable||zero(q))&&zero(p.rightVariables[variable]))return 'left';
 if(one(p.rightVariables[variable])&&zero(p.rightConstant)&&p.rightVariables.every((q,j)=>j===variable||zero(q))&&zero(p.leftVariables[variable]))return 'right';
 return null;
}
export function canSubstitute(row:Row,variable:number):boolean{return isolatedSide(row,variable)!==null;}
export function scaleByInteger(row:number,operation:'multiply'|'divide',operand:string):SystemAction{
 const q=readRational(operand.replaceAll('−','-'));
 if(q.d!==1n)throw Error('Choisis un entier. Pour multiplier par 1/2, utilise ÷ 2.');
 if(zero(q)||one(q))throw Error('Choisis un entier différent de 0 et de 1.');
 return {kind:'scale',row,operation,operand:str(q),factor:str(operation==='divide'?div(rat(1),q):q)};
}
export function transformSystem(original:Row[],action:SystemAction):Row[]{
 const rows=copyRows(original),n=rows[0].coefficients.length;
 const rowAt=(index:number)=>{if(!Number.isInteger(index)||!rows[index])throw Error('Ligne inconnue.');return rows[index];};
 if(action.kind==='scale'){
  const row=rowAt(action.row),q=readRational(action.factor.replaceAll('−','-'));
  if(zero(q)||one(q))throw Error('Multiplier ou diviser par 0 ou par 1 n’est pas autorisé.');
  if(action.operation||action.operand){const checked=scaleByInteger(action.row,action.operation??'multiply',action.operand??'');if(checked.kind!=='scale'||checked.factor!==str(q))throw Error('Opération incohérente.');}
  const p=displayParts(row);rows[action.row]=withSides(row.coefficients.map(c=>mul(c,q)),mul(row.right,q),p.rightVariables.map(c=>mul(c,q)),mul(p.leftConstant,q));
 }else if(action.kind==='add'){
  const source=rowAt(action.source),target=rowAt(action.target);if(action.source===action.target)throw Error('Dépose la ligne sur une autre équation.');
  const a=displayParts(source),b=displayParts(target);
  rows[action.target]=withSides(target.coefficients.map((q,j)=>add(q,source.coefficients[j])),add(target.right,source.right),b.rightVariables.map((q,j)=>add(q,a.rightVariables[j])),add(b.leftConstant,a.leftConstant));
 }else if(action.kind==='move'){
  const row=rowAt(action.row),p=displayParts(row),j=action.variable;
  if(action.side!=='left'&&action.side!=='right')throw Error('Membre inconnu.');
  let rightVariables=[...p.rightVariables],leftConstant=p.leftConstant;
  if(j===null){const value=action.side==='left'?p.leftConstant:p.rightConstant;if(zero(value))throw Error('Ce terme est nul.');leftConstant=action.side==='left'?rat(0):neg(row.right);}
  else{if(!Number.isInteger(j)||j<0||j>=n)throw Error('Inconnue absente.');const value=(action.side==='left'?p.leftVariables:p.rightVariables)[j];if(zero(value))throw Error('Ce terme est nul.');rightVariables[j]=action.side==='left'?neg(row.coefficients[j]):rat(0);}
  rows[action.row]=withSides([...row.coefficients],row.right,rightVariables,leftConstant);
 }else{
  const source=rowAt(action.row),j=action.variable;if(!Number.isInteger(j)||j<0||j>=n||zero(source.coefficients[j]))throw Error('Cette inconnue n’est pas présente dans la ligne.');
  if(action.kind==='isolate'){
   // Read-only compatibility for local drafts saved before manual transposition existed.
   const q=source.coefficients[j];rows[action.row]={coefficients:source.coefficients.map(c=>div(c,q)),right:div(source.right,q),isolated:j};
  }else{
   if(!canSubstitute(source,j))throw Error(`Isole d’abord ${variables[j]} dans un membre en déplaçant les termes.`);
   const sourceQ=source.coefficients[j],expressionConstant=div(source.right,sourceQ);
   for(let i=0;i<rows.length;i++)if(i!==action.row){
    const target=rows[i],p=displayParts(target),leftQ=p.leftVariables[j],rightQ=p.rightVariables[j];if(zero(leftQ)&&zero(rightQ))continue;
    const ratio=div(target.coefficients[j],sourceQ);
    const coefficients=target.coefficients.map((c,k)=>sub(c,mul(ratio,source.coefficients[k]))),right=sub(target.right,mul(ratio,source.right));
    const rightVariables=p.rightVariables.map((c,k)=>k===j?rat(0):sub(c,mul(rightQ,div(source.coefficients[k],sourceQ))));
    rows[i]=withSides(coefficients,right,rightVariables,add(p.leftConstant,mul(leftQ,expressionConstant)));
   }
  }
 }
 bounded(rows);return rows;
}
/** Exact row reduction verifies solutions; no player command invokes it to solve a level. */
export function reduceSystem(input:Row[]):Reduction{
 const rows=copyRows(input),n=rows[0].coefficients.length,pivots:number[]=[];let rank=0;
 for(let j=0;j<n;j++){const index=rows.findIndex((r,i)=>i>=rank&&!zero(r.coefficients[j]));if(index<0)continue;[rows[rank],rows[index]]=[rows[index],rows[rank]];const q=rows[rank].coefficients[j];rows[rank]={coefficients:rows[rank].coefficients.map(c=>div(c,q)),right:div(rows[rank].right,q)};
  for(let i=0;i<rows.length;i++)if(i!==rank){const f=rows[i].coefficients[j];if(zero(f))continue;rows[i]={coefficients:rows[i].coefficients.map((c,k)=>sub(c,mul(f,rows[rank].coefficients[k]))),right:sub(rows[i].right,mul(f,rows[rank].right))};}pivots.push(j);rank++;if(rank===rows.length)break;}
 const impossible=rows.some(r=>r.coefficients.every(zero)&&!zero(r.right)),free=Array.from({length:n},(_,i)=>i).filter(i=>!pivots.includes(i)),values=Array.from({length:n},()=>rat(0));pivots.forEach((j,i)=>values[j]=rows[i].right);
 return {rows,pivots,free,values,kind:impossible?'none':free.length?'infinite':'unique'};
}
export function systemKey(rows:Row[]):string{const r=reduceSystem(rows);return r.kind==='none'?'none':r.rows.filter(row=>row.coefficients.some(c=>!zero(c))).map(row=>[...row.coefficients,row.right].map(str).join(',')).join(';');}
export function systemReady(rows:Row[]):boolean{
 const constantRows=rows.filter(row=>{const p=displayParts(row);return p.leftVariables.every(zero)&&p.rightVariables.every(zero);});
 if(constantRows.some(r=>!zero(r.right)))return true;
 const solution=reduceSystem(rows);if(solution.kind==='infinite')return constantRows.some(r=>zero(r.right));if(solution.kind!=='unique')return false;
 return solution.values.every((_,j)=>rows.some(r=>canSubstitute(r,j)&&r.coefficients.every((q,k)=>j===k||zero(q))));
}
export function verifySystem(rows:Row[],initial:Row[]):Reduction{if(!systemReady(rows))throw Error('Continue les manipulations : isole chaque inconnue en déplaçant les termes, ou fais apparaître une égalité qui permet de conclure.');if(systemKey(rows)!==systemKey(initial))throw Error('Le système n’a plus les mêmes solutions. Annule la dernière étape.');return reduceSystem(rows);}
export function actionLabel(action:SystemAction):string{
 if(action.kind==='scale'){const q=action.operand??action.factor,sign=action.operation==='divide'?'÷':'×';return `L${action.row+1} ${sign} ${q.startsWith('-')?`(${q.replace('-','−')})`:q}`;}
 if(action.kind==='add')return `L${action.target+1} ← L${action.source+1} + L${action.target+1}`;
 if(action.kind==='move')return `Passer ${action.variable===null?'la constante':variables[action.variable]} dans le membre ${action.side==='left'?'droit':'gauche'} de L${action.row+1}`;
 return action.kind==='isolate'?`Isoler ${variables[action.variable]} dans L${action.row+1}`:`Substituer ${variables[action.variable]} dans les autres équations`;
}
function scaleToward(row:number,q:Rational):SystemAction{if(q.n===1n||q.n===-1n)return scaleByInteger(row,'divide',String(q.n*q.d));return scaleByInteger(row,'multiply',String(q.n));}
function manualStep(rows:Row[],i:number,j:number):SystemAction|null{
 const row=rows[i],p=displayParts(row);if(!zero(p.rightVariables[j]))return{kind:'move',row:i,side:'right',variable:j};
 for(let k=0;k<row.coefficients.length;k++)if(k!==j&&!zero(p.leftVariables[k]))return{kind:'move',row:i,side:'left',variable:k};
 if(!zero(p.leftConstant))return{kind:'move',row:i,side:'left',variable:null};
 if(!one(p.leftVariables[j]))return scaleToward(i,div(rat(1),p.leftVariables[j]));return null;
}
export function systemHint(rows:Row[],method:'substitution'|'combination'|'choice'):{text:string;action?:SystemAction}{
 if(systemReady(rows))return{text:'Le système permet de conclure. Touche la coche pour valider.'};
 let action:SystemAction|undefined;
 if(method!=='combination'){
  for(let i=0;i<rows.length&&!action;i++)for(let j=0;j<rows[0].coefficients.length;j++)if(canSubstitute(rows[i],j)&&rows[i].coefficients.slice(0,j).every(zero)&&rows.some((r,k)=>k!==i&&!zero(r.coefficients[j]))){action={kind:'substitute',row:i,variable:j};break;}
  for(let j=0;j<rows[0].coefficients.length&&!action;j++){
   const candidates=rows.map((r,i)=>({i,count:r.coefficients.filter(q=>!zero(q)).length})).filter(({i})=>!zero(rows[i].coefficients[j])&&rows[i].coefficients.slice(0,j).every(zero)).sort((a,b)=>a.count-b.count);
   const i=candidates[0]?.i;if(i!==undefined){const step=manualStep(rows,i,j);if(step)action=step;}
  }
 }
 for(let j=0;j<rows[0].coefficients.length&&!action;j++){
  const source=rows.findIndex(r=>!zero(r.coefficients[j])&&r.coefficients.slice(0,j).every(zero));if(source<0)continue;const target=rows.findIndex((r,i)=>i!==source&&!zero(r.coefficients[j]));if(target<0)continue;
  const q=neg(div(rows[target].coefficients[j],rows[source].coefficients[j]));action=one(q)?{kind:'add',source,target}:scaleToward(source,q);
 }
 if(!action)for(let i=0;i<rows.length;i++){const j=rows[i].coefficients.findIndex(q=>!zero(q));if(j>=0){const step=manualStep(rows,i,j);if(step){action=step;break;}}else{const p=displayParts(rows[i]);const k=p.leftVariables.findIndex(q=>!zero(q));if(k>=0){action={kind:'move',row:i,side:'left',variable:k};break;}}}
 if(!action)return{text:'Déplace les termes pour isoler une inconnue, puis substitue sa valeur.'};
 const text=action.kind==='move'?`${actionLabel(action)} : glisse ce terme de l’autre côté du signe égal.`:action.kind==='scale'?`Touche le point de L${action.row+1} et choisis ${actionLabel(action)} sur la molette.`:action.kind==='add'?`Glisse le point de L${action.source+1} sur L${action.target+1} pour additionner les deux membres correspondants.`:`Sélectionne ${variables[action.variable]} isolé dans L${action.row+1}, puis « Substituer ».`;
 return{text,action};
}
export function satisfies(rows:Row[],values:Rational[]):boolean{return rows.every(r=>equal(r.coefficients.reduce((s,q,j)=>add(s,mul(q,values[j])),rat(0)),r.right));}
