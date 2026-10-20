import { campaign } from '../levels/campaign';
import { generated } from '../levels/generator';
import { start, perform, type Game, type Event } from '../gameplay/game';
import { parse } from '../math/ast';
import { format } from '../math/format';
import { readRational, str } from '../math/rational';
export const KEY = 'equation-breaker-v1';
export interface Result {
    stars: number;
    moves: number;
    time: number;
    methods: string[];
}
export interface Preferences {
    sound: boolean;
    motion: boolean;
    contrast: boolean;
    large: boolean;
    lite: boolean;
    timer: boolean;
    memberLabels: boolean;
    explainSteps: boolean;
    theme: 'mint' | 'blue' | 'rose';
}
export interface Stats {
    wins: number;
    clean: number;
    moves: number;
    errors: number;
    hints: number;
    expanded: number;
    combined: number;
    none: number;
    all: number;
    products: number;
    fractions: number;
    quadratics: number;
    fast: number;
    skills: {
        wins: number;
        errors: number;
        hints: number;
        transfer: number;
    }[];
}
export interface Save {
    version: 1;
    results: Record<string, Result>;
    prefs: Preferences;
    stats: Stats;
    active: unknown;
    arcadeBest: number;
}
export function fresh(): Save { return { version: 1, results: {}, prefs: { sound: false, motion: !matchReduced(), contrast: false, large: false, lite: false, timer: false, memberLabels: false, explainSteps: false, theme: 'mint' }, stats: { wins: 0, clean: 0, moves: 0, errors: 0, hints: 0, expanded: 0, combined: 0, none: 0, all: 0, products: 0, fractions: 0, quadratics: 0, fast: 0, skills: Array.from({ length: 6 }, () => ({ wins: 0, errors: 0, hints: 0, transfer: 0 })) }, active: null, arcadeBest: 0 }; }
const matchReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown, max = 1e8): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : 0;
export function decode(raw: string | null): Save { const s = fresh(); if (!raw)
    return s; try {
    const v: unknown = JSON.parse(raw);
    if (!object(v) || v.version !== 1)
        return s;
    if (object(v.results))
        for (const l of campaign) {
            const r = v.results[l.id];
            if (object(r) && count(r.stars, 3) > 0)
                s.results[l.id] = { stars: count(r.stars, 3), moves: count(r.moves), time: count(r.time), methods: Array.isArray(r.methods) ? r.methods.filter((x): x is string => typeof x === 'string' && x.length < 500).slice(0, 3) : [] };
        }
    if (object(v.prefs)) {
        for (const k of ['sound', 'motion', 'contrast', 'large', 'lite', 'timer', 'memberLabels', 'explainSteps'] as const)
            if (typeof v.prefs[k] === 'boolean')
                s.prefs[k] = v.prefs[k];
        if (['mint', 'blue', 'rose'].includes(String(v.prefs.theme)))
            s.prefs.theme = v.prefs.theme as Preferences['theme'];
    }
    if (object(v.stats)) {
        for (const k of Object.keys(s.stats).filter(k => k !== 'skills') as (Exclude<keyof Stats, 'skills'>)[])
            s.stats[k] = count(v.stats[k]);
        if (Array.isArray(v.stats.skills))
            s.stats.skills = s.stats.skills.map((item, i) => { const vv = (v.stats as Record<string, unknown>).skills as unknown[]; const value = vv[i]; if (object(value))
                for (const k of Object.keys(item) as (keyof typeof item)[])
                    item[k] = count(value[k]); return item; });
    }
    s.active = v.active ?? null;
    s.arcadeBest = count(v.arcadeBest);
    return s;
}
catch {
    return s;
} }
export function load(): {
    save: Save;
    warning: string;
} { try {
    const raw = localStorage.getItem(KEY);
    let corrupted = false;
    try {
        if (raw) {
            const p = JSON.parse(raw);
            corrupted = !object(p) || p.version !== 1;
        }
    }
    catch {
        corrupted = true;
    }
    return { save: decode(raw), warning: corrupted ? 'Sauvegarde illisible : une progression neuve a été chargée.' : '' };
}
catch {
    return { save: fresh(), warning: 'Stockage local indisponible : la progression reste en mémoire pour cette visite.' };
} }
export function persist(s: Save): boolean { try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
}
catch {
    return false;
} }
function eventJSON(e: Event): unknown { if(e.kind==='complete-square')return {...e,local:e.local!==false}; if(e.kind==='square-roots')return {...e,exact:e.exact!==false}; if (e.kind === 'split') return { kind: e.kind, distinct: e.distinct !== false }; if (e.kind === 'add')
    return { kind: e.kind, expression: format(e.expression).replaceAll('−', '-') }; if (e.kind === 'divide' || e.kind === 'multiply')
    return { kind: e.kind, constant: str(e.constant) }; return e; }
