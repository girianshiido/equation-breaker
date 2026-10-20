import { type Equation, nodeAt } from '../math/ast';
import { gesturePlan, gripValue, groupedFactor, type Grip, type GesturePlan, type DragAction } from '../math/gestures';
import { monomial } from '../math/normalize';
import { blocks, math } from './math';
import { format } from '../math/format';

export interface PickedGrip { id: string; part: Exclude<Grip, 'term'> }
interface Options {
    equation: Equation;
    picked: PickedGrip | null;
    allowed: () => boolean;
    motion: () => boolean;
    onSound: (cue: 'lift' | 'cross' | 'drop' | 'cancel') => void;
    onLayout: () => void;
    onPick: (grip: PickedGrip) => void;
    onSelect: (ids: string[]) => void;
    onCommit: (action: DragAction) => void;
    onCancel: () => void;
    announce: (message: string) => void;
}
let suppressClickUntil = 0;
// Only discard the synthetic click following a completed drag, never a fresh press.
document.addEventListener('pointerdown', () => { suppressClickUntil = 0; }, true);
document.addEventListener('click', event => {
    if (event.detail && performance.now() < suppressClickUntil && (event.target as HTMLElement)?.closest('.block,.plate,.equal-sign')) {
        event.preventDefault(); event.stopImmediatePropagation();
    }
}, true);
export function bindGestures(arena: HTMLElement, options: Options): () => void {
    const signal = new AbortController();
    let pointer: { id: number; node: string; part: Grip; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
    let rangeIds: string[] | null = null;
    let plan: GesturePlan | null = null, ghost: HTMLElement | null = null, hold = 0, frame = 0, timer = 0, finishing = false;
    let destRect: DOMRect | null = null, separatorRect: DOMRect | null = null, horizontal = true, forward = true, crossed = false;
    const game = arena.closest<HTMLElement>('.game')!;
    const left = arena.querySelector<HTMLElement>('.left-plate .blocks')!;
    const right = arena.querySelector<HTMLElement>('.right-plate .blocks')!;
    const equal = arena.querySelector<HTMLElement>('.equal-sign')!;
    const original = { left: left.innerHTML, right: right.innerHTML, equal: equal.innerHTML, label: equal.getAttribute('aria-label') };
    const caption = document.createElement('div'); caption.className = 'gesture-caption'; caption.setAttribute('aria-live', 'off'); arena.append(caption);
    const clearHold = () => { window.clearTimeout(hold); hold = 0; };
    function setLocked(locked: boolean) {
        game.dataset.gesture = locked ? 'true' : 'false';
        game.setAttribute('aria-busy', String(locked));
        // Keep navigation, undo and validation inert until a drop has completed or rolled back.
        for (const region of game.querySelectorAll<HTMLElement>('.context-panel,.operation-bar,.game-controls,.game-heading,.mission,.branches')) region.inert = locked;
    }
    function releaseCapture() { if (pointer && arena.hasPointerCapture(pointer.id)) arena.releasePointerCapture(pointer.id); }
    function cleanup(restore: boolean) {
        clearHold(); cancelAnimationFrame(frame); window.clearTimeout(timer);
        if (restore) { left.innerHTML = original.left; right.innerHTML = original.right; equal.innerHTML = original.equal; if (original.label) equal.setAttribute('aria-label', original.label); }
        finishing = false; rangeIds = null; arena.querySelectorAll('.range-selected').forEach(el => el.classList.remove('range-selected')); plan = null; ghost?.remove(); ghost = null; caption.textContent = '';
        arena.classList.remove('in-transit', 'landing', 'drop-accepted', 'range-selecting');
        arena.querySelectorAll('.plate').forEach(el => el.classList.remove('drop-target', 'drop-over'));
        if (restore) options.onLayout();
        setLocked(false); const current = pointer; pointer = null;
        if (current && arena.hasPointerCapture(current.id)) arena.releasePointerCapture(current.id);
    }
    function abort(notify = true) {
        const hadPreview = !!plan || !!rangeIds;
        if (pointer?.moved || hadPreview) suppressClickUntil = performance.now() + 550;
        cleanup(true);
        if (hadPreview && notify) { options.onSound('cancel'); options.announce('Geste annulé. L’équation et les compteurs sont inchangés.'); options.onCancel(); }
    }
    function begin(part: Grip) {
        if (!pointer || plan || !options.allowed()) return;
        try { plan = gesturePlan(options.equation, pointer.node, part); }
        catch { clearHold(); return; }
        options.onSound('lift');
        pointer.part = part; arena.setPointerCapture(pointer.id); clearHold(); suppressClickUntil = performance.now() + 1000;
        setLocked(true); arena.classList.add('in-transit');
        const source = plan.source === 'l' ? left : right;
        source.innerHTML = blocks(plan.inFlightSource, plan.source, [], []);
        equal.innerHTML = '<span class="equal-suspended">⋯</span>'; equal.setAttribute('aria-label', 'Transformation en cours : égalité suspendue');
        options.onLayout();
        const dest = arena.querySelector<HTMLElement>(plan.destination === 'l' ? '.left-plate' : '.right-plate')!;
        dest.classList.add('drop-target');
        destRect = dest.getBoundingClientRect(); separatorRect = equal.getBoundingClientRect();
        const sourceRect = arena.querySelector<HTMLElement>(plan.source === 'l' ? '.left-plate' : '.right-plate')!.getBoundingClientRect();
        horizontal = Math.abs(destRect.x - sourceRect.x) > Math.abs(destRect.y - sourceRect.y);
        forward = horizontal ? destRect.x > sourceRect.x : destRect.y > sourceRect.y;
        ghost = document.createElement('div'); ghost.className = 'drag-token'; ghost.setAttribute('aria-hidden', 'true');
        document.body.append(ghost);
        caption.textContent = part === 'term' ? 'Ajoute l’opposé aux deux membres · dépose de l’autre côté' : `${plan.mirror} · dépose le facteur de l’autre côté`;
        options.announce(part === 'term' ? 'Terme saisi. Dépose-le dans l’autre membre.' : 'Facteur saisi. Le membre de départ est transformé ; le signe égal est suspendu.');
        paint();
    }
    function beginRange() {
        if (!pointer) return;
        options.onSound('lift');
        clearHold(); rangeIds = [pointer.node]; arena.setPointerCapture(pointer.id);
        setLocked(true); arena.classList.add('range-selecting');
        arena.querySelector(`[data-node="${pointer.node}"]`)?.classList.add('range-selected');
        caption.textContent = 'Surligne les termes de la même somme, puis relâche';
        options.announce('Sélection de termes. Glisse sur le terme en x pour compléter le carré.');
    }
    function paint() {
        frame = 0; if (!pointer || !plan || !ghost || !destRect || !separatorRect) return;
        const coordinate = horizontal ? pointer.x : pointer.y;
        const boundary = horizontal ? separatorRect.x + separatorRect.width / 2 : separatorRect.y + separatorRect.height / 2;
        const nextCrossed = forward ? coordinate >= boundary : coordinate <= boundary;
        if (ghost.innerHTML === '' || nextCrossed !== crossed) {
            if (nextCrossed && !crossed) options.onSound('cross');
            crossed = nextCrossed; ghost.innerHTML = math(crossed ? plan.arrived : plan.carried);
            ghost.classList.toggle('changed-sign', crossed && plan.action.part === 'term');
        }
        ghost.style.transform = `translate3d(${pointer.x}px,${pointer.y - 30}px,0) translate(-50%,-50%)`;
        const over = crossed && pointer.x >= destRect.left && pointer.x <= destRect.right && pointer.y >= destRect.top && pointer.y <= destRect.bottom;
        arena.querySelector('.drop-target')?.classList.toggle('drop-over', over);
    }
    arena.addEventListener('pointerdown', event => {
        if (event.button !== 0 || finishing || !options.allowed()) return;
        if (pointer) { abort(); return; }
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-node]');
        if (!target) return;
        const node = target.dataset.node!, term = nodeAt(options.equation, node), m = monomial(term);
        const group = m ? null : groupedFactor(term);
        if ((!m || !m.q.n || m.degree > 2) && !group) return;
        const gripElement = (event.target as HTMLElement).closest<HTMLElement>('[data-grip]');
        const part = options.picked?.id === node ? options.picked.part : gripElement?.classList.contains('revealed-grip') ? 'coefficient' : 'term';
        pointer = { id: event.pointerId, node, part, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
        const longPart = (gripElement?.dataset.grip as Exclude<Grip, 'term'> | undefined) ?? ((group?.q ?? m!.q).d > 1n ? 'denominator' : 'coefficient');
        if (m?.degree === 2) { hold = window.setTimeout(beginRange, 420); return; }
        if (m?.degree || group) hold = window.setTimeout(() => {
            if (!pointer) return;
            try { gripValue(term, longPart); begin(longPart); } catch { /* A hidden factor of 1 has no action. */ }
        }, 420);
    }, { signal: signal.signal });
    window.addEventListener('pointermove', event => {
        if (!pointer || pointer.id !== event.pointerId || finishing) return;
        pointer.x = event.clientX; pointer.y = event.clientY;
        if (rangeIds) {
            const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-node]');
            const id = element?.dataset.node;
            if (id && id[0] === pointer.node[0] && id.split('.').slice(0, -1).join('.') === pointer.node.split('.').slice(0, -1).join('.') && !rangeIds.includes(id)) {
                rangeIds.push(id); element.classList.add('range-selected');
            }
            event.preventDefault(); return;
        }
        if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 9) {
            pointer.moved = true; clearHold(); if (!plan) begin(pointer.part);
        }
        if (plan) { event.preventDefault(); if (!frame) frame = requestAnimationFrame(paint); }
    }, { signal: signal.signal });
    window.addEventListener('pointerup', event => {
        if (!pointer || pointer.id !== event.pointerId || finishing) return;
        clearHold();
        if (rangeIds) { const ids = [...rangeIds]; cleanup(false); suppressClickUntil = performance.now() + 550; options.onSelect(ids); return; }
        if (!plan) { cleanup(false); return; }
        pointer.x = event.clientX; pointer.y = event.clientY; paint();
        if (!pointer.moved && pointer.part !== 'term') {
            const picked = { id: pointer.node, part: pointer.part };
            cleanup(true); suppressClickUntil = performance.now() + 550; options.onPick(picked); return;
        }
        const valid = !!arena.querySelector('.drop-over');
        if (!valid) { abort(); return; }
        options.onSound('drop');
        finishing = true; const committed = plan; releaseCapture();
        ghost?.remove(); ghost = null; arena.classList.remove('in-transit'); arena.classList.add('landing');
        left.innerHTML = blocks(committed.landing.left, 'l', [], [], committed.destination === 'l');
        right.innerHTML = blocks(committed.landing.right, 'r', [], [], committed.destination === 'r');
        equal.innerHTML = '='; equal.setAttribute('aria-label', 'égal à');
        options.onLayout();
        caption.textContent = `${committed.mirror} sur les deux membres · réduction`;
        // Reading time remains available with reduced motion; only the visual effects disappear.
        timer = window.setTimeout(() => {
            cleanup(false); suppressClickUntil = performance.now() + 550;
            options.onCommit(committed.action);
        }, options.motion() ? 380 : 180);
    }, { signal: signal.signal });
    arena.addEventListener('contextmenu', event => event.preventDefault(), { signal: signal.signal });
    arena.addEventListener('pointercancel', () => abort(), { signal: signal.signal });
    arena.addEventListener('lostpointercapture', () => { if (!finishing && (plan || rangeIds)) abort(); }, { signal: signal.signal });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && (pointer || plan || rangeIds)) { event.preventDefault(); event.stopImmediatePropagation(); abort(); } }, { capture: true, signal: signal.signal });
    window.addEventListener('blur', () => { if (pointer || plan || rangeIds) abort(); }, { signal: signal.signal });
    window.addEventListener('equation-multitouch', () => { if (pointer || plan || rangeIds) abort(); }, { signal: signal.signal });
    window.addEventListener('resize', () => { if (pointer || plan || rangeIds) abort(); }, { signal: signal.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden && (pointer || plan || rangeIds)) abort(); }, { signal: signal.signal });
    return () => { signal.abort(); cleanup(true); };
}
