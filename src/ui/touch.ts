/** Browser gestures must not compete with the game's one-finger gestures. */
export function installTouchGuards() {
    const media = matchMedia('(hover: none) and (pointer: coarse)');
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')!;
    const originalViewport = viewport.content;
    let multiple = false;
    const editable = (target: EventTarget | null) => target instanceof Element && !!target.closest('input,textarea,[contenteditable="true"],[contenteditable=""]');
    const sync = () => {
        document.documentElement.dataset.touchUi = String(media.matches);
        viewport.content = originalViewport + (media.matches ? ', minimum-scale=1, maximum-scale=1, user-scalable=no' : '');
    };
    sync(); media.addEventListener('change', sync);
    document.addEventListener('selectstart', event => {
        if (media.matches && !editable(event.target)) event.preventDefault();
    });
    document.addEventListener('contextmenu', event => {
        if (media.matches && !editable(event.target)) event.preventDefault();
    });
    document.addEventListener('dblclick', event => {
        if (media.matches) event.preventDefault();
    }, { passive: false });
    const prevent = (event: Event) => { if (event.cancelable) event.preventDefault(); };
    const cancelGameGesture = () => window.dispatchEvent(new Event('equation-multitouch'));
    // Safari's native pinch events supplement touch-action and the viewport hint.
    for (const name of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(name, event => {
        if (media.matches) { prevent(event); if (name === 'gesturestart') cancelGameGesture(); }
    }, { passive: false });
    const guardTouches = (event: TouchEvent) => {
        if (!media.matches) return;
        if (event.touches.length > 1 && !multiple) { multiple = true; cancelGameGesture(); }
        if (multiple) prevent(event);
        if (!event.touches.length) multiple = false;
    };
    for (const name of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const)
        document.addEventListener(name, guardTouches, { passive: false, capture: true });
}
