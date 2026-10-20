import { squareCompletion, squareEquation } from './math/squares';
import './ui/styles.css';
import './ui/polish.css';
import { SoundBank, type Cue } from './ui/sound';
import { installTouchGuards } from './ui/touch';
import { bindEquationFit } from './ui/equation-fit';
import { campaign, worlds, worldLevels, type Level } from './levels/campaign';
import { generated } from './levels/generator';
import { load, persist, fresh, restore, snapshot, worldUnlocked, levelUnlocked, decode, type Save } from './app/persistence';
import { start, perform, validate, undo, score, suggestion, type Game, type Event } from './gameplay/game';
import { badges } from './gameplay/achievements';
import { terms, nodeAt, parse, c, type Expr } from './math/ast';
import { monomial, isZero } from './math/normalize';
import { rat, neg, one, zero, str, readRational } from './math/rational';
import { format, escape, equationText, operandText } from './math/format';
import { transform, expandable, factorable, zeroBranches, quadraticInfo, type Action } from './math/transformations';
import { solve, solutionText, terminal, discriminant } from './math/solve';
import { math, blocks } from './ui/math';
import { bindGestures, type PickedGrip } from './ui/gestures';
import { gripValue, groupedFactor } from './math/gestures';
installTouchGuards();
let pickedGrip: PickedGrip | null = null;
let disposeGestures: (() => void) | null = null;
const app = document.querySelector<HTMLDivElement>('#app')!;
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const dc = document.querySelector<HTMLDivElement>('#dialog-content')!;
const live = document.querySelector<HTMLDivElement>('#live')!;
let { save, warning } = load();
const soundBank = new SoundBank(() => save.prefs.sound);
const soundIcon = (enabled: boolean) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4V5Z"/>${enabled ? '<path d="M14 8a6 6 0 0 1 0 8M17 5a10 10 0 0 1 0 14"/>' : '<path d="m15 9 6 6m0-6-6 6"/>'}</svg>`;
let screen = 'home', mode: 'campaign' | 'practice' | 'arcade' = 'campaign', chosenWorld = 0, g: Game | null = null;
let selected: string[] = [], highlight: string[] = [], feedback = '', busy = false, pending: Event | null = null, arcade = 0, combo = 0;
let installPrompt: {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: string;
    }>;
} | null = null;
let clockTick = Date.now();
function tickClock() { const now = Date.now(); if (g && !g.won && screen === 'game' && !document.hidden && !dialog.open)
    g.elapsed += Math.max(0, now - clockTick); if (g)
    g.started = now; clockTick = now; }
