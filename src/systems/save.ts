import { systemLevels } from './levels';
import { copyRows, transformSystem, type Row, type SystemAction } from './engine';
export interface SystemResult { stars:number; moves:number; hints:number; errors:number }
export interface SystemSnapshot { level:string; events:SystemAction[]; moves:number; hints:number; errors:number }
export interface SystemsData { results:Record<string,SystemResult>; active:SystemSnapshot|null; wheelMode:'multiply'|'divide' }
export interface SystemGame extends SystemSnapshot { rows:Row[] }
export const freshSystems=():SystemsData=>({results:{},active:null,wheelMode:'multiply'});
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const count=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?Math.min(100000,Math.floor(v)):0;
export function newSystemGame(level:string):SystemGame { const l=systemLevels.find(l=>l.id===level);if(!l)throw Error('Niveau inconnu.');return {level,events:[],moves:0,hints:0,errors:0,rows:copyRows(l.rows)}; }
export function readSystemSnapshot(value:unknown):SystemGame|null {
    try {
        if(!object(value)||typeof value.level!=='string'||!Array.isArray(value.events)||value.events.length>200)return null;
        const game=newSystemGame(value.level);
        for(const v of value.events){
            if(!object(v))return null;let action:SystemAction;
            if(v.kind==='scale'&&typeof v.row==='number'&&typeof v.factor==='string')action={kind:'scale',row:v.row,factor:v.factor,...(v.operation==='multiply'||v.operation==='divide'?{operation:v.operation}:{}),...(typeof v.operand==='string'?{operand:v.operand}:{})};
            else if(v.kind==='offset'&&typeof v.row==='number'&&typeof v.operand==='string')action={kind:'offset',row:v.row,operand:v.operand};
            else if(v.kind==='factor'&&typeof v.row==='number'&&(v.side==='left'||v.side==='right')&&(v.variable===null||typeof v.variable==='number')&&(v.part==='coefficient'||v.part==='numerator'||v.part==='denominator')&&typeof v.value==='string')action={kind:'factor',row:v.row,side:v.side,variable:v.variable,part:v.part,value:v.value,...(typeof v.term==='number'?{term:v.term}:{})};
            else if((v.kind==='written-move'||v.kind==='expand')&&typeof v.row==='number'&&(v.side==='left'||v.side==='right')&&typeof v.term==='number')action=v.kind==='written-move'?{kind:'written-move',row:v.row,side:v.side,term:v.term,...(v.merge===true?{merge:true}:{})}:{kind:'expand',row:v.row,side:v.side,term:v.term};
            else if(v.kind==='merge'&&typeof v.row==='number'&&(v.side==='left'||v.side==='right')&&Array.isArray(v.terms)&&v.terms.every(t=>typeof t==='number'))action={kind:'merge',row:v.row,side:v.side,terms:v.terms as number[]};
            else if(v.kind==='move'&&typeof v.row==='number'&&(v.side==='left'||v.side==='right')&&(v.variable===null||typeof v.variable==='number'))action={kind:'move',row:v.row,side:v.side,variable:v.variable};
            else if(v.kind==='add'&&typeof v.source==='number'&&typeof v.target==='number')action={kind:'add',source:v.source,target:v.target};
            else if((v.kind==='isolate'||v.kind==='substitute')&&typeof v.row==='number'&&typeof v.variable==='number')action={kind:v.kind,row:v.row,variable:v.variable};
            else return null;
            game.rows=transformSystem(game.rows,action);game.events.push(action);
        }
        return {...game,moves:Math.max(game.events.length,count(value.moves)),hints:count(value.hints),errors:count(value.errors)};
    }catch{return null;}
}
export const systemSnapshot=(g:SystemGame):SystemSnapshot=>({level:g.level,events:[...g.events],moves:g.moves,hints:g.hints,errors:g.errors});
export function decodeSystems(value:unknown):SystemsData {
    const data=freshSystems();if(!object(value))return data;
    if(object(value.results))for(const level of systemLevels){const r=value.results[level.id];if(object(r)&&count(r.stars)>0)data.results[level.id]={stars:Math.min(3,count(r.stars)),moves:count(r.moves),errors:count(r.errors),hints:count(r.hints)};}
    if(value.wheelMode==='divide')data.wheelMode='divide';
    const game=readSystemSnapshot(value.active);if(game)data.active=systemSnapshot(game);return data;
}
export function systemUnlocked(data:SystemsData,index:number):boolean { return index===0||!!data.results[systemLevels[index-1]?.id]; }
