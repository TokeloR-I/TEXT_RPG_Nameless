/* =========================================================================
 * Enso's Last Stand — CROW VIEW MODEL (no DOM)
 * What the main menu's Crow tab shows once the first Qliphoth seal is open (Pixie,
 * docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md, docs/ui/STYLE_GUIDE.md): Black Flight
 * destinations and "Talk to the crow", built only from the engine's getAvailableActions() options.
 * The engine decides which anchors are attuned and when flight is refused; nothing here does.
 * Tested in tests/42-crow-view.test.js.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    /** Words for refusal codes, used only when the engine sends a code without text. */
    const REASON_TEXT = {
        HERE: 'You are here',
        IN_COMBAT: 'Not while fighting',
        PURSUED: 'Something is following you',
        IN_DIALOGUE: 'Finish the conversation first',
        STORY_SCENE: 'Not now',
        UNREACHABLE: 'The crow cannot reach that perch yet'
    };
    const reasonText = (r) => (r ? r.text || r.message || REASON_TEXT[r.code] || 'Not now' : '');

    /**
     * The Crow tab: { any, talk, flights }.
     *   talk    : { enabled, reason } for "Talk to the crow", or null
     *   flights : one row per destination the engine offers, in its order, with the place you are at
     *             first: { anchorId, name, region, here, enabled, why }. `why` is the line under a
     *             destination: the region when you can fly there, else the engine's reason.
     *   any     : false before the seal opens (no crow options at all), so the tab stays hidden.
     */
    function crowView(avail) {
        const actions = (avail && avail.actions) || [];
        const t = actions.find((a) => a.type === 'talk_crow');
        const talk = t ? { enabled: !!t.enabled, reason: t.enabled ? '' : reasonText(t.reason) } : null;
        const flights = actions.filter((a) => a.type === 'black_flight' && a.anchorId).map((a) => {
            const here = !!a.here || !!(a.reason && a.reason.code === 'HERE');
            const enabled = !!a.enabled && !here;
            return { anchorId: a.anchorId, name: a.name || a.anchorId, region: a.region || '', here, enabled,
                why: here ? REASON_TEXT.HERE : enabled ? a.region || '' : reasonText(a.reason) };
        });
        flights.sort((a, b) => b.here - a.here);   // stable: otherwise the engine's order
        return { any: !!talk || flights.length > 0, talk, flights };
    }

    /** The confirm line before flying: "Fly to Shamefield Fountain (Blackbriar Vale)?" */
    function confirmText(f) { return `Fly to ${f.name}${f.region ? ` (${f.region})` : ''}?`; }

    /**
     * The crow's 16×16 dialogue portrait, one string per row (drawn at 3× by ui/world-ui.js).
     * k feather · s sheen · e eye glint · b beak and feet · p perch · . empty. Colours are the
     * --c-crow / --c-crow-sheen / --c-gold / --c-frame tokens (docs/ui/STYLE_GUIDE.md).
     */
    const CROW_PORTRAIT = [
        '................',
        '................',
        '.........kkk....',
        '........kkkkk...',
        '........kkekkbb.',
        '........kkkkkbbb',
        '.......kkkkk....',
        '.....kkkkskk....',
        '...kkkksskkk....',
        '..kkksskkkkk....',
        '.kkkkkkkkkk.....',
        'kkk..kkkkkk.....',
        '.......kkk......',
        '.......b.b......',
        '...pppppppppp...',
        '................'
    ];

    const api = { crowView, confirmText, reasonText, REASON_TEXT, CROW_PORTRAIT };
    ENSO.crowView = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