let offlineReady = false, waitingWorker: ServiceWorker | null = null;
let recovered = restore(save.active);
const icon = (name: string) => ({ play: '▷', map: '⊞', practice: '⌁', trophy: '✦', settings: '⚙', back: '←', hint: '◉', undo: '↶', history: '≡', check: '✓', sound: '♪' }[name] || name);
const stars = (n: number) => `<span class="stars" aria-label="${n} étoiles sur 3">${'★'.repeat(n)}<span>${'☆'.repeat(3 - n)}</span></span>`;
const totalStars = () => Object.values(save.results).reduce((s, r) => s + r.stars, 0);
const completed = () => Object.keys(save.results).length;
const frontier = () => campaign.find(l => !save.results[l.id]) ?? campaign[0];
const unlocked = () => worlds.map((_, w) => w).filter(w => worldUnlocked(save, w));
const statTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const button = (id: string, label: string, cls = '', extra = '') => `<button type="button" id="${id}" class="${cls}" ${id === 'undo' ? 'aria-label="Annuler la dernière transformation"' : id === 'hint' ? 'aria-label="Demander un indice"' : id === 'history' ? 'aria-label="Voir les étapes"' : ''} ${extra}>${label}</button>`;
function announce(s: string) { live.textContent = s; }
function store() { if (!persist(save)) {
    warning = 'La sauvegarde locale est indisponible. Garde cet onglet ouvert pour conserver ta progression.';
    announce(warning);
} }
function checkpoint() { tickClock(); if (g && !g.won) {
    save.active = snapshot(g, mode, arcade, combo);
    store();
} }
function prefs() { const p = save.prefs; document.documentElement.dataset.motion = String(p.motion && !p.lite); document.documentElement.dataset.contrast = String(p.contrast); document.documentElement.dataset.large = String(p.large); document.documentElement.dataset.theme = p.theme; document.documentElement.dataset.memberLabels = String(p.memberLabels); }
prefs();
function shell(body: string, active = 'home') { disposeGestures?.(); disposeGestures = null; tickClock(); app.innerHTML = `<div class="app-shell"><header class="topbar"><button class="brand" data-screen="home" aria-label="Equation Breaker, accueil"><span class="brand-mark">E<span>∕</span>B</span><span>EQUATION<span class="brand-break">BREAKER<span class="brand-dot">.</span></span></span></button><nav class="desktop-nav" aria-label="Navigation principale"><button data-screen="home" class="${active === 'home' ? 'active' : ''}">Accueil</button><button data-screen="worlds" class="${active === 'worlds' ? 'active' : ''}">Campagne</button><button data-screen="practice" class="${active === 'practice' ? 'active' : ''}">Laboratoire</button></nav><div class="top-tools"><span class="star-total">✦ <b>${totalStars()}</b><span> / 216</span></span><button id="sound-toggle" class="icon-button sound-toggle" aria-label="${save.prefs.sound ? 'Couper les sons' : 'Activer les sons'}" aria-pressed="${save.prefs.sound}">${soundIcon(save.prefs.sound)}</button><button class="icon-button" data-screen="settings" aria-label="Paramètres">⚙</button></div></header><main id="main" tabindex="-1">${warning ? `<p class="warning">${escape(warning)}</p>` : ''}${body}</main><footer class="footer"><span><span class="status-dot ${offlineReady ? 'ready' : ''}"></span> ${offlineReady ? 'Prêt pour le hors-ligne' : 'Laboratoire d’algèbre · sans compte'}</span><span>Comprendre. Transformer. Réussir.</span>${waitingWorker ? button('update', 'Mise à jour disponible', 'text-button') : ''}</footer>${screen !== 'game' ? `<nav class="mobile-nav" aria-label="Navigation mobile"><button data-screen="home" ${active === 'home' ? 'aria-current="page"' : ''}>⌂<span>Accueil</span></button><button data-screen="worlds" ${active === 'worlds' ? 'aria-current="page"' : ''}>⊞<span>Mondes</span></button><button data-screen="practice" ${active === 'practice' ? 'aria-current="page"' : ''}>⌁<span>Labo</span></button><button data-screen="badges" ${active === 'badges' ? 'aria-current="page"' : ''}>✦<span>Succès</span></button></nav>` : ''}</div>`; bindGlobal(); }
function home() { screen = 'home'; const next = frontier(), w = worlds[next.world], bs = badges(save), earned = bs.filter(b => b.value >= b.target).length; shell(`<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-square"></span> LE POUVOIR DE L’ÉGALITÉ</div><h1>Chaque équation<br>peut être <em>libérée.</em></h1><p class="hero-description">Touche les termes. Transforme l’équilibre. <br>À toi de libérer l’inconnue.</p><div class="hero-actions">${button('play', `<span>▷</span> ${completed() ? 'Continuer l’aventure' : 'Entrer dans l’arène'} <span>→</span>`, 'primary')}${(g && !g.won) || recovered ? button('resume', 'Reprendre ma partie', 'secondary') : ''}</div><div class="hero-meta"><span>6 mondes à explorer</span><span>Sans limite de temps</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-label">EXPÉRIENCE 001</span><span class="float-symbol symbol-one">+</span><span class="float-symbol symbol-two">÷</span><div class="art-equation"><div class="art-block">x <span>+ 3</span></div><span class="art-equal">=</span><div class="art-block art-number">8</div></div><div class="art-operation"><span>− 3</span><span>− 3</span></div><span class="art-line"></span><div class="art-solved">x <span>=</span> 5<span class="art-check">✓</span></div><span class="art-caption">MÊME OPÉRATION. MÊME ÉQUILIBRE.</span></div></section><div class="section-heading"><div><p class="eyebrow">TA PROCHAINE ÉTAPE</p><h2>Le laboratoire t’attend.</h2></div><button data-screen="worlds" class="text-button">Tous les mondes <span>↗</span></button></div><div class="home-panels"><button class="continue-card" id="continue" style="--world:${w.color}"><span class="world-symbol">${w.symbol}</span><span class="continue-info"><small>MONDE ${next.world + 1} · NIVEAU ${next.index + 1}</small><strong>${escape(next.title)}</strong><span>${escape(w.name)} · ${escape(w.subtitle)}</span></span><span class="circle-arrow">→</span></button><button class="compact-card" data-screen="stats"><span class="mini-icon">↗</span><span><strong>${completed()}<small> / 72</small></strong><span>Expériences réussies</span></span></button><button class="compact-card" data-screen="badges"><span class="mini-icon gold">✦</span><span><strong>${earned}<small> / 12</small></strong><span>Succès débloqués</span></span></button></div><div class="section-heading world-preview-heading"><div><p class="eyebrow">UN GESTE, UNE NOUVELLE COMPÉTENCE</p><h2>Explore les six mondes.</h2></div></div><div class="world-grid">${worlds.map((w, i) => worldCard(i, true)).join('')}</div><div class="home-shortcuts"><button data-screen="stats" class="text-button">↗ Mes statistiques</button><button data-screen="badges" class="text-button">✦ Mes succès</button></div><div class="bottom-callout"><span>⌁</span><div><strong>Un peu de pratique, beaucoup de déclics.</strong><p>Le laboratoire crée de nouvelles équations pour les compétences débloquées.</p></div><button data-screen="practice" class="secondary">S’entraîner ↗</button></div>`); bind('play', () => { mode = 'campaign'; openLevel(next); }); bind('continue', () => { mode = 'campaign'; openLevel(next); }); bind('resume', resume); bindWorlds(); }
function worldCard(i: number, preview = false) { const w = worlds[i], levels = worldLevels(i), done = levels.filter(l => save.results[l.id]).length, locked = !worldUnlocked(save, i); return `<button class="world-card ${locked ? 'locked' : ''}" data-world="${i}" style="--world:${w.color}" ${locked ? 'aria-disabled="true"' : ''}><span class="world-top"><span class="world-symbol">${w.symbol}</span><span class="world-number">${String(i + 1).padStart(2, '0')} / 06 ${locked ? '⌑' : ''}</span></span><strong>${w.name}</strong><span class="world-subtitle">${w.subtitle}</span><span class="world-bottom"><span>${locked ? 'Termine le monde précédent' : `${done} / 12 expériences`}</span><span>${locked ? '⌑' : '→'}</span></span><span class="progress-track"><span style="width:${done / 12 * 100}%"></span></span></button>`; }
function bindWorlds() { document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(b => b.onclick = () => { const w = Number(b.dataset.world); if (!worldUnlocked(save, w)) {
    show('Monde verrouillé', `<p>Termine les 12 expériences du monde ${w} pour débloquer ${escape(worlds[w].name)}.</p>`);
    return;
} chosenWorld = w; levelMap(); }); }
function worldMap() { screen = 'worlds'; shell(`<section class="page-head"><p class="eyebrow">CAMPAGNE · ${totalStars()} / 216 ÉTOILES</p><h1>Six mondes.<br><em>Un même équilibre.</em></h1><p>Apprends un geste, expérimente, puis choisis ta propre méthode.</p></section><div class="world-grid">${worlds.map((_, i) => worldCard(i)).join('')}</div>`, 'worlds'); bindWorlds(); }
function levelMap() { screen = 'levels'; const w = worlds[chosenWorld]; shell(`<section class="page-head compact" style="--world:${w.color}"><button class="text-button" id="back-worlds">← Les mondes</button><p class="eyebrow">MONDE ${chosenWorld + 1} · 12 EXPÉRIENCES</p><h1><em>${w.name}</em></h1><p>${w.rule}</p><div class="rule-example">${escape(w.example)}</div></section><div class="level-grid">${worldLevels(chosenWorld).map(l => { const r = save.results[l.id], ok = levelUnlocked(save, l.id); return `<button class="level-card" data-level="${l.id}" ${ok ? '' : 'disabled'}><span class="level-number">${String(l.index + 1).padStart(2, '0')}</span><span class="level-info"><small>${l.tutorial ? 'DÉCOUVERTE' : l.transfer ? 'TRANSFERT' : 'AUTONOMIE'}</small><strong>${escape(l.title)}</strong><span class="level-formula">${math(l.initial.left)} <span class="muted">=</span> ${math(l.initial.right)}</span></span><span>${ok ? stars(r?.stars ?? 0) : '⌑'}</span></button>`; }).join('')}</div>`, 'worlds'); bind('back-worlds', worldMap); document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b => b.onclick = () => { mode = 'campaign'; openLevel(campaign.find(l => l.id === b.dataset.level)!); }); }
function practice() { screen = 'practice'; shell(`<section class="page-head"><p class="eyebrow">LABORATOIRE · GÉNÉRATION REPRODUCTIBLE</p><h1>Le déclic vient<br><em>en pratiquant.</em></h1><p>Choisis une compétence déjà débloquée. De nouvelles équations, sans enjeu sur tes étoiles de campagne.</p></section><div class="training-grid">${worlds.map((w, i) => `<button class="training-card" data-train="${i}" style="--world:${w.color}" ${worldUnlocked(save, i) ? '' : 'disabled'}><span class="world-symbol">${w.symbol}</span><strong>${w.name}</strong><span>${w.subtitle}</span><span class="text-button">${worldUnlocked(save, i) ? 'Lancer une expérience →' : 'À débloquer en campagne'}</span></button>`).join('')}</div><section class="arcade-panel"><div><p class="eyebrow">MODE ARCADE</p><h2>Entre dans le rythme.</h2><p>Enchaîne 5 équations de tes mondes débloqués. Le chrono est facultatif ; la rigueur reste la même.</p><span class="muted">Meilleur score : ${save.arcadeBest} points</span></div>${button('arcade', 'Démarrer une série →', 'primary')}</section>`, 'practice'); document.querySelectorAll<HTMLButtonElement>('[data-train]').forEach(b => b.onclick = () => { mode = 'practice'; chosenWorld = Number(b.dataset.train); openLevel(generated(chosenWorld, newSeed())); }); bind('arcade', () => { mode = 'arcade'; arcade = 0; combo = 0; nextArcade(); }); }
function newSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function nextArcade() { const ww = unlocked(); const seed = newSeed(); openLevel(generated(ww[seed % ww.length], seed)); }
function openLevel(l: Level) { tickClock(); g = start(l); clockTick = Date.now(); selected = []; pickedGrip = null; highlight = []; feedback = ''; screen = 'game'; checkpoint(); gameScreen(); if (l.tutorial && mode === 'campaign') {
    feedback = l.world === 0 && l.index === 0 ? 'Glisse +3 dans le membre droit. Appui long sur un terme en x pour saisir son facteur.' : suggestion(g).text;
    gameScreen();
} window.scrollTo(0, 0); }
function resume() { if (g && !g.won) {
    screen = 'game';
    gameScreen();
    return;
} if (!recovered)
    return; g = recovered.game; mode = recovered.mode; arcade = recovered.arcade; combo = recovered.combo; selected = []; screen = 'game'; gameScreen(); }
