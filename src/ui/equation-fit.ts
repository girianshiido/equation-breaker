/** Resize the whole equation together, only when its content or viewport changes. */
export function bindEquationFit(arena: HTMLElement) {
    const sides = [...arena.querySelectorAll<HTMLElement>('.blocks')];
    const hint = document.createElement('p');
    hint.className = 'equation-fit-hint'; hint.hidden = true;
    hint.textContent = 'Équation longue : tourne le téléphone pour avoir plus de place.';
    arena.after(hint);
    let active = true, frame = 0, lastWidth = 0;
    const ratios = () => sides.map(side => {
        const needed = [...side.children].reduce((n, child) => n + child.getBoundingClientRect().width, 0);
        return side.clientWidth / Math.max(1, needed);
    });
    function fit() {
        if (!active || !arena.isConnected) return;
        lastWidth = arena.clientWidth;
        arena.classList.remove('equation-wrap');
        arena.style.setProperty('--equation-scale', '1');
        const base = parseFloat(getComputedStyle(arena).getPropertyValue('--equation-size')) || 30;
        const minimum = Math.min(1, (document.documentElement.dataset.large === 'true' ? 20 : 16) / base);
        let scale = 1;
        // Fixed button padding can make the first proportional estimate slightly wide.
        // Two corrections are enough; no measurement runs during pointer movement.
        for (let pass = 0; pass < 3; pass++) {
            const ratio = Math.min(...ratios());
            if (ratio >= .998 || scale <= minimum) break;
            scale = Math.max(minimum, Math.min(1, scale * ratio * .99));
            arena.style.setProperty('--equation-scale', String(scale));
        }
        const stillLong = Math.min(...ratios()) < .99;
        arena.classList.toggle('equation-wrap', stillLong);
        hint.hidden = !stillLong;
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; fit(); }); };
    const observer = new ResizeObserver(() => { if (arena.clientWidth !== lastWidth) schedule(); });
    observer.observe(arena);
    window.addEventListener('resize', schedule, { passive: true });
    void document.fonts.ready.then(() => { if (active) schedule(); });
    fit();
    return { fit, dispose() { active = false; observer.disconnect(); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); hint.remove(); } };
}
