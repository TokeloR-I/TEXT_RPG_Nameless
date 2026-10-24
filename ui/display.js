/* =========================================================================
 * Enso's Last Stand — DISPLAY FIT (no DOM)
 * How big the game stage is drawn (Pixie, UI-2, docs/ui/STYLE_GUIDE.md "Resolution and scaling").
 * The world canvas is 640×448; one canvas pixel is the art's pixel, so only whole-number scales keep
 * every pixel the same width. Pure so it is tested headlessly (tests/39-display.test.js).
 *
 * Modes:
 *   pixel : the largest whole-number scale that fits (below 1×, it shrinks to fit)
 *   fill  : as large as fits, any scale (some pixels a screen pixel wider than others)
 *   auto  : pixel when the whole-number size is at least AUTO_MIN of the fill size, else fill.
 *           So big screens get crisp 2× or 3×, and a laptop doesn't drop to a tiny 1×.
 * On a portrait phone the stage takes the whole width and height, and the canvas becomes a
 * PORTRAIT_W-wide column of the map (12 tiles across, as many rows as fit): tiles stay a usable size
 * and the camera follows you as it does on desktop.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const BASE = { w: 640, h: 448 };
    const MODES = ['auto', 'pixel', 'fill'];
    const AUTO_MIN = 0.85;
    const PORTRAIT_W = 384;
    const LABELS = { auto: 'Auto', pixel: 'Pixel-perfect', fill: 'Fill the window' };
    const HELP = {
        auto: 'Crisp whole-pixel scaling when it fits well, otherwise fills the window.',
        pixel: 'Always whole-pixel scaling: every pixel the same size, with a border if needed.',
        fill: 'As large as the window allows; some pixels are drawn slightly wider than others.'
    };

    /**
     * The stage for the space available: { w, h, canvasW, canvasH, scale, integer, tall }.
     * w × h is the stage in screen pixels, canvasW × canvasH the canvas in its own pixels, and
     * `scale` screen pixels per canvas pixel. `tall` is the portrait layout.
     */
    function fit(availW, availH, mode = 'auto', base = BASE) {
        const aw = Math.max(1, availW), ah = Math.max(1, availH);
        if (aw < 720 && aw / ah < 0.9) {
            const scale = aw / PORTRAIT_W;
            const h = Math.max(base.h * (aw / base.w), Math.min(ah, aw * 2.2));
            const canvasH = 2 * Math.round(h / scale / 2);
            return { w: Math.floor(aw), h: Math.floor(canvasH * scale), canvasW: PORTRAIT_W, canvasH, scale, integer: Number.isInteger(scale), tall: true };
        }
        const fillScale = Math.min(aw / base.w, ah / base.h);
        const whole = Math.floor(fillScale);
        const usePixel = whole >= 1 && (mode === 'pixel' || (mode === 'auto' && whole / fillScale >= AUTO_MIN));
        const scale = usePixel ? whole : fillScale;
        return { w: Math.floor(base.w * scale), h: Math.floor(base.h * scale), canvasW: base.w, canvasH: base.h, scale, integer: usePixel, tall: false };
    }

    /** The next mode in the Display setting's cycle. */
    const nextMode = (mode) => MODES[(MODES.indexOf(mode) + 1) % MODES.length];

    const api = { fit, nextMode, MODES, LABELS, HELP, BASE, AUTO_MIN, PORTRAIT_W };
    ENSO.display = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