function available() {
    if (!g)
        return '';
    let html = '';
    const eq = g.s.eq;
    if (selected.length === 2) {
        const monomials = selected.map(id => monomial(nodeAt(eq, id)));
        if (monomials[0] && monomials[1] && monomials[0].degree === monomials[1].degree) html += button('combine', '⊕ Fusionner', 'action');
        if (g.level.world === 5) try {
            const completion = squareCompletion(eq, selected);
            html += button('complete-square', `Compléter le carré (+${operandText(completion.added)})`, 'action special');
        } catch { /* This pair has no monic quadratic and linear term. */ }
    }
    if (selected.length === 1) {
        const e = nodeAt(eq, selected[0]), m = monomial(e), group = groupedFactor(e);
        if (m && !zero(m.q) && m.degree <= 1)
            html += button('opposite', `Ajouter l’opposé ${format({ kind: 'constant', value: neg(m.q) })}${m.degree ? 'x' : ''} aux deux membres`, 'action balance-action');
        if ((m && m.degree === 1 && !one(m.q)) || (group && !one(rat(group.q.n))))
            html += button('coefficient', `÷ ${operandText(group || (pickedGrip?.id === selected[0] && pickedGrip.part === 'coefficient') ? gripValue(e, 'coefficient') : m!.q)} aux deux membres`, 'action');
        if ((m && m.degree === 1) || group) {
            for (const part of ['coefficient', 'denominator'] as const) {
                try {
                    const value = gripValue(e, part);
                    html += `<button type="button" class="action grip-action" data-pick="${part}">Saisir ${part === 'coefficient' ? 'le coefficient' : 'le dénominateur'} ${operandText(value)}</button>`;
                    if (part === 'denominator') html += button('denominator', `× ${operandText(value)} aux deux membres`, 'action');
                } catch { /* No detachable factor of 1. */ }
            }
        }
        if (expandable(e))
            html += button('expand', '✳ Développer', 'action');
        if (e.kind === 'fraction')
            html += button('simplify', '½ Simplifier', 'action');
        if (g.level.world >= 4 && factorable(e))
            html += button('factor', '⋈ Factoriser', 'action');
    }
    if (g.level.world >= 4 && !g.s.branches.length) {
        try {
            zeroBranches(eq);
            html += button('split', '⋈ Ouvrir les branches', 'action special');
        }
        catch { /* no product */ }
        if (!selected.length && factorable(eq.left) && isZero(eq.right))
            html += button('factor-left', '⋈ Factoriser à gauche', 'action special');
    }
    if (g.level.world === 5 && !g.s.branches.length) {
        try { squareEquation(eq); html += button('square-roots', '± Extraire les racines', 'action special'); } catch { /* Isolate the square first. */ }
        try {
            quadraticInfo(eq);
            html += g.s.delta ? button('roots', 'Construire les racines exactes', 'action special') : button('delta', 'Δ Calculer le discriminant', 'action special');
        }
        catch { /* not ready */ }
    }
    if (g.s.branches.length && g.s.completed.every(Boolean) && !g.s.answer)
        html += button('collect', '∪ Réunir les solutions', 'action special');
    return html || '<p class="selection-help">Touche un bloc pour découvrir ses transformations.</p>';
}
function gameScreen() { if (!g)
    return; screen = 'game'; const w = worlds[g.level.world], s = g.s; const selection = selected.length ? selected.map(id => format(nodeAt(s.eq, id))).join(' ; ') : 'Aucun bloc sélectionné'; shell(`<section class="game" aria-busy="${busy}" style="--world:${w.color}"><div class="game-heading"><button id="pause" class="icon-button" aria-label="Mettre en pause">Ⅱ</button><div><p class="eyebrow">${mode === 'campaign' ? `MONDE ${g.level.world + 1} · ${g.level.index + 1} / 12` : mode === 'practice' ? 'LABORATOIRE' : `ARCADE · ${arcade + 1} / 5 · COMBO ${combo}`}</p><h1>${escape(g.level.title)}</h1></div><span class="world-symbol small">${w.symbol}</span></div><div class="mission"><span><span class="tiny-square"></span> ${g.level.goal}</span><button class="text-button" id="rule">La règle ↗</button></div><div class="game-meter"><span><b id="moves">${g.moves}</b> transformations</span><span>Objectif ★★★ : ≤ ${g.level.budget} · sans erreur ni indice</span>${save.prefs.timer ? `<time id="timer">${statTime(g.elapsed + Date.now() - g.started)}</time>` : ''}</div>${s.branches.length ? `<div class="branches" aria-label="Branches du produit nul">${s.branches.map((eq, i) => `<button data-branch="${i}" class="${s.branch === i ? 'active' : ''}">Porte ${i + 1} ${s.completed[i] ? '✓' : ''}<span>${escape(equationText(eq))}</span></button>`).join('')}</div>` : ''}<div class="arena ${Math.max(format(s.eq.left).length, format(s.eq.right).length) > 12 ? 'arena-dense' : ''}" id="arena"><div class="plate left-plate"><button class="plate-label" data-whole="l" aria-label="Sélectionner tout le membre gauche">MEMBRE GAUCHE <span>⌜</span></button><div class="blocks">${blocks(s.eq.left, 'l', selected, highlight)}</div>${s.mirror ? `<div class="mirror">${escape(s.mirror)}</div>` : ''}</div><div class="equal-sign" aria-label="égal à">=</div><div class="plate right-plate"><button class="plate-label" data-whole="r" aria-label="Sélectionner tout le membre droit">MEMBRE DROIT <span>⌝</span></button><div class="blocks">${blocks(s.eq.right, 'r', selected, highlight)}</div>${s.mirror ? `<div class="mirror">${escape(s.mirror)}</div>` : ''}</div></div>${s.answer ? `<div class="solution-reveal">${escape(solutionText(s.answer))}</div>${g.events.at(-1)?.kind === 'square-roots' ? `<p class="root-relations">${escape(s.label)}</p>` : ''}` : ''}${s.delta ? `<div class="delta-reveal">${escape(s.label)}<span>${escape(s.why)}</span></div>` : ''}<div class="context-panel"><div class="selection-caption"><span>SÉLECTION</span><span>${escape(selection)}</span>${selected.length ? button('clear', '× Effacer', 'text-button') : ''}</div><div class="context-actions">${available()}</div></div><div class="operation-bar"><span>LES DEUX MEMBRES</span>${button('operation', '+ / − / × / ÷', 'operation-button')}${button('negate', '× (−1)', 'negate-button', 'aria-label="Multiplier les deux membres par moins un"')}<button id="why" class="text-button">Pourquoi ?</button></div><p class="feedback ${feedback ? 'has-message' : ''}" role="status">${escape(feedback || s.label)}</p><div class="game-controls">${button('undo', '↶ <span>Annuler</span>', 'utility', g.history.length ? '' : 'disabled')}${button('hint', '◉ <span>Indice</span>', 'utility')}${button('history', '≡ <span>Étapes</span>', 'utility')}${button('validate', 'Valider <span>✓</span>', 'primary validate')}</div><div class="game-notes"><span>${g.errors} erreur${g.errors > 1 ? 's' : ''} · ${g.hints} indice${g.hints > 1 ? 's' : ''}</span><span>Glisse un terme · Appui long : facteur</span></div></section>`, 'worlds'); bindGame(); }
