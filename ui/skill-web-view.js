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

    // ---------------------------------------------------------------------
    // The full Skill Web screen: one web as a radial picture around its emblem, split into a wedge per
    // branch, learned paths glowing (Tokelo's reference, 2026-11-02; ENSO's own code-drawn look).
    // ---------------------------------------------------------------------
    const R = 300;   // picture radius in SVG units
    /** Geometry for one web: { nodes: [{ id, x, y, ... }], links: [{ a, b, owned, open }], sectors: [{ branch, name, angle, from, to }] }. */
    function scene(view, webId, branchNames = {}) {
        const nodes = view.nodes.filter((n) => n.region === webId).map((n) => ({ ...n, px: Math.round((n.x || 0) * R), py: Math.round((n.y || 0) * R) }));
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const links = [];
        const seen = new Set();
        for (const n of nodes) for (const to of n.links) {
            const t = byId.get(to);
            const key = [n.id, to].sort().join('|');
            if (!t || seen.has(key)) continue;
            seen.add(key);
            links.push({ a: n.id, b: to, owned: n.owned && t.owned, open: (n.owned && t.state === 'available') || (t.owned && n.state === 'available') });
        }
        // A wedge per branch, centred on the mean angle of its nodes; borders halfway between neighbours.
        const groups = {};
        for (const n of nodes) if (n.branch && n.kind !== 'gateway') (groups[n.branch] || (groups[n.branch] = [])).push(Math.atan2(n.py, n.px));
        const sectors = Object.entries(groups).map(([branch, as]) => ({ branch, name: branchNames[branch] || branch,
            angle: Math.atan2(as.reduce((s, a) => s + Math.sin(a), 0), as.reduce((s, a) => s + Math.cos(a), 0)) })).sort((a, b) => a.angle - b.angle);
        sectors.forEach((s, i) => {
            const next = sectors[(i + 1) % sectors.length];
            let gap = next.angle - s.angle; if (gap <= 0) gap += 2 * Math.PI;
            s.to = s.angle + gap / 2;
        });
        sectors.forEach((s, i) => { s.from = sectors[(i + sectors.length - 1) % sectors.length].to; });
        return { webId, nodes, links, sectors };
    }

    /** Keyboard travel: the nearest node in a direction ('up'|'down'|'left'|'right') from `fromId`, or null. */
    function nearest(sc, fromId, dir) {
        const from = sc.nodes.find((n) => n.id === fromId) || sc.nodes.find((n) => n.kind === 'heart');
        if (!from) return null;
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        let best = null, bestScore = Infinity;
        for (const n of sc.nodes) {
            if (n.id === from.id) continue;
            const dx = n.px - from.px, dy = n.py - from.py;
            const along = dx * v[0] + dy * v[1];
            if (along <= 0) continue;
            const across = Math.abs(dx * v[1] - dy * v[0]);
            const score = along + across * 2.2;   // prefer straight ahead
            if (score < bestScore) { bestScore = score; best = n; }
        }
        return best ? best.id : null;
    }

    /** The node a fresh screen opens on: something you can learn, else your last known node, else the heart. */
    function startNode(sc) {
        return (sc.nodes.find((n) => n.state === 'available') || [...sc.nodes].reverse().find((n) => n.owned && n.kind !== 'heart') || sc.nodes.find((n) => n.kind === 'heart') || {}).id || null;
    }

    const arc = (r, a0, a1) => `M ${Math.cos(a0) * r} ${Math.sin(a0) * r} A ${r} ${r} 0 ${((a1 - a0 + 4 * Math.PI) % (2 * Math.PI)) > Math.PI ? 1 : 0} 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}`;
    /** The emblem in the centre: a ring, a turning star and the class's initial. */
    function emblem(label) {
        const pts = (r, k, off) => Array.from({ length: k }, (_, i) => { const a = off + (i * 2 * Math.PI) / k; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ');
        return `<g class="swx-emblem"><circle r="36"/><circle r="29" class="swx-emblem-in"/>
            <polygon points="${pts(27, 3, -Math.PI / 2)}"/><polygon points="${pts(27, 3, Math.PI / 2)}"/>
            <circle r="12" class="swx-emblem-core"/><text y="5" text-anchor="middle">${esc(String(label || '?').charAt(0))}</text></g>`;
    }

    /** The whole picture: wedges, links, nodes (circles, sized by kind), the selected node ringed. */
    function screenSvg(sc, selectedId, opts = {}) {
        const wedges = sc.sectors.map((s, i) => `<path class="swx-wedge swx-w${i % 4}" d="M 0 0 L ${Math.cos(s.from) * R * 1.12} ${Math.sin(s.from) * R * 1.12} ${arc(R * 1.12, s.from, s.to).replace(/^M [^A]+/, '')} Z"/>
            <line class="swx-border" x1="0" y1="0" x2="${(Math.cos(s.from) * R * 1.12).toFixed(1)}" y2="${(Math.sin(s.from) * R * 1.12).toFixed(1)}"/>
            <text class="swx-sector" x="${(Math.cos(s.angle) * R * 1.08).toFixed(1)}" y="${(Math.sin(s.angle) * R * 1.08).toFixed(1)}" text-anchor="middle">${esc(s.name)}</text>`).join('');
        const by = new Map(sc.nodes.map((n) => [n.id, n]));
        const links = sc.links.map((l) => { const a = by.get(l.a), b = by.get(l.b);
            return `<line class="swx-link${l.owned ? ' on' : l.open ? ' open' : ''}" x1="${a.px}" y1="${a.py}" x2="${b.px}" y2="${b.py}"/>`; }).join('');
        const size = { heart: 0, active: 13, passive: 9, gateway: 11 };
        const nodes = sc.nodes.filter((n) => n.kind !== 'heart').map((n) => {
            const st = n.owned ? 'on' : n.state === 'available' ? 'open' : n.reason && n.reason.code === 'NOT_CONNECTED' ? 'far' : 'near';
            const r = size[n.kind] || 10;
            const inner = n.kind === 'gateway' ? `<path class="swx-glyph" d="M ${n.px - 5} ${n.py + 3} L ${n.px} ${n.py - 5} L ${n.px + 5} ${n.py + 3}"/>`
                : n.kind === 'active' ? `<circle class="swx-dot" cx="${n.px}" cy="${n.py}" r="${r - 6}"/>` : '';
            return `<g class="swx-node ${st}${n.id === selectedId ? ' sel' : ''} k-${n.kind}" data-node="${esc(n.id)}" tabindex="-1">
                <circle cx="${n.px}" cy="${n.py}" r="${r}"/>${inner}<title>${esc(n.label)}</title></g>`;
        }).join('');
        const heart = sc.nodes.find((n) => n.kind === 'heart');
        return `<svg class="swx-map" viewBox="${-R * 1.16} ${-R * 1.16} ${R * 2.32} ${R * 2.32}" role="img" aria-label="${esc(opts.title || 'Skill web')}">
            <defs><filter id="swx-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            ${wedges}<g class="swx-links">${links}</g>${emblem(heart ? heart.label : opts.title)}<g class="swx-nodes">${nodes}</g></svg>`;
    }

    /** The side panel's node card: { title, kind, state, lines: [..], action: 'learn'|'unlearn'|null, actionText }. */
    function nodeCard(view, nodeId, describeSkill) {
        const n = view.nodes.find((x) => x.id === nodeId);
        if (!n) return null;
        const kind = n.kind === 'gateway' ? `Gateway into the ${n.target} web` : n.legendary ? 'Legendary heart' : n.kind === 'heart' ? 'Class heart' : n.kind === 'passive' ? 'Passive' : 'Active skill';
        const lines = [];
        if (n.skill && describeSkill) { const d = describeSkill(n.skill) || {}; if (d.description) lines.push(d.description); if (d.cost) lines.push(`Costs ${d.cost} to use`); if (d.implemented === false) lines.push('Not built yet'); }
        if (n.trait && n.trait.effect) lines.push(n.trait.effect);
        if (n.why) lines.push(n.why);
        if (n.minLevel > 1) lines.push(`Level ${n.minLevel}`);
        const state = n.owned ? (n.fixed ? 'Known · your class kit' : 'Known') : n.state === 'available' ? `Can learn · ${n.cost} point${n.cost === 1 ? '' : 's'}` : n.reason.message;
        const action = n.state === 'available' ? 'learn' : n.owned && !n.fixed ? 'unlearn' : null;
        return { id: n.id, title: n.label, kind, state, lines, action, actionText: action === 'learn' ? `Learn (${n.cost} pt)` : action === 'unlearn' ? `Unlearn (+${n.cost} pt)` : '' };
    }

    const api = { summary, webs, sealedLegends, rows, svg, esc, scene, nearest, startNode, screenSvg, nodeCard, emblem };
    ENSO.skillWebView = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
