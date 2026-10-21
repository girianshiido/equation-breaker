import {initialCurve,applyCurve,isolated,oneVariable,reductionLevel,rowEquation,coordinateEquation,type CurveAction} from '../../src/curves/algebra';
import type {CurveLevel} from '../../src/curves/levels';
import {start,suggestion,perform,validate,type Game} from '../../src/gameplay/game';
import {eventJSON} from '../../src/gameplay/events';
export function solveProblem(game:Game){for(let i=0;i<150&&!game.won;i++){const next=suggestion(game);if(next.action)perform(game,next.action);else validate(game);}if(!game.won)throw Error('Parcours bloqué');return game;}
export function curvePlan(level:CurveLevel){let state=initialCurve(level);const actions:CurveAction[]=[];const act=(a:CurveAction)=>{state=applyCurve(level,state,a);actions.push(a);};let row=0;
 if(['c3','c8','c10'].includes(level.id)){act({kind:'scale',row:0,value:'-1',operation:'multiply'});act({kind:'add',source:0,target:1});row=1;}
 else if(level.id==='c9'){act({kind:'add',source:0,target:1});row=1;}
 else {while(isolated(state.rows[1],1)===null){const current=state.rows[1],move=current.left.findIndex(t=>t.a>0);if(move>=0)act({kind:'move',row:1,side:'left',term:move});else{const q=current.left.find(t=>t.b===1)!.q;act({kind:'scale',row:1,value:`${q.n}/${q.d}`,operation:'divide'});}}act({kind:'substitute',row:1,variable:1});if(state.pending)act({kind:'expand',row:0});}
 const prep=[...actions],variable=oneVariable(state.rows[row]);if(variable===null)throw Error(level.id);const game=solveProblem(start(reductionLevel(level,rowEquation(state.rows[row],variable))));act({kind:'reduce',row,events:game.events.map(eventJSON)});const problems=[{kind:'reduce',row,variable,events:game.events.map(eventJSON),moves:game.moves}];
 const count=state.reduction!.roots.length;for(let index=0;index<count;index++){const game=solveProblem(start(reductionLevel(level,coordinateEquation(level,state.reduction!,index))));act({kind:'coordinate',index,events:game.events.map(eventJSON)});problems.push({kind:'coordinate',row:index,variable:(1-variable) as 0|1,events:game.events.map(eventJSON),moves:game.moves});}
 return {prep,problems,actions,state,moves:prep.length+problems.reduce((n,p)=>n+p.moves,0)};
}
