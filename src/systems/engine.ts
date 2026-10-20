import { constant, variable, calculateNumbers, negateExpression, mergeArrival, expressionSum, expressionTerms, fromAffine, evaluateExpression, scaled, scaleExpression, replaceVariable, hasVariable, simpleTerm, canExpand, expandExpression, boundExpression, type LinearExpr } from './expression';
import { rat, add, sub, mul, div, neg, zero, one, equal, str, readRational, type Rational } from '../math/rational';
export const variables = ['x', 'y', 'z'] as const;
export interface Row { coefficients:Rational[]; right:Rational; isolated?:number; layout?:{rightVariables:Rational[];leftConstant:Rational};written?:{left:LinearExpr;right:LinearExpr} }
export type SystemRows=Row[];
export type Side='left'|'right';
export type FactorPart='coefficient'|'numerator'|'denominator';
/** Missing written-move.merge keeps the replay semantics of pre-1.5.2 saves. */
export type SystemAction = {kind:'numeric'} | {kind:'scale';row:number;factor:string;operation?:'multiply'|'divide';operand?:string} | {kind:'offset';row:number;operand:string} | {kind:'factor';row:number;side:Side;variable:number|null;part:FactorPart;value:string;term?:number} | {kind:'written-move';row:number;side:Side;term:number;merge?:true} | {kind:'expand';row:number;side:Side;term:number} | {kind:'merge';row:number;side:Side;terms:number[]} | {kind:'add';source:number;target:number} | {kind:'move';row:number;side:Side;variable:number|null} | {kind:'isolate';row:number;variable:number} | {kind:'substitute';row:number;variable:number;numeric?:true};
export type SystemMethod='substitution'|'combination'|'choice';
/** Old event journals replay through transformSystem; new player actions obey the lesson. */
export function methodAllows(method:SystemMethod,action:SystemAction):boolean {
 if(action.kind==='isolate')return false;
 if(method==='substitution')return action.kind!=='add'&&(action.kind!=='scale'||action.factor==='-1'&&!action.operation&&!action.operand);
 return method!=='combination'||action.kind!=='substitute';
}
export function transformForMethod(rows:Row[],action:SystemAction,method:SystemMethod):Row[]{
 if(!methodAllows(method,action))throw Error(method==='substitution'?'Dans ce niveau, isole une inconnue puis utilise la substitution.':'Dans ce niveau, utilise les combinaisons de lignes.');
 return transformSystem(rows,action);
}
export interface Reduction {rows:Row[];pivots:number[];kind:'unique'|'infinite'|'none';values:Rational[];free:number[]}
export function makeRows(values:number[][]):Row[]{return values.map(values=>({coefficients:values.slice(0,-1).map(n=>rat(n)),right:rat(values.at(-1)!)}));}
export const copyRows=(rows:Row[])=>rows.map(r=>({...r,coefficients:[...r.coefficients],...(r.layout?{layout:{rightVariables:[...r.layout.rightVariables],leftConstant:r.layout.leftConstant}}:{})}));
/** Canonical coefficients verify equivalence; layout preserves what is on each side. */
export function displayParts(row:Row):{leftVariables:Rational[];rightVariables:Rational[];leftConstant:Rational;rightConstant:Rational}{
 const rightVariables=row.layout?.rightVariables??row.coefficients.map((q,j)=>row.isolated!==undefined&&j!==row.isolated?neg(q):rat(0)),leftConstant=row.layout?.leftConstant??rat(0);
 return {leftVariables:row.coefficients.map((q,j)=>add(q,rightVariables[j])),rightVariables,leftConstant,rightConstant:add(row.right,leftConstant)};
}
export function writtenSides(row:Row):{left:LinearExpr;right:LinearExpr}{const p=displayParts(row);return row.written?{...row.written}:{left:fromAffine(p.leftVariables,p.leftConstant),right:fromAffine(p.rightVariables,p.rightConstant)};}
function withWritten(row:Row,written:{left:LinearExpr;right:LinearExpr}):Row{
 boundExpression(written.left);boundExpression(written.right);
 const a=evaluateExpression(written.left,row.coefficients.length),b=evaluateExpression(written.right,row.coefficients.length);
 return {...withSides(a.coefficients.map((q,j)=>sub(q,b.coefficients[j])),sub(b.constant,a.constant),b.coefficients,a.constant),written};
}
export function writtenTerm(row:Row,side:Side,index:number):LinearExpr{
 if(side!=='left'&&side!=='right')throw Error('Membre inconnu.');const terms=expressionTerms(writtenSides(row)[side]);
 if(!Number.isInteger(index)||!terms[index])throw Error('Ce terme n’existe plus.');return terms[index];
}
function hasPending(row:Row):boolean{return !!row.written&&(['left','right'] as const).some(side=>{const terms=expressionTerms(row.written![side]);return terms.some(canExpand)||new Set(terms.map(t=>simpleTerm(t)?.variable)).size<terms.length;});}
export function mergeableTerms(row:Row,side:Side,indices:number[]):boolean{
 if(indices.length<2||new Set(indices).size!==indices.length)return false;
 try{const terms=indices.map(i=>simpleTerm(writtenTerm(row,side,i)));return terms.every(t=>t!==null&&t.variable===terms[0]!.variable);}catch{return false;}
}
function withSides(coefficients:Rational[],right:Rational,rightVariables:Rational[],leftConstant:Rational):Row{return {coefficients,right,layout:{rightVariables,leftConstant}};}
function bounded(rows:Row[]){for(const r of rows){const p=displayParts(r);for(const q of [...r.coefficients,r.right,...p.rightVariables,p.leftConstant])if(q.n.toString().length>80||q.d.toString().length>80)throw Error('Les nombres deviennent trop grands. Annule une étape et choisis un facteur plus simple.');}}
export function isolatedSide(row:Row,variable:number):Side|null{
 const p=displayParts(row);
 if(row.written){const w=row.written;if(w.left.kind==='variable'&&w.left.variable===variable&&!hasVariable(w.right,variable))return 'left';if(w.right.kind==='variable'&&w.right.variable===variable&&!hasVariable(w.left,variable))return 'right';return null;}
 if(one(p.leftVariables[variable])&&zero(p.leftConstant)&&p.leftVariables.every((q,j)=>j===variable||zero(q))&&zero(p.rightVariables[variable]))return 'left';
 if(one(p.rightVariables[variable])&&zero(p.rightConstant)&&p.rightVariables.every((q,j)=>j===variable||zero(q))&&zero(p.leftVariables[variable]))return 'right';
 return null;
}
export function rowHasVariable(row:Row,j:number):boolean{return row.written?hasVariable(row.written.left,j)||hasVariable(row.written.right,j):!zero(row.coefficients[j]);}
export function canSubstitute(row:Row,variable:number):boolean{return isolatedSide(row,variable)!==null;}
export function factorValue(row:Row,side:Side,variable:number|null,part:FactorPart,term?:number):Rational{
 if(side!=='left'&&side!=='right')throw Error('Membre inconnu.');
 if(!['coefficient','numerator','denominator'].includes(part))throw Error('Facteur inconnu.');
 const p=displayParts(row);
 if(term!==undefined){const node=writtenTerm(row,side,term),simple=simpleTerm(node),q=node.kind==='scale'?node.factor:simple?.q;if(!q||node.kind==='constant'&&part!=='denominator')throw Error('Choisis le facteur d’un terme contenant une inconnue.');const value=part==='denominator'?rat(q.d):part==='numerator'?rat(q.n):q;if(one(value)||zero(value))throw Error('Ce facteur vaut déjà 1.');return value;}
 if(variable!==null&&(!Number.isInteger(variable)||variable<0||variable>=row.coefficients.length))throw Error('Inconnue absente.');
 const q=variable===null?(side==='left'?p.leftConstant:p.rightConstant):(side==='left'?p.leftVariables:p.rightVariables)[variable];
 if(zero(q)||variable===null&&part!=='denominator')throw Error('Choisis le facteur d’un terme contenant une inconnue.');
 const value=part==='denominator'?rat(q.d):part==='numerator'?rat(q.n):q;
 if(!['coefficient','numerator','denominator'].includes(part)||one(value))throw Error('Ce facteur vaut déjà 1.');
 return value;
}
export function factorAction(row:number,equation:Row,side:Side,variable:number|null,part:FactorPart,term?:number):SystemAction{return {kind:'factor',row,side,variable,part,value:str(factorValue(equation,side,variable,part,term)),...(term!==undefined?{term}:{})};}
export function scaleByInteger(row:number,operation:'multiply'|'divide',operand:string):SystemAction{
 const q=readRational(operand.replaceAll('−','-'));
 if(q.d!==1n)throw Error('Choisis un entier. Pour multiplier par 1/2, utilise ÷ 2.');
 if(zero(q)||one(q))throw Error('Choisis un entier différent de 0 et de 1.');
 return {kind:'scale',row,operation,operand:str(q),factor:str(operation==='divide'?div(rat(1),q):q)};
}
export const manualSystemMoves=(events:SystemAction[])=>events.filter(e=>e.kind!=='numeric').length;
export function calculateSystemNumbers(rows:Row[]):Row[]{return rows.map(r=>r.written?withWritten(r,{left:calculateNumbers(r.written.left),right:calculateNumbers(r.written.right)}):r);}
export function transformSystem(original:Row[],action:SystemAction):Row[]{
 if(action.kind==='numeric')return calculateSystemNumbers(original);
 const rows=copyRows(original),n=rows[0].coefficients.length;
 const rowAt=(index:number)=>{if(!Number.isInteger(index)||!rows[index])throw Error('Ligne inconnue.');return rows[index];};
 if(action.kind==='scale'){
  const row=rowAt(action.row),q=readRational(action.factor.replaceAll('−','-'));
  if(zero(q)||one(q))throw Error('Multiplier ou diviser par 0 ou par 1 n’est pas autorisé.');
  if(action.operation||action.operand){const checked=scaleByInteger(action.row,action.operation??'multiply',action.operand??'');if(checked.kind!=='scale'||checked.factor!==str(q))throw Error('Opération incohérente.');}
  const p=displayParts(row);rows[action.row]=row.written?withWritten(row,{left:scaleExpression(row.written.left,q),right:scaleExpression(row.written.right,q)}):withSides(row.coefficients.map(c=>mul(c,q)),mul(row.right,q),p.rightVariables.map(c=>mul(c,q)),mul(p.leftConstant,q));
 }else if(action.kind==='factor'){
  const q=factorValue(rowAt(action.row),action.side,action.variable,action.part,action.term);
  if(str(q)!==action.value)throw Error('Ce facteur a changé. Sélectionne-le à nouveau.');
  return transformSystem(original,{kind:'scale',row:action.row,factor:str(action.part==='denominator'?q:div(rat(1),q))});
 }else if(action.kind==='written-move'||action.kind==='expand'||action.kind==='merge'){
  const row=rowAt(action.row),w=writtenSides(row),side=action.side;if(side!=='left'&&side!=='right')throw Error('Membre inconnu.');
  const terms=[...expressionTerms(w[side])];
  if(action.kind==='merge'){
   if(!mergeableTerms(row,side,action.terms))throw Error('Choisis au moins deux termes semblables à fusionner.');
   const selected=action.terms.map(i=>simpleTerm(terms[i])!),q=selected.reduce((s,t)=>add(s,t.q),rat(0)),j=selected[0].variable;
   const merged=j===null?constant(q):scaled(q,variable(j)),first=Math.min(...action.terms);
   w[side]=expressionSum(terms.flatMap((t,i)=>i===first?[merged]:action.terms.includes(i)?[]:[t]));
  }else{
   const node=writtenTerm(row,side,action.term);
   if(action.kind==='expand'){if(!canExpand(node))throw Error('Ce terme est déjà développé.');terms.splice(action.term,1,...expandExpression(node));w[side]=expressionSum(terms);}
   else{terms.splice(action.term,1);w[side]=expressionSum(terms);const target=side==='left'?'right':'left';const arrival=negateExpression(node);w[target]=action.merge?mergeArrival(w[target],arrival):expressionSum([...expressionTerms(w[target]),arrival]);}
  }
  rows[action.row]=withWritten(row,w);
 }else if(action.kind==='offset'){
  const row=rowAt(action.row),q=readRational(action.operand.replaceAll('−','-')),p=displayParts(row);
  if(zero(q))throw Error('Ajouter 0 ne change pas l’équation.');
  rows[action.row]=row.written?withWritten(row,{left:expressionSum([...expressionTerms(row.written.left),constant(q)]),right:expressionSum([...expressionTerms(row.written.right),constant(q)])}):withSides([...row.coefficients],row.right,[...p.rightVariables],add(p.leftConstant,q));
 }else if(action.kind==='add'){
  const source=rowAt(action.source),target=rowAt(action.target);if(action.source===action.target)throw Error('Dépose la ligne sur une autre équation.');
  const a=displayParts(source),b=displayParts(target);
  rows[action.target]=hasPending(source)||hasPending(target)?withWritten(target,{left:expressionSum([...expressionTerms(writtenSides(target).left),...expressionTerms(writtenSides(source).left)]),right:expressionSum([...expressionTerms(writtenSides(target).right),...expressionTerms(writtenSides(source).right)])}):withSides(target.coefficients.map((q,j)=>add(q,source.coefficients[j])),add(target.right,source.right),b.rightVariables.map((q,j)=>add(q,a.rightVariables[j])),add(b.leftConstant,a.leftConstant));
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
   const sourceSides=writtenSides(source),replacement=sourceSides[isolatedSide(source,j)==='left'?'right':'left'];
   for(let i=0;i<rows.length;i++)if(i!==action.row){
    const target=rows[i],w=writtenSides(target);if(!hasVariable(w.left,j)&&!hasVariable(w.right,j))continue;
    const left=replaceVariable(w.left,j,replacement),right=replaceVariable(w.right,j,replacement);
    rows[i]=withWritten(target,{left:action.numeric?calculateNumbers(left):left,right:action.numeric?calculateNumbers(right):right});
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
 const constantRows=rows.filter(row=>{if(row.written)return row.written.left.kind==='constant'&&row.written.right.kind==='constant';const p=displayParts(row);return p.leftVariables.every(zero)&&p.rightVariables.every(zero);});
 if(constantRows.some(r=>!zero(r.right)))return true;
 const solution=reduceSystem(rows);if(solution.kind==='infinite')return constantRows.some(r=>zero(r.right));if(solution.kind!=='unique')return false;
 return solution.values.every((_,j)=>rows.some(r=>canSubstitute(r,j)&&r.coefficients.every((q,k)=>j===k||zero(q))&&(!r.written||r.written[isolatedSide(r,j)==='left'?'right':'left'].kind==='constant')));
}
export function verifySystem(rows:Row[],initial:Row[]):Reduction{if(!systemReady(rows))throw Error('Continue les manipulations : isole chaque inconnue en déplaçant les termes, ou fais apparaître une égalité qui permet de conclure.');if(systemKey(rows)!==systemKey(initial))throw Error('Le système n’a plus les mêmes solutions. Annule la dernière étape.');return reduceSystem(rows);}
export function actionLabel(action:SystemAction):string{
 if(action.kind==='numeric')return 'Calcul numérique automatique';
 if(action.kind==='written-move')return `Passer le terme dans l’autre membre de L${action.row+1}`;
 if(action.kind==='expand')return `Développer ou calculer le terme de L${action.row+1}`;
 if(action.kind==='merge')return `Fusionner les termes sélectionnés de L${action.row+1}`;
 if(action.kind==='factor')return `L${action.row+1} ${action.part==='denominator'?'×':'÷'} ${action.value.startsWith('-')?`(${action.value.replace('-','−')})`:action.value}`;
 if(action.kind==='offset')return `Ajouter ${action.operand.replace('-','−')} aux deux membres de L${action.row+1}`;
 if(action.kind==='scale'){const q=action.operand??action.factor,sign=action.operation==='divide'?'÷':'×';return `L${action.row+1} ${sign} ${q.startsWith('-')?`(${q.replace('-','−')})`:q}`;}
 if(action.kind==='add')return `L${action.target+1} ← L${action.source+1} + L${action.target+1}`;
 if(action.kind==='move')return `Passer ${action.variable===null?'la constante':variables[action.variable]} dans le membre ${action.side==='left'?'droit':'gauche'} de L${action.row+1}`;
 return action.kind==='isolate'?`Isoler ${variables[action.variable]} dans L${action.row+1}`:`Substituer ${variables[action.variable]} dans les autres équations`;
}
function scaleToward(row:number,q:Rational):SystemAction{if(q.n===1n||q.n===-1n)return scaleByInteger(row,'divide',String(q.n*q.d));return scaleByInteger(row,'multiply',String(q.n));}
function moveAction(row:Row,index:number,side:Side,j:number|null):SystemAction{if(row.written){const term=expressionTerms(row.written[side]).findIndex(t=>simpleTerm(t)?.variable===j);if(term>=0)return {kind:'written-move',row:index,side,term,merge:true};}return {kind:'move',row:index,side,variable:j};}
function manualStep(rows:Row[],i:number,j:number):SystemAction|null{
 const row=rows[i],p=displayParts(row);if(!zero(p.rightVariables[j]))return moveAction(row,i,'right',j);
 for(let k=0;k<row.coefficients.length;k++)if(k!==j&&!zero(p.leftVariables[k]))return moveAction(row,i,'left',k);
 if(!zero(p.leftConstant))return moveAction(row,i,'left',null);
 if(!one(p.leftVariables[j]))return scaleToward(i,div(rat(1),p.leftVariables[j]));return null;
}
export function systemHint(rows:Row[],method:'substitution'|'combination'|'choice'):{text:string;action?:SystemAction}{
 if(systemReady(rows))return{text:'Le système permet de conclure. Touche la coche pour valider.'};
 for(let i=0;i<rows.length;i++)if(rows[i].written)for(const side of ['left','right'] as const){
  const terms=expressionTerms(rows[i].written![side]),expand=terms.findIndex(canExpand);
  if(expand>=0)return {text:`Sélectionne l’expression dans L${i+1}, puis développe-la ou calcule son produit.`,action:{kind:'expand',row:i,side,term:expand}};
  for(const j of [null,0,1,2]){const indices=terms.flatMap((t,k)=>simpleTerm(t)?.variable===j?[k]:[]);if(indices.length>1)return {text:`Sélectionne les termes semblables dans L${i+1}, puis fusionne-les.`,action:{kind:'merge',row:i,side,terms:indices}};}
 }
 let action:SystemAction|undefined;
 if(method!=='combination'){
  for(let i=0;i<rows.length&&!action;i++)for(let j=0;j<rows[0].coefficients.length;j++)if(canSubstitute(rows[i],j)&&rows[i].coefficients.slice(0,j).every(zero)&&rows.some((r,k)=>k!==i&&rowHasVariable(r,j))){action={kind:'substitute',row:i,variable:j,numeric:true};break;}
  for(let j=0;j<rows[0].coefficients.length&&!action;j++){
   const candidates=rows.map((r,i)=>({i,count:r.coefficients.filter(q=>!zero(q)).length})).filter(({i})=>!zero(rows[i].coefficients[j])&&rows[i].coefficients.slice(0,j).every(zero)).sort((a,b)=>a.count-b.count);
   const i=candidates[0]?.i;if(i!==undefined){const step=manualStep(rows,i,j);if(step)action=step;}
  }
 }
 for(let j=0;method!=='substitution'&&j<rows[0].coefficients.length&&!action;j++){
  const source=rows.findIndex(r=>!zero(r.coefficients[j])&&r.coefficients.slice(0,j).every(zero));if(source<0)continue;const target=rows.findIndex((r,i)=>i!==source&&!zero(r.coefficients[j]));if(target<0)continue;
  const q=neg(div(rows[target].coefficients[j],rows[source].coefficients[j]));action=one(q)?{kind:'add',source,target}:scaleToward(source,q);
 }
 if(!action)for(let i=0;i<rows.length;i++){const j=rows[i].coefficients.findIndex(q=>!zero(q));if(j>=0){const step=manualStep(rows,i,j);if(step){action=step;break;}}else{const p=displayParts(rows[i]);const k=p.leftVariables.findIndex(q=>!zero(q));if(k>=0){action={kind:'move',row:i,side:'left',variable:k};break;}}}
 if(method==='substitution'&&action?.kind==='scale'){
  const row=rows[action.row],p=displayParts(row),j=p.leftVariables.findIndex(q=>!zero(q));
  if(j>=0){const term=row.written?expressionTerms(row.written.left).findIndex(t=>simpleTerm(t)?.variable===j):undefined;
   action=factorAction(action.row,row,'left',j,'coefficient',term);
  }
 }
 if(!action)return{text:'Déplace les termes pour isoler une inconnue, puis substitue sa valeur.'};
 const text=action.kind==='factor'?`Appuie longuement sur le coefficient dans L${action.row+1}, puis glisse-le dans l’autre membre pour isoler l’inconnue.`:action.kind==='move'?`${actionLabel(action)} : glisse ce terme de l’autre côté du signe égal.`:action.kind==='scale'?`Touche le point de L${action.row+1} et choisis ${actionLabel(action)} sur la molette.`:action.kind==='add'?`Glisse le point de L${action.source+1} sur L${action.target+1} pour additionner les deux membres correspondants.`:action.kind==='substitute'?`Sélectionne ${variables[action.variable]} isolé dans L${action.row+1}, puis « Substituer ».`:actionLabel(action);
 return{text,action};
}
export function satisfies(rows:Row[],values:Rational[]):boolean{return rows.every(r=>equal(r.coefficients.reduce((s,q,j)=>add(s,mul(q,values[j])),rat(0)),r.right));}