function bindGame() { if (!g)
    return; document.querySelectorAll<HTMLButtonElement>('[data-node]').forEach(b => b.onclick = () => select(b.dataset.node!)); document.querySelectorAll<HTMLButtonElement>('[data-whole]').forEach(b => b.onclick = () => { selected = [b.dataset.whole!]; highlight = []; gameScreen(); }); bind('clear', () => { selected = []; pickedGrip = null; gameScreen(); }); bind('opposite', () => { const e = nodeAt(g!.s.eq, selected[0]), m = monomial(e)!; preview({ kind: 'add', expression: m.degree ? { kind: 'product', factors: [c(neg(m.q)), { kind: 'variable' }] } : c(neg(m.q)) }); }); bind('coefficient', () => { const e = nodeAt(g!.s.eq, selected[0]); preview(groupedFactor(e) ? { kind: 'drag', id: selected[0], part: 'coefficient' } : { kind: 'divide', constant: pickedGrip?.id === selected[0] && pickedGrip.part === 'coefficient' ? gripValue(e, 'coefficient') : monomial(e)!.q }); }); bind('combine', () => execute({ kind: 'combine', ids: [...selected] })); for (const kind of ['expand', 'factor', 'simplify'] as const)
    bind(kind, () => execute({ kind, id: selected[0] })); bind('factor-left', () => execute({ kind: 'factor', id: 'l' })); for (const kind of ['split', 'delta', 'roots', 'collect'] as const)
    bind(kind, () => execute({ kind })); document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(b => b.onclick = () => execute({ kind: 'branch', index: Number(b.dataset.branch) })); bind('operation', operationDialog); bind('undo', () => { if (busy || !g)
    return; if (undo(g)) {
    selected = [];
    highlight = [];
    pickedGrip = null;
    feedback = 'Étape annulée. La tentative reste comptée pour l’objectif de transformations.';
    checkpoint();
    gameScreen();
} }); bind('validate', check); bind('hint', hint); bind('why', () => show('Pourquoi cette transformation ?', `<p>${escape(g!.s.why)}</p><div class="rule-example">${escape(equationText(g!.s.eq))}</div>`)); bind('history', historyDialog); bind('rule', () => show(worlds[g!.level.world].name, `<p>${escape(worlds[g!.level.world].rule)}</p><div class="rule-example">${escape(worlds[g!.level.world].example)}</div><p>Pour trois étoiles : au plus ${g!.level.budget} transformations, sans erreur ni indice. C’est un objectif raisonnable, sans prétention d’optimalité. Le temps ne compte pas.</p>`)); bind('pause', pause);
    bind('complete-square', () => preview({ kind: 'complete-square', ids: [...selected] }));
    bind('square-roots', () => execute({ kind: 'square-roots' }));
    bind('negate', () => execute({ kind: 'multiply', constant: rat(-1) }));
    bind('denominator', () => { if (selected.length === 1) preview(groupedFactor(nodeAt(g!.s.eq, selected[0])) ? { kind: 'drag', id: selected[0], part: 'denominator' } : { kind: 'multiply', constant: gripValue(nodeAt(g!.s.eq, selected[0]), 'denominator') }); });
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(b => b.onclick = () => {
        pickGrip({ id: selected[0], part: b.dataset.pick as PickedGrip['part'] });
    });
    const arena = document.querySelector<HTMLElement>('#arena')!;
    const equationFit = bindEquationFit(arena);
    const stopGestures = bindGestures(arena, {
        equation: g.s.eq, picked: pickedGrip,
        allowed: () => !!g && !g.won && !busy && !dialog.open,
        motion: () => save.prefs.motion && !save.prefs.lite,
        onSound: tone,
        onLayout: equationFit.fit,
        onPick: pickGrip,
        onSelect: ids => { pickedGrip = null; selected = ids; feedback = 'Termes surlignés : choisis la transformation de ce groupe.'; gameScreen(); },
        onCommit: action => { pickedGrip = null; execute(action); },
        onCancel: () => { feedback = 'Geste annulé : aucun calcul ni compteur modifié.'; gameScreen(); },
        announce
    });
    disposeGestures = () => { equationFit.dispose(); stopGestures(); };
    if (pickedGrip) document.querySelector<HTMLElement>(`[data-node="${pickedGrip.id}"] [data-grip="${pickedGrip.part}"]`)?.classList.add('grip-picked');
}
function pickGrip(pick: PickedGrip) {
    if (!g || busy) return;
    pickedGrip = pick; selected = [pick.id];
    const value = gripValue(nodeAt(g.s.eq, pick.id), pick.part);
    feedback = `${operandText(value)} est saisi. Glisse ce facteur dans l’autre membre, ou utilise le bouton ${pick.part === 'coefficient' ? '÷' : '×'} aux deux membres.`;
    gameScreen();
}
function select(id: string) { if (busy || !g || g.won)
    return; pickedGrip = null; highlight = []; selected = selected.includes(id) ? selected.filter(s => s !== id) : selected.length === 1 && selected[0].includes('.') && id.includes('.') && selected[0].split('.').slice(0, -1).join('.') === id.split('.').slice(0, -1).join('.') ? [selected[0], id] : [id]; gameScreen(); tone('tap'); document.querySelector<HTMLButtonElement>(`[data-node="${id}"]`)?.focus({ preventScroll: true }); }
