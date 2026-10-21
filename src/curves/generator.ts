import { rng } from '../levels/generator';
import { add, mul, rat, readRational, str } from '../math/rational';
import { curveLevels, type CurveLevel } from './levels';

/** A similarity and translation keep every template's intersection count and conic type. */
export function generatedCurve(seed:number):CurveLevel {
    const random=rng(seed),pick=(a:number,b:number)=>a+Math.floor(random()*(b-a+1));
    const base=curveLevels[pick(0,curveLevels.length-1)],k=pick(1,3),sx=k*(pick(0,1)?1:-1),sy=k*(pick(0,1)?1:-1);
    let h=pick(-4,4),j=pick(-4,4);if(!h&&!j)h=1;
    const xy=sx*sy/(k*k);
    const curves=base.curves.map(([a,b,c,d,e,f])=>[a,b*xy,c,d*sx-2*a*h-b*xy*j,e*sy-2*c*j-b*xy*h,k*k*f-a*h*h-b*xy*h*j-c*j*j+d*sx*h+e*sy*j]) as [number[],number[]];
    const coordinate=(value:string,scale:number,offset:number)=>{
        if(!value.includes('sqrt('))return str(add(rat(offset),mul(rat(scale),readRational(value))));
        const sign=(value.startsWith('-')?-1:1)*Math.sign(scale),q=readRational(value.slice(value.indexOf('(')+1,-1));
        return `${offset||''}${sign<0?'-':offset?'+':''}sqrt(${str(mul(q,rat(scale*scale)))})`;
    };
    return {...base,id:`pc1-${seed>>>0}`,seed:seed>>>0,template:base.id,title:`${base.title} · inédit`,curves,expected:base.expected.map(p=>[coordinate(p[0],sx,h),coordinate(p[1],sy,j)]),budget:100,tip:'Élimine une inconnue par substitution ou combinaison, puis résous l’équation obtenue et retrouve chaque couple.'};
}
const cache=new Map<string,CurveLevel>();
export function getCurveLevel(id:string):CurveLevel|undefined {
    const fixed=curveLevels.find(l=>l.id===id);if(fixed)return fixed;
    const match=/^pc1-(0|[1-9]\d{0,9})$/.exec(id);if(!match||Number(match[1])>0xffffffff)return;
    if(!cache.has(id)){if(cache.size>=8)cache.delete(cache.keys().next().value!);cache.set(id,generatedCurve(Number(match[1])));}
    return cache.get(id);
}
