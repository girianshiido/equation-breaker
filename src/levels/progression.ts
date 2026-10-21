import { campaign, worlds, type World } from './campaign';
import { curveLevels } from '../curves/levels';
import { systemLevels } from '../systems/levels';
interface Progress {results:Record<string,{stars:number}>;systems:{results:Record<string,{stars:number}>};curves:{results:Record<string,{stars:number}>}}
export interface CampaignStage {id:string;world:number;index:number;title:string;kind:'equation'|'system'|'curve'}
export const campaignWorlds:World[]=[...worlds,
 {name:'Systèmes · 2 × 2',subtitle:'Deux inconnues, plusieurs chemins',symbol:'2×2',color:'#80ddcd',rule:'Substitue ou combine les lignes pour libérer les deux inconnues.',example:''},
 {name:'Systèmes · 3 × 3',subtitle:'Une ligne de plus, les mêmes gestes',symbol:'3×3',color:'#a9b7ff',rule:'Substitue et combine trois équations, puis conclus exactement.',example:''},
 {name:'Systèmes · second degré',subtitle:'Cercles, paraboles et autres rencontres',symbol:'xy²',color:'#ffb6d0',rule:'Élimine une inconnue, résous les équations obtenues et vérifie tous les couples.',example:''}
];
export const campaignStages:CampaignStage[]=[...campaign.map(l=>({id:l.id,world:l.world,index:l.index,title:l.title,kind:'equation' as const})),...systemLevels.map(l=>({id:l.id,world:l.world+4,index:systemLevels.filter(s=>s.world===l.world).indexOf(l),title:l.title,kind:'system' as const})),...curveLevels.map((l,index)=>({id:l.id,world:8,index,title:l.title,kind:'curve' as const}))];
export const campaignStageCount=campaignStages.length;
export const campaignStarCount=campaignStageCount*3;
export const stageResult=(s:Progress,l:CampaignStage)=>l.kind==='equation'?s.results[l.id]:l.kind==='system'?s.systems.results[l.id]:s.curves.results[l.id];
export const campaignCompleted=(s:Progress)=>campaignStages.filter(l=>stageResult(s,l)).length;
export const campaignStars=(s:Progress)=>campaignStages.reduce((total,l)=>total+(stageResult(s,l)?.stars??0),0);
export const campaignFrontier=(s:Progress)=>campaignStages.find(l=>!stageResult(s,l))??campaignStages[0];
export const campaignWorldUnlocked=(s:Progress,w:number)=>Number.isInteger(w)&&w>=0&&w<campaignWorlds.length&&campaignStages.filter(l=>l.world<w).every(l=>!!stageResult(s,l));
export function campaignStageUnlocked(s:Progress,id:string):boolean{const i=campaignStages.findIndex(l=>l.id===id);return i>=0&&campaignStages.slice(0,i).every(l=>!!stageResult(s,l));}