function execute(event: Event) { if (!g || busy)
    return; const ghosts = event.kind === 'combine' && save.prefs.motion && !save.prefs.lite ? event.ids.map(id => { const el = document.querySelector<HTMLElement>(`[data-node="${id}"]`); return el ? { rect: el.getBoundingClientRect(), html: el.innerHTML, cls: el.className } : null; }).filter(Boolean) : []; try {
    perform(g, event);
    busy = true;
    selected = [];
    pickedGrip = null;
    highlight = [];
    feedback = g.s.why;
    checkpoint();
    gameScreen();
    for (const ghost of ghosts) {
        if (!ghost)
            continue;
        const target = document.querySelector<HTMLElement>(event.kind === 'combine' && event.ids[0].startsWith('l') ? '.left-plate .blocks' : '.right-plate .blocks')!.getBoundingClientRect();
        const el = document.createElement('span');
        el.className = ghost.cls + ' fusion-ghost';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = ghost.html;
        el.style.cssText = `left:${ghost.rect.x}px;top:${ghost.rect.y}px;width:${ghost.rect.width}px;height:${ghost.rect.height}px;--dx:${target.x + target.width / 2 - ghost.rect.x - ghost.rect.width / 2}px;--dy:${target.y + target.height / 2 - ghost.rect.y - ghost.rect.height / 2}px`;
        document.body.append(el);
        setTimeout(() => el.remove(), 220);
    }
    if (save.prefs.motion && !save.prefs.lite)
        document.querySelector('#arena')?.classList.add(event.kind === 'expand' ? 'burst' : event.kind === 'drag' ? 'drop-accepted' : 'pulse');
    tone(event.kind === 'combine' || event.kind === 'drag' ? 'merge' : 'tap');
    setTimeout(() => { busy = false; document.querySelector('.game')?.setAttribute('aria-busy', 'false'); }, save.prefs.motion && !save.prefs.lite ? 190 : 60);
}
catch (e) {
    error(e);
} }
function error(e: unknown) { if (!g)
    return; g.errors++; combo = 0; feedback = e instanceof Error ? e.message : 'Cette transformation est indisponible.'; announce(feedback); checkpoint(); if (dialog.open) {
    const p = dc.querySelector('.dialog-error');
    if (p)
        p.textContent = feedback;
}
else
    gameScreen(); }
function preview(action: Action) { if (!g || busy)
    return; try {
    const tr = transform(g.s.eq, action);
    pending = action;
    show('Conserver l’équilibre', `<p>${escape(tr.label)}</p><div class="mirror-preview"><div>${math(g.s.eq.left)}</div><b>=</b><div>${math(g.s.eq.right)}</div><span>${escape(tr.mirror || '')}</span><span></span><span>${escape(tr.mirror || '')}</span><div>${math(tr.equation.left)}</div><b>=</b><div>${math(tr.equation.right)}</div></div><p>${escape(tr.why)}</p><div class="dialog-actions">${button('apply', 'Appliquer aux deux membres', 'primary')}${button('cancel-preview', 'Annuler', 'secondary')}</div>`);
    bind('apply', () => { const ev = pending; pending = null; dialog.close(); if (ev)
        execute(ev); });
    bind('cancel-preview', () => dialog.close());
}
catch (e) {
    error(e);
} }
function operationDialog() { show('Une opération, deux membres', `<p>Choisis librement une transformation. + / − accepte un entier, une fraction ou un terme en x. × / ÷ exige une constante non nulle.</p><form id="operation-form"><label for="op-kind">Opération</label><select id="op-kind"><option value="add">Ajouter aux deux membres</option><option value="subtract">Soustraire aux deux membres</option><option value="multiply">Multiplier les deux membres</option><option value="divide">Diviser les deux membres</option></select><label for="operand">Quantité (ex. 3, −2, 1/2, 2x)</label><input id="operand" name="operand" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="24" required placeholder="Par exemple : −3"><p class="dialog-error" role="status"></p><button type="submit" class="primary">Voir l’aperçu →</button></form>`); document.querySelector('#operation-form')?.addEventListener('submit', e => { e.preventDefault(); const type = (document.querySelector('#op-kind') as HTMLSelectElement).value, s = (document.querySelector('#operand') as HTMLInputElement).value.replaceAll('−', '-'); try {
    let ev: Action;
    if (type === 'add' || type === 'subtract') {
        const expression = parse(s), m = monomial(expression);
        if (!m || m.degree > 1)
            throw Error('Choisis un entier, une fraction ou un terme en x.');
        ev = { kind: 'add', expression: type === 'subtract' ? { kind: 'product', factors: [c(-1), expression] } : expression };
    }
    else
        ev = { kind: type as 'multiply' | 'divide', constant: readRational(s) };
    transform(g!.s.eq, ev);
    dialog.close();
    preview(ev);
}
catch (err) {
    error(err);
} }); }
function hint() { if (!g || busy)
    return; const tip = suggestion(g); g.hints++; g.hintStage++; highlight = g.hintStage >= 2 ? tip.ids ?? [] : []; feedback = tip.text; checkpoint(); gameScreen(); announce(feedback); if (g.hintStage >= 3 && tip.action) {
    let detail = tip.text;
    if (['add', 'divide', 'multiply', 'expand', 'combine', 'factor', 'simplify'].includes(tip.action.kind)) {
        try {
            const tr = transform(g.s.eq, tip.action as Action);
            detail += ` Après cette action : ${equationText(tr.equation)}.`;
        }
        catch { /* keep explanatory hint */ }
    }
    show('Aperçu de la prochaine étape', `<p>${escape(detail)}</p><p class="muted">À toi de sélectionner et d’appliquer l’opération.</p>`);
} }
function historyDialog() { if (!g)
    return; show('Ton chemin algébrique', `<p>${g.moves} transformations tentées. Les annulations conservent ce décompte.</p><ol class="history-list">${[...g.history, g.s].map((s, i) => `<li><span>${i === 0 ? 'DÉPART' : `ÉTAPE ${i}`}</span><strong>${escape(equationText(s.eq))}</strong><p>${escape(s.label)}</p><small>${escape(s.why)}</small></li>`).join('')}</ol>`); }
