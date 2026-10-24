/* =========================================================================
 * Enso's Last Stand — BATTLE VIEW MODEL (no DOM)
 * Small presentation rules for the world battle screen (ui/world-ui.js), kept DOM-free so they are
 * tested headlessly (tests/38-battle-view.test.js). Looks follow docs/ui/STYLE_GUIDE.md (Pixie).
 * Nothing here decides game rules: statuses, HP and log lines all come from the engine.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    /** Each status category has a glyph as well as a colour, so a chip never relies on colour alone. */
    const CATEGORY_GLYPH = { buff: '▲', debuff: '▼', dot: '✸', control: '◆', mark: '◎', cooldown: '⧗', other: '•' };

    /** A status chip: { category, glyph, text, title }. `defs` is data.statusDefinitions. */
    function statusChip(status, defs) {
        const def = (defs && defs[status.name]) || {};
        const category = CATEGORY_GLYPH[def.category] ? def.category : 'other';
        const stacks = status.stacks > 1 ? ` ×${status.stacks}` : '';
        const turns = typeof status.duration === 'number' ? ` ${status.duration}` : '';
        const left = typeof status.duration === 'number' ? `, ${status.duration} round${status.duration === 1 ? '' : 's'} left` : '';
        return { category, glyph: CATEGORY_GLYPH[category], text: `${status.name}${stacks}${turns}`,
            title: `${status.name} (${category}${stacks ? `, ${status.stacks} stacks` : ''}${left})` };
    }

    /** HP bar tone: 'ok' above half, 'mid' above a quarter, else 'low'. */
    function hpTone(cur, max) {
        if (!max) return 'low';
        const k = cur / max;
        return k > 0.5 ? 'ok' : k > 0.25 ? 'mid' : 'low';
    }

    /** Bar fill as a whole percentage, clamped to 0–100. */
    const pct = (cur, max) => (max ? Math.max(0, Math.min(100, Math.round((cur / max) * 100))) : 0);

    /**
     * How a battle log line is shown: { kind, text }.
     *   turn  : "--- Rust Rat's Turn! ---" becomes a small header "Rust Rat's turn"
     *   round : round and order separators ("--- End of Round ---", "--- Battle Order ---")
     *   dmg / heal / plain : ordinary lines, tinted by what they report
     */
    function logLine(text) {
        const sep = /^--- (.*) ---$/.exec(text);
        if (sep) {
            const inner = sep[1];
            if (inner === 'Your Turn!') return { kind: 'turn', text: 'Your turn' };
            const turn = /^(.*)'s Turn!$/.exec(inner);
            if (turn) return { kind: 'turn', text: `${turn[1]}'s turn` };
            return { kind: 'round', text: inner };
        }
        if (/\bfor \d+ (\w+ )?damage\b|\btakes \d+ (\w+ )?damage\b/i.test(text)) return { kind: 'dmg', text };
        if (/\b(heals?|healed|restores?|recovers?)\b/i.test(text)) return { kind: 'heal', text };
        return { kind: 'plain', text };
    }

    /** The help line for the highlighted command: its detail, or why it can't be used. */
    function helpText(item) {
        if (!item) return '';
        if (item.disabled) return `Unavailable · ${item.sub || 'not right now'}`;
        return item.sub || '';
    }

    /**
     * Display names that tell twins apart: two "Rust Rat"s become "Rust Rat A" and "Rust Rat B", lettered in
     * the order the engine lists them, so plates, the turn order and the target menu all agree.
     * `units` is [{ id, name }]; returns { id: label }.
     */
    function unitLabels(units) {
        const count = {};
        for (const u of units) count[u.name] = (count[u.name] || 0) + 1;
        const seen = {};
        const out = {};
        for (const u of units) {
            if (count[u.name] < 2) { out[u.id] = u.name; continue; }
            const i = seen[u.name] = (seen[u.name] || 0) + 1;
            out[u.id] = `${u.name} ${String.fromCharCode(64 + i)}`;
        }
        return out;
    }

    /**
     * The turn-order strip from engine.getTurnOrder(): { now, next } lists of { id, label, side, current }.
     * `now` is the rest of this round (the one acting first), `next` the round after, each cut to `max`.
     * The player is shown as "You".
     */
    function turnStrip(order, labels, max = 6) {
        if (!order) return { now: [], next: [] };
        const one = (e) => ({ id: e.id, side: e.side, current: !!e.current, label: e.side === 'player' ? 'You' : (labels && labels[e.id]) || e.name });
        return { now: order.now.slice(0, max).map(one), next: order.next.slice(0, max).map(one) };
    }

    const api = { statusChip, hpTone, pct, logLine, helpText, unitLabels, turnStrip, CATEGORY_GLYPH };
    ENSO.battleView = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
