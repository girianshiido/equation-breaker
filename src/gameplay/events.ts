import type { Event } from './game';
import { parse } from '../math/ast';
import { format } from '../math/format';
import { str, readRational } from '../math/rational';
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export function eventJSON(e: Event): unknown { if(e.kind==='complete-square')return {...e,local:e.local!==false}; if(e.kind==='square-roots')return {...e,exact:e.exact!==false}; if (e.kind === 'split') return { kind: e.kind, distinct: e.distinct !== false }; if (e.kind === 'add')
    return { kind: e.kind, expression: format(e.expression).replaceAll('−', '-') }; if (e.kind === 'divide' || e.kind === 'multiply')
    return { kind: e.kind, constant: str(e.constant) }; return e; }
export function eventRead(v: unknown): Event { if (!object(v))
    throw Error('Étape invalide'); const kind = v.kind; if (kind === 'drag' && typeof v.id === 'string' && /^[lr](\.\d+)?$/.test(v.id) && ['term', 'coefficient', 'denominator', 'rational-coefficient','algebraic-coefficient'].includes(String(v.part))) return { kind, id:v.id, part:v.part as 'term'|'coefficient'|'denominator'|'rational-coefficient'|'algebraic-coefficient' }; if (kind === 'add' && typeof v.expression === 'string')
    return { kind, expression: parse(v.expression) }; if ((kind === 'divide' || kind === 'multiply') && typeof v.constant === 'string')
    return { kind, constant: readRational(v.constant) }; if ((kind === 'expand' || kind === 'factor' || kind === 'simplify' || kind === 'write-square') && typeof v.id === 'string' && /^[lr](\.\d+)*$/.test(v.id))
    return { kind, id: v.id }; if ((kind === 'combine' || kind === 'complete-square' || kind==='difference-squares' || kind==='factor-common') && Array.isArray(v.ids) && v.ids.length === 2 && v.ids.every(id => typeof id === 'string' && /^[lr](\.\d+)*$/.test(id)))
    return kind==='complete-square'?{kind,ids:v.ids as string[],local:v.local===true}:kind==='factor-common'?{kind,ids:v.ids as string[],maximal:v.maximal===true}:{kind,ids:v.ids as string[]}; if (kind === 'split') return { kind, distinct: v.distinct === true }; if(kind==='square-roots')return {kind,exact:v.exact===true}; if (['delta', 'roots', 'collect', 'confirm-branch', 'no-real'].includes(String(kind)))
    return { kind } as Event; if (kind === 'branch' && typeof v.index === 'number' && Number.isInteger(v.index))
    return { kind, index: v.index }; throw Error('Étape inconnue'); }
