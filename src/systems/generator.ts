import { rng } from '../levels/generator';
import { add, mul, rat } from '../math/rational';
import { displayParts } from './engine';
import { systemLevels, type SystemLevel } from './levels';

/** Seeded affine changes preserve rank, including contradictory and dependent systems. */
export function generatedSystem(world:2|3,seed:number):SystemLevel {
    const random=rng(seed),pick=(a:number,b:number)=>a+Math.floor(random()*(b-a+1));
    const templates=systemLevels.filter(l=>l.world===world),base=templates[pick(0,templates.length-1)];
    const shifts=Array.from({length:world},()=>rat(pick(-7,7),pick(1,3)));
    if(shifts.every(q=>q.n===0n))shifts[0]=rat(1);
    const signs=shifts.map(()=>rat(pick(0,1)?1:-1));
    const rows=base.rows.map(row=>{
        const p=displayParts(row),offset=row.coefficients.reduce((s,q,j)=>add(s,mul(q,shifts[j])),rat(0));
        return {coefficients:row.coefficients.map((q,j)=>mul(q,signs[j])),right:add(row.right,offset),layout:{rightVariables:p.rightVariables.map((q,j)=>mul(q,signs[j])),leftConstant:p.leftConstant}};
    });
    return {id:`ps1-${world}-${seed>>>0}`,seed:seed>>>0,title:`Système inédit · ${world} × ${world}`,world,revision:1,chapter:'Méthode libre',method:'choice',rows,budget:world===2?32:85,tip:'Choisis ta méthode : substitue une inconnue isolée ou prépare des opposés pour combiner les lignes.'};
}
const cache=new Map<string,SystemLevel>();
export function getSystemLevel(id:string):SystemLevel|undefined {
    const fixed=systemLevels.find(l=>l.id===id);if(fixed)return fixed;
    const match=/^ps1-([23])-(0|[1-9]\d{0,9})$/.exec(id);if(!match||Number(match[2])>0xffffffff)return;
    if(!cache.has(id)){if(cache.size>=8)cache.delete(cache.keys().next().value!);cache.set(id,generatedSystem(Number(match[1]) as 2|3,Number(match[2])));}
    return cache.get(id);
}
