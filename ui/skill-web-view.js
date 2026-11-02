/* =========================================================================
 * Enso's Last Stand — SKILL WEB VIEW MODEL (no DOM)
 * What the main menu's Skill Web tab shows (Pixie, Hollis; docs/design/SKILL_WEB.md):
 * one picture per class web, the webs you can open, and each web's skills as a list.
 * Built only from engine.getSkillWeb(); the engine decides what can be learned and why not.
 * Tested in tests/69-skill-web-view.test.js.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const KIND = { heart: 'Heart', active: 'Skill', passive: 'Passive', gateway: 'Gateway' };

    /** One line on points, path and specialization. */
    function summary(view) {
        const bits = [`${view.points} point${view.points === 1 ? '' : 's'} to spend`];
        if (view.specialization) bits.push(`walking as ${view.specialization.name}`);
        bits.push(view.guide ? 'a path guides your points' : 'walking freely');
        return bits.join(' · ');
    }

    /**
     * The webs to show, your own first: { webId, name, kind: 'class'|'legendary', home, entered, learnable, why }.
     * Another class web shows once you've entered it or a gateway into it can be learned; a legendary web once open.
     */
    function webs(view) {
        const learnable = (id) => view.nodes.filter((n) => n.region === id && n.state === 'available').length;
        const gatewayInto = (id) => view.nodes.find((n) => n.kind === 'gateway' && n.target === id && (n.owned || n.state === 'available'));
        const out = [];
        for (const w of view.webs) {
            if (!w.home && !w.entered && !gatewayInto(w.classId)) continue;
            out.push({ webId: w.classId, name: w.name, kind: 'class', home: w.home, entered: w.entered, learnable: learnable(w.classId),
                why: w.home ? 'Your class web' : w.entered ? 'Entered through a gateway' : `A gateway can open it: ${gatewayInto(w.classId).label.replace(/^Gateway: /, '')}` });
        }
        for (const w of view.legendaryWebs || []) {
            if (!w.open && !w.entered) continue;
            out.push({ webId: w.webId, name: w.name, kind: 'legendary', home: false, entered: w.entered, learnable: learnable(w.webId), why: 'Legendary web' });
        }
        return out;
    }

    /** Legendary webs still closed, with what they need (a teaser line). */
    function sealedLegends(view) {
        return (view.legendaryWebs || []).filter((w) => !w.open && !w.entered).map((w) => ({ name: w.name, needs: w.missing }));
    }

    const ORDER = { available: 0, owned: 1, locked: 2 };
    /**
     * One web's nodes as menu rows: what you can learn first, then what you know, then what is in reach.
     * Nodes not connected to anything you own are left out (they show on the picture only).
     * { id, label, kind, state, action: 'learn'|'unlearn'|null, sub }
     */
    function rows(view, webId) {
        const list = view.nodes.filter((n) => n.region === webId && !(n.kind === 'heart' && n.owned));
        return list.filter((n) => n.state !== 'locked' || !['NOT_CONNECTED'].includes(n.reason.code))
            .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.minLevel - b.minLevel))
            .map((n) => {
                const what = n.kind === 'gateway' ? `Gateway into the ${n.target} web` : n.legendary ? 'Legendary heart' : KIND[n.kind];
                const detail = n.trait ? n.trait.effect : n.why || '';
                let sub;
                if (n.state === 'available') sub = `Learn · ${n.cost} pt · ${what}${detail ? ` · ${detail}` : ''}`;
                else if (n.state === 'owned') sub = n.fixed ? `Known · your class kit` : `Known · ${what} · Enter to unlearn (+${n.cost} pt)`;
                else sub = n.reason.message;
                return { id: n.id, label: n.label, kind: n.kind, state: n.state, action: n.state === 'available' ? 'learn' : n.state === 'owned' && !n.fixed ? 'unlearn' : null, sub };
            });
    }

    /** The picture of one web as an SVG string. `selectedId` is ringed. Positions come from the engine. */
    function svg(view, webId, selectedId) {
        const nodes = view.nodes.filter((n) => n.region === webId);
        const byId = new Map(view.nodes.map((n) => [n.id, n]));
        const P = (n) => [Math.round((n.x || 0) * 100), Math.round((n.y || 0) * 100)];
        const cls = (n) => `sw-${n.state === 'locked' && n.reason && n.reason.code === 'NOT_CONNECTED' ? 'far' : n.state}${n.id === selectedId ? ' sw-sel' : ''}`;
        const lines = [];
        const seen = new Set();
        for (const n of nodes) for (const to of n.links) {
            const t = byId.get(to);
            if (!t || t.region !== webId) continue;
            const key = [n.id, to].sort().join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            const [x1, y1] = P(n), [x2, y2] = P(t);
            lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="sw-link${n.owned && t.owned ? ' sw-link-owned' : ''}"/>`);
        }
        const shapes = nodes.map((n) => {
            const [x, y] = P(n);
            const label = `<title>${esc(n.label)}${n.state === 'owned' ? ' (known)' : n.state === 'available' ? ' (can learn)' : ''}</title>`;
            if (n.kind === 'heart') return `<g class="${cls(n)}" data-node="${esc(n.id)}"><circle cx="${x}" cy="${y}" r="9"/>${label}</g>`;
            if (n.kind === 'passive') return `<g class="${cls(n)}" data-node="${esc(n.id)}"><circle cx="${x}" cy="${y}" r="4"/>${label}</g>`;
            if (n.kind === 'gateway') return `<g class="${cls(n)} sw-gate" data-node="${esc(n.id)}"><polygon points="${x},${y - 7} ${x + 7},${y + 5} ${x - 7},${y + 5}"/>${label}</g>`;
            return `<g class="${cls(n)}" data-node="${esc(n.id)}"><rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" transform="rotate(45 ${x} ${y})"/>${label}</g>`;
        });
        return `<svg class="sw-map" viewBox="-115 -115 230 230" role="img" aria-label="${esc(webId)} skill web">${lines.join('')}${shapes.join('')}</svg>`;
    }

    const api = { summary, webs, sealedLegends, rows, svg, esc };
    ENSO.skillWebView = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
