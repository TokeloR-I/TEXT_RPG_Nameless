/* =========================================================================
 * Enso's Last Stand — PACKED ART LOADER (Keel's engine decision rev 2, P0)
 * Turns the data URIs in ENSO.packedAssets (assets/packed/assets.js, made by tools/pack-assets.js) into
 * images, once each. Data URIs are same-origin, so the WebGL pass in ui/postfx.js can read what they draw.
 *   ENSO.atlas.image(key)   the loaded HTMLImageElement, or null while it loads / if there is no such asset
 *   ENSO.atlas.onLoad(fn)   called whenever an image finishes loading (the renderer rebuilds its tile cache)
 *   ENSO.atlas.has(key)     whether the packed data holds an image under that key
 * Presentation only.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const images = new Map();          // key -> { img, ready }
    const listeners = [];
    const asset = (key) => { const a = (ENSO.packedAssets || {})[key]; return a && a.type === 'png' ? a : null; };

    function image(key) {
        const a = asset(key);
        if (!a || typeof Image === 'undefined') return null;
        let e = images.get(key);
        if (!e) {
            e = { img: new Image(), ready: false };
            images.set(key, e);
            e.img.onload = () => { e.ready = true; for (const fn of listeners) fn(key); };
            e.img.onerror = () => { if (global.console) console.warn(`atlas: packed image '${key}' failed to load`); };
            e.img.src = a.uri;
        }
        return e.ready ? e.img : null;
    }

    const api = { image, has: (key) => !!asset(key), onLoad: (fn) => listeners.push(fn) };
    ENSO.atlas = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