function eventRead(v: unknown): Event { if (!object(v))
    throw Error('Étape invalide'); const kind = v.kind; if (kind === 'drag' && typeof v.id === 'string' && /^[lr](\.\d+)?$/.test(v.id) && ['term', 'coefficient', 'denominator', 'rational-coefficient','algebraic-coefficient'].includes(String(v.part))) return { kind, id:v.id, part:v.part as 'term'|'coefficient'|'denominator'|'rational-coefficient'|'algebraic-coefficient' }; if (kind === 'add' && typeof v.expression === 'string')
    return { kind, expression: parse(v.expression) }; if ((kind === 'divide' || kind === 'multiply') && typeof v.constant === 'string')
    return { kind, constant: readRational(v.constant) }; if ((kind === 'expand' || kind === 'factor' || kind === 'simplify' || kind === 'write-square') && typeof v.id === 'string' && /^[lr](\.\d+)*$/.test(v.id))
    return { kind, id: v.id }; if ((kind === 'combine' || kind === 'complete-square' || kind==='difference-squares' || kind==='factor-common') && Array.isArray(v.ids) && v.ids.length === 2 && v.ids.every(id => typeof id === 'string' && /^[lr](\.\d+)*$/.test(id)))
    return kind==='complete-square'?{kind,ids:v.ids as string[],local:v.local===true}:kind==='factor-common'?{kind,ids:v.ids as string[],maximal:v.maximal===true}:{kind,ids:v.ids as string[]}; if (kind === 'split') return { kind, distinct: v.distinct === true }; if(kind==='square-roots')return {kind,exact:v.exact===true}; if (['delta', 'roots', 'collect', 'confirm-branch', 'no-real'].includes(String(kind)))
    return { kind } as Event; if (kind === 'branch' && typeof v.index === 'number' && Number.isInteger(v.index))
    return { kind, index: v.index }; throw Error('Étape inconnue'); }
export function snapshot(g: Game, mode: string, arcade: number, combo: number): unknown { return { level: g.level.id, world: g.level.world, seed: g.level.seed, events: g.events.map(eventJSON), completed: g.s.completed.map(s => Boolean(s)), moves: g.moves, errors: g.errors, hints: g.hints, elapsed: g.elapsed + Date.now() - g.started, mode, arcade, combo }; }
export function restore(v: unknown): {
    game: Game;
    mode: 'campaign' | 'practice' | 'arcade';
    arcade: number;
    combo: number;
} | null { try {
    if (!object(v) || !Array.isArray(v.events) || v.events.length > 200)
        return null;
    let level = campaign.find(l => l.id === v.level);
    if (!level && typeof v.world === 'number' && Number.isInteger(v.world) && v.world >= 0 && v.world < 6 && typeof v.seed === 'number')
        level = generated(v.world, v.seed);
    if (!level)
        return null;
    const g = start(level);
    for (const e of v.events)
        perform(g, eventRead(e));
    if (Array.isArray(v.completed))
        g.s.completed = g.s.branches.map((eq, i) => v.completed instanceof Array && v.completed[i] && terminalSafe(eq) ? solveSafe(eq) : null);
    g.moves = Math.max(g.moves, count(v.moves));
    g.errors = count(v.errors);
    g.hints = count(v.hints);
    g.elapsed = count(v.elapsed, 86400000);
    return { game: g, mode: v.mode === 'practice' ? 'practice' : v.mode === 'arcade' ? 'arcade' : 'campaign', arcade: count(v.arcade), combo: count(v.combo) };
}
catch {
    return null;
} }
import { terminal as terminalSafe, solve as solveSafe } from '../math/solve';
export const worldUnlocked = (s: Save, w: number) => w === 0 || campaign.filter(l => l.world === w - 1).every(l => !!s.results[l.id]);
export const levelUnlocked = (s: Save, id: string) => { const l = campaign.find(l => l.id === id); return !!l && worldUnlocked(s, l.world) && (l.index === 0 || !!s.results[`w${l.world + 1}-${l.index}`]); };
