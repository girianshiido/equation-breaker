import { decodeCurves, freshCurves, type CurveData } from '../curves/save';
import { eventJSON, eventRead } from '../gameplay/events';
import { decodeSystems, freshSystems, type SystemsData } from '../systems/save';
import { campaign } from '../levels/campaign';
import { campaignWorldUnlocked, campaignStageUnlocked } from '../levels/progression';
import { generated } from '../levels/generator';
import { start, perform, type Game, type Event } from '../gameplay/game';
import { parse } from '../math/ast';
import { format } from '../math/format';
import { readRational, str } from '../math/rational';
export const KEY = 'equation-breaker-v1';
const SYSTEMS_KEY = 'equation-breaker-systems-v1';
const CURVES_KEY='equation-breaker-curves-v1';
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
    systems: SystemsData;
    curves: CurveData;
}
export function fresh(): Save { return { version: 1, results: {}, prefs: { sound: false, motion: !matchReduced(), contrast: false, large: false, lite: false, timer: false, memberLabels: false, explainSteps: false, theme: 'mint' }, stats: { wins: 0, clean: 0, moves: 0, errors: 0, hints: 0, expanded: 0, combined: 0, none: 0, all: 0, products: 0, fractions: 0, quadratics: 0, fast: 0, skills: Array.from({ length: 6 }, () => ({ wins: 0, errors: 0, hints: 0, transfer: 0 })) }, active: null, systems: freshSystems(), curves:freshCurves(), arcadeBest: 0 }; }
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
    s.systems = decodeSystems(v.systems);
    s.curves=decodeCurves(v.curves);
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
    const decoded = decode(raw);
    // Older cached releases do not know this mode and may rewrite the main save.
    if(raw&&!corrupted&&!Object.hasOwn(JSON.parse(raw),'systems')){try{decoded.systems=decodeSystems(JSON.parse(localStorage.getItem(SYSTEMS_KEY)||'null'));}catch{/* Keep a playable profile when the backup is unavailable. */}}
    if(raw&&!corrupted&&!Object.hasOwn(JSON.parse(raw),'curves')){try{decoded.curves=decodeCurves(JSON.parse(localStorage.getItem(CURVES_KEY)||'null'));}catch{}}
    return { save: decoded, warning: corrupted ? 'Sauvegarde illisible : une progression neuve a été chargée.' : '' };
}
catch {
    return { save: fresh(), warning: 'Stockage local indisponible : la progression reste en mémoire pour cette visite.' };
} }
export function persist(s: Save): boolean { try {
    localStorage.setItem(KEY, JSON.stringify(s));
    try { localStorage.setItem(SYSTEMS_KEY, JSON.stringify(s.systems)); } catch { /* The primary save already contains the systems progression. */ }
    try {localStorage.setItem(CURVES_KEY,JSON.stringify(s.curves));}catch{}
    return true;
}
catch {
    return false;
} }
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
export const worldUnlocked = (s: Save, w: number) => campaignWorldUnlocked(s,w);
export const levelUnlocked = (s: Save, id: string) => campaign.some(l=>l.id===id)&&campaignStageUnlocked(s,id);
