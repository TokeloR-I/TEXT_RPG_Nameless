/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: shared helpers
 * Small pure helpers used by src/engine.js and the modules in src/engine/.
 * ========================================================================= */
(function (global) {
    function mulberry32(seed) {
        let a = seed >>> 0;
        const rng = function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        // Snapshot support, so a rolled-back command doesn't shift seeded runs.
        rng.getState = () => a;
        rng.setState = (v) => { a = v; };
        return rng;
    }
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const pretty = (key) => key.replace(/_/g, ' ');

    // Copy a module's methods onto the engine class. A name defined twice is a
    // bug (one copy would silently win), so it throws instead.
    function mixin(Target, Source, label) {
        if (typeof Source !== 'function') throw new Error(`Engine module "${label}" is not loaded (check the <script> order in index.html).`);
        for (const name of Object.getOwnPropertyNames(Source.prototype)) {
            if (name === 'constructor') continue;
            if (Object.prototype.hasOwnProperty.call(Target.prototype, name)) throw new Error(`Engine module "${label}" redefines ${name}()`);
            Object.defineProperty(Target.prototype, name, Object.getOwnPropertyDescriptor(Source.prototype, name));
        }
    }

    const util = { mulberry32, clone, cap, pretty, mixin };
    const ENSO = global.ENSO || (global.ENSO = {});
    ENSO.engineUtil = util;
    if (typeof module !== 'undefined' && module.exports) module.exports = util;
})(typeof window !== 'undefined' ? window : globalThis);