function check() { if (!g || busy)
    return; try {
    const state = validate(g);
    if (state === 'branch') {
        feedback = g.s.label;
        checkpoint();
        gameScreen();
        return;
    }
    complete();
}
catch (e) {
    error(e);
} }
function complete() {
    if (!g)
        return;
    tickClock();
    const sg = score(g), time = g.elapsed, s = save.stats;
    const beforeBadges = badges(save).filter(b => b.value >= b.target).map(b => b.name);
    if (mode === 'campaign') {
        const old = save.results[g.level.id];
        const method = g.events.filter(e => e.kind === 'add' || e.kind === 'divide' || e.kind === 'multiply' || e.kind === 'factor' || e.kind === 'split' || e.kind === 'delta' || e.kind === 'drag').map(e => e.kind === 'add' ? `+${format(e.expression)}` : e.kind === 'divide' || e.kind === 'multiply' ? `${e.kind}${str(e.constant)}` : e.kind === 'drag' ? `drag-${e.part}-${e.id}` : e.kind).join('|');
        save.results[g.level.id] = { stars: Math.max(old?.stars ?? 0, sg), moves: Math.min(old?.moves ?? Infinity, g.moves), time: Math.min(old?.time ?? Infinity, time), methods: [...new Set([...(old?.methods ?? []), method])].slice(0, 3) };
    }
    s.wins++;
    if (!g.errors)
        s.clean++;
    s.moves += g.moves;
    s.errors += g.errors;
    s.hints += g.hints;
    s.expanded += g.expanded;
    s.combined += g.combined;
    const answer = solve(g.level.initial);
    if (answer.kind === 'none')
        s.none++;
    if (answer.kind === 'all')
        s.all++;
    if (g.level.world === 4)
        s.products++;
    if (g.level.world === 3 && !g.hints)
        s.fractions++;
    if (g.events.some(e => e.kind === 'delta'))
        s.quadratics++;
    if (mode === 'arcade' && !g.hints && !g.errors && time < 15000 && !g.level.tutorial)
        s.fast++;
    const sk = s.skills[g.level.world];
    sk.wins++;
    sk.errors += g.errors;
    sk.hints += g.hints;
    if (g.level.transfer && !g.errors && !g.hints)
        sk.transfer++;
    if (mode === 'arcade') {
        combo = g.errors ? 0 : combo + 1;
        arcade++;
    }
    save.active = null;
    recovered = null;
    store();
    const newBadges = badges(save).filter(b => b.value >= b.target && !beforeBadges.includes(b.name));
    tone('win');
    screen = 'result';
    const arcadeScore = arcade * 100 + combo * 50;
    if (mode === 'arcade' && arcade === 5) {
        save.arcadeBest = Math.max(save.arcadeBest, arcadeScore);
        store();
    }
    shell(`<section class="result-screen" style="--world:${worlds[g.level.world].color}"><span class="result-seal">${answer.kind === 'all' ? '∞' : answer.kind === 'none' ? '∅' : '✓'}</span><p class="eyebrow">EXPÉRIENCE RÉUSSIE</p><h1>${answer.kind === 'all' ? 'Vraie pour tout réel.' : answer.kind === 'none' ? 'Impossible, et démontré.' : 'L’inconnue est libérée.'}</h1><div class="result-stars">${stars(sg)}</div><div class="result-solution">${escape(solutionText(answer))}</div><div class="result-continue">${button('next', mode === 'arcade' && arcade === 5 ? 'Nouvelle série →' : mode === 'practice' ? 'Nouvelle équation →' : 'Continuer →', 'primary')}</div><p>${sg === 3 ? 'Précision, autonomie et méthode. Un équilibre parfait.' : sg === 2 ? 'Une méthode solide. Rejoue sans aide pour viser trois étoiles.' : 'Tu as mené la résolution à son terme. Chaque manipulation prépare la suivante.'}</p><div class="result-metrics"><span><strong>${g.moves}</strong>transformations</span><span><strong>${g.errors}</strong>erreurs</span><span><strong>${g.hints}</strong>indices</span>${save.prefs.timer ? `<span><strong>${statTime(time)}</strong>temps</span>` : ''}</div>${newBadges.map(b => `<p class="badge-toast">✦ Succès débloqué : ${b.name}</p>`).join('')}${mode === 'arcade' ? `<p>Série : ${arcade} / 5 · Combo : ${combo}${arcade === 5 ? ` · ${arcadeScore} points` : ''}</p>` : ''}<div class="result-actions">${button('replay', '↶ Rejouer', 'secondary')}${button('result-history', '≡ Voir mes étapes', 'secondary')}</div><button data-screen="worlds" class="text-button">Retour aux mondes</button></section>`, 'worlds');
    window.scrollTo(0, 0);
    bind('next', () => { if (mode === 'campaign') {
        const idx = campaign.findIndex(l => l.id === g!.level.id);
        if (idx === campaign.length - 1) {
            worldMap();
            return;
        }
        openLevel(campaign[idx + 1]);
    }
    else if (mode === 'practice')
        openLevel(generated(g!.level.world, newSeed()));
    else {
        if (arcade === 5) {
            arcade = 0;
            combo = 0;
        }
        nextArcade();
    } });
    bind('replay', () => openLevel(g!.level));
    bind('result-history', historyDialog);
}
function pause() { if (!g)
    return; checkpoint(); show('Une pause dans l’expérience', `<p>Ta partie est sauvegardée sur cet appareil.</p><div class="pause-actions">${button('unpause', 'Reprendre', 'primary')}${button('restart', 'Recommencer', 'secondary')}${button('leave', 'Retour aux mondes', 'secondary')}${button('pause-settings', 'Paramètres', 'secondary')}</div>`); bind('unpause', () => dialog.close()); bind('restart', () => { dialog.close(); openLevel(g!.level); }); bind('leave', () => { dialog.close(); worldMap(); }); bind('pause-settings', () => { dialog.close(); settings(); }); }
function achievements() { screen = 'badges'; shell(`<section class="page-head"><p class="eyebrow">COLLECTION · ${badges(save).filter(b => b.value >= b.target).length} / 12</p><h1>Des gestes qui<br><em>deviennent des réflexes.</em></h1><p>Les badges récompensent les compétences pratiquées dans les expériences terminées.</p></section><div class="badge-grid">${badges(save).map(b => `<article class="badge-card ${b.value >= b.target ? 'earned' : ''}"><span>${b.symbol}</span><div><h2>${b.name}</h2><p>${b.description}</p><progress value="${Math.min(b.value, b.target)}" max="${b.target}" aria-label="${b.name}"></progress><small>${Math.min(b.value, b.target)} / ${b.target}${b.value >= b.target ? ' · DÉBLOQUÉ' : ''}</small></div></article>`).join('')}</div>`, 'badges'); }
function statistics() { screen = 'stats'; const s = save.stats; shell(`<section class="page-head"><p class="eyebrow">TABLEAU DE PROGRESSION</p><h1>Observe tes<br><em>automatismes.</em></h1><p>Un portrait local de ton apprentissage, sans compte ni collecte.</p></section><div class="stat-grid"><article><strong>${s.wins}</strong><span>Expériences réussies</span></article><article><strong>${s.moves ? Math.round(100 * s.moves / (s.moves + s.errors)) : 100}%</strong><span>Transformations correctes</span></article><article><strong>${totalStars()}</strong><span>Étoiles en campagne</span></article><article><strong>${s.skills.reduce((n, x) => n + x.transfer, 0)}</strong><span>Transferts sans erreur ni aide</span></article></div><div class="skill-table"><h2>La maîtrise, monde par monde</h2><p>Les nouvelles équations du laboratoire et les défis de transfert évaluent le réinvestissement. Les indices n’empêchent jamais de terminer.</p>${worlds.map((w, i) => { const sk = s.skills[i]; return `<article><span class="skill-icon" style="color:${w.color}">${w.symbol}</span><div><strong>${w.name}</strong><p>${sk.wins} réussites · ${sk.errors} erreurs · ${sk.hints} indices</p></div><span>${sk.transfer}<small> transferts autonomes</small></span></article>`; }).join('')}</div>`); }
function settings() { screen = 'settings'; const p = save.prefs; const toggles: [
    keyof typeof p,
    string,
    string
][] = [['sound', 'Sons', 'Petites mélodies cristallines, volume doux.'], ['motion', 'Animations', 'Impulsions courtes et fusion des blocs.'], ['lite', 'Mode léger', 'Réduit les effets pour les appareils modestes.'], ['contrast', 'Contraste renforcé', 'Contours plus nets et texte plus contrasté.'], ['large', 'Texte agrandi', 'Plus de confort pour lire les explications.'], ['memberLabels', 'Afficher les noms des membres', 'Repères centrés au-dessus des expressions.'], ['timer', 'Afficher le chronomètre', 'Facultatif dans tous les modes ; sans effet sur les étoiles.']]; shell(`<section class="page-head compact"><p class="eyebrow">À TON RYTHME</p><h1>Ton laboratoire,<br><em>tes réglages.</em></h1></section><div class="settings-panel">${toggles.map(([k, title, description]) => `<label class="setting"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-pref="${k}" ${p[k] ? 'checked' : ''}><span class="switch" aria-hidden="true"></span></label>`).join('')}<div class="setting"><span><strong>Couleur de l’arène</strong><small>Les thèmes se débloquent avec tes étoiles.</small></span><select id="theme" aria-label="Thème de couleur"><option value="mint" ${p.theme === 'mint' ? 'selected' : ''}>Menthe</option><option value="blue" ${p.theme === 'blue' ? 'selected' : ''} ${totalStars() < 12 ? 'disabled' : ''}>Ion bleu · 12 ★</option><option value="rose" ${p.theme === 'rose' ? 'selected' : ''} ${totalStars() < 36 ? 'disabled' : ''}>Plasma rose · 36 ★</option></select></div><section class="install-panel"><h2>Emporter Equation Breaker</h2><p id="offline-state">${offlineReady ? 'Tous les fichiers sont en cache. Le jeu est prêt à fonctionner hors ligne.' : 'La mise en cache se prépare après le chargement complet.'}</p>${button('install', installPrompt ? 'Installer l’application' : 'Comment installer ?', 'secondary')}<p>Sur iPhone/iPad : Partager → Sur l’écran d’accueil. Sur Android : menu du navigateur → Installer l’application.</p></section><div class="data-actions">${button('export', 'Exporter ma progression', 'secondary')}${button('import', 'Importer une progression', 'secondary')}${button('reset', 'Remettre à zéro', 'danger')}</div><input id="import-file" type="file" accept="application/json" hidden></div>${g && !g.won ? button('back-game', '← Reprendre ma partie', 'primary back-game') : ''}`); document.querySelectorAll<HTMLInputElement>('[data-pref]').forEach(input => input.onchange = () => { const key = input.dataset.pref as 'sound' | 'motion' | 'lite' | 'contrast' | 'large' | 'timer' | 'memberLabels'; p[key] = input.checked; if (key === 'sound') { if (!p.sound) soundBank.stop(); refreshSoundControls(); } prefs(); store(); if (key === 'sound' && p.sound)
    tone('tap'); }); bind('theme', () => { }, 'change'); document.querySelector<HTMLSelectElement>('#theme')!.onchange = e => { p.theme = (e.target as HTMLSelectElement).value as typeof p.theme; prefs(); store(); }; bind('back-game', gameScreen); bind('install', async () => { if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
}
else
    show('Installer sur cet appareil', '<p>Dans Chrome ou Edge, ouvre le menu puis « Installer Equation Breaker » ou l’icône d’installation de la barre d’adresse.</p><p>Dans Safari sur iPhone ou iPad : Partager → Sur l’écran d’accueil.</p><p>Attends le message « Prêt pour le hors-ligne » avant de couper la connexion.</p>'); }); bind('export', () => { const blob = new Blob([JSON.stringify(save)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'equation-breaker-progression.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }); bind('import', () => document.querySelector<HTMLInputElement>('#import-file')!.click()); document.querySelector<HTMLInputElement>('#import-file')!.onchange = async (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file)
    return; if (file.size > 500000) {
    show('Import impossible', '<p>Ce fichier est trop volumineux.</p>');
    return;
} try {
    const raw = JSON.parse(await file.text());
    if (raw?.version !== 1 || !raw.results || !raw.prefs)
        throw Error();
    const imported = decode(JSON.stringify(raw));
    show('Remplacer la progression ?', `<p>Cette sauvegarde contient ${Object.keys(imported.results).length} niveaux réussis. Elle remplacera la progression de cet appareil.</p>${button('confirm-import', 'Importer cette sauvegarde', 'primary')}`);
    bind('confirm-import', () => { save = imported; g = null; recovered = restore(save.active); prefs(); store(); dialog.close(); settings(); });
}
catch {
    show('Import impossible', '<p>Le fichier ne contient pas une progression Equation Breaker valide.</p>');
} }; bind('reset', () => { show('Tout remettre à zéro ?', `<p>Cette action effacera la progression, les records, la partie en cours et les paramètres sur cet appareil. Tu peux d’abord exporter ta progression.</p>${button('confirm-reset', 'Effacer ma progression', 'danger')}`); bind('confirm-reset', () => { save = fresh(); g = null; recovered = null; prefs(); store(); dialog.close(); home(); }); }); }
function bind(id: string, fn: () => void, event = 'click') { document.getElementById(id)?.addEventListener(event, fn); }
function bindGlobal() {
    bind('sound-toggle', () => {
        save.prefs.sound = !save.prefs.sound;
        if (save.prefs.sound) { soundBank.unlock(); tone('tap'); } else soundBank.stop();
        store();
        refreshSoundControls();
    });
 document.querySelectorAll<HTMLButtonElement>('[data-screen]').forEach(b => b.onclick = () => { if (screen === 'game')
    checkpoint(); navigate(b.dataset.screen!); }); bind('update', () => { if (waitingWorker) {
    checkpoint();
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
} }); }
function navigate(to: string) { selected = []; feedback = ''; window.scrollTo(0, 0); if (to === 'worlds') {
    worldMap();
}
else if (to === 'practice')
    practice();
else if (to === 'badges')
    achievements();
else if (to === 'settings')
    settings();
else if (to === 'stats')
    statistics();
else
    home(); }
function show(title: string, body: string) { tickClock(); dc.innerHTML = `<p class="eyebrow">EQUATION BREAKER</p><h2 id="dialog-title">${escape(title)}</h2>${body}`; if (!dialog.open)
    dialog.showModal(); }
dialog.addEventListener('close', () => { clockTick = Date.now(); if (g)
    g.started = clockTick; });
document.querySelector('#close-dialog')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
} });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dialog.open && screen === 'game') {
    selected = [];
    highlight = [];
    gameScreen();
} });
function refreshSoundControls() {
    const toggle = document.querySelector<HTMLButtonElement>('#sound-toggle');
    if (toggle) {
        toggle.innerHTML = soundIcon(save.prefs.sound);
        toggle.setAttribute('aria-pressed', String(save.prefs.sound));
        toggle.setAttribute('aria-label', save.prefs.sound ? 'Couper les sons' : 'Activer les sons');
    }
    const setting = document.querySelector<HTMLInputElement>('[data-pref="sound"]');
    if (setting) setting.checked = save.prefs.sound;
}
function tone(kind: Cue) { soundBank.play(kind); }
document.addEventListener('pointerdown', () => soundBank.unlock(), { capture: true, passive: true });
document.addEventListener('keydown', () => soundBank.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) soundBank.stop(); });
setInterval(() => { tickClock(); if (g && screen === 'game' && !g.won && !dialog.open && save.prefs.timer) {
    const el = document.querySelector('#timer');
    if (el)
        el.textContent = statTime(g.elapsed + Date.now() - g.started);
} }, 1000);
window.addEventListener('pagehide', checkpoint);
document.addEventListener('visibilitychange', () => { clockTick = Date.now(); if (g)
    g.started = clockTick; if (document.hidden)
    checkpoint(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e as unknown as typeof installPrompt; });
async function initPWA() { if (!('serviceWorker' in navigator) || import.meta.env.DEV)
    return; try {
    const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    if (reg.waiting)
        waitingWorker = reg.waiting;
    reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        waitingWorker = worker;
        announce('Une mise à jour est disponible. Ta partie sera sauvegardée avant de l’appliquer.');
    } }); });
    await navigator.serviceWorker.ready;
    const response = await fetch(`${import.meta.env.BASE_URL}release.json`, { cache: 'no-store' });
    const release = await response.json() as {
        cache: string;
        files: string[];
    };
    const cache = await caches.open(release.cache);
    offlineReady = (await Promise.all(release.files.map(file => cache.match(new URL(file, location.href).href)))).every(Boolean);
    document.querySelectorAll('.footer').forEach(el => { const first = el.firstElementChild; if (first)
        first.innerHTML = `<span class="status-dot ${offlineReady ? 'ready' : ''}"></span> ${offlineReady ? 'Prêt pour le hors-ligne' : 'Mise en cache en cours'}`; });
    const state = document.querySelector('#offline-state');
    if (state && offlineReady)
        state.textContent = 'Tous les fichiers sont en cache. Le jeu est prêt à fonctionner hors ligne.';
}
catch {
    announce('Le cache hors ligne n’a pas pu être vérifié. Une connexion reste nécessaire pour le premier chargement.');
} }
home();
void initPWA();
