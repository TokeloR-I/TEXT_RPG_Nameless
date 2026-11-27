/* =========================================================================
 * Enso's Last Stand — WORLD MAP VIEW MODEL (no DOM)
 * The menu's Map tab (research round two, pick 3; Tokelo approved 2026-11-25; docs/ui/WORLD_MAP.md):
 * every area you have entered, drawn as a schematic map per region, where you are, your tracked quests and
 * the Black Flight anchors, and flying from it.
 *
 *   view(world, travel, avail, tracked, regionId) -> { regions, region, here }
 *   svg(region, selectedId)                       -> the region's map as an SVG string
 *
 * Inputs are only the engine's answers: getTravelState() (visited maps, anchors), getAvailableActions()
 * (the black_flight options: whether you may fly and why not) and the tracked objectives. The world data is
 * read for map names and which areas join. Nothing here decides whether you can fly.
 * Areas are laid out by hand per region (LAYOUT); rooms and interiors fold into the area you enter them from.
 * Tested in tests/116-world-map.test.js.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    /**
     * The regions, in story order. Each area: [mapId, x, y, short name, inner maps]. x and y are grid units
     * (one unit = UNIT_X by UNIT_Y px in the SVG). Story order runs up the page in the Vale (homestead at the
     * foot, the Warden's sanctuary at the top), and Hrimvald spreads west and north from the pass.
     */
    const LAYOUT = [
        { id: 'vale', name: 'Blackbriar Vale', areas: [
            ['sanctuary', 3, 0, "The Warden's Sanctuary", ['seal_chamber']],
            ['featherwatch', 3, 1, 'Featherwatch Path'],
            ['orchard', 3, 2, 'The North Orchard'],
            ['briarwell_cloister_court', 4.5, 2.55, 'Briarwell Kloster', ['kloster_inner']],
            ['shamefield', 3, 3, 'Shamefield'],
            ['allotment', 1.5, 3, "Shane's Allotment"],
            ['village_residential_lane', 4.5, 3.45, "Baker's Lane"],
            ['tollway', 3, 4, 'The Broken Tollway'],
            ['road', 3, 5, 'The Overgrown Road'],
            ['grounds', 3, 6, 'The Homestead', ['house', 'cellar', 'shed', 'well']]
        ] },
        { id: 'hrimvald', name: 'Hrimvald', areas: [
            ['runadal', 1.2, 0.3, 'Rúnadal'],
            ['hallvard_barrow', 3, 0.3, "Hallvard's Barrow"],
            ['wolfbanner_camp', 5.6, 0.3, 'The Wolf-Banner Camp'],
            ['bjarki_barrow', 2.3, 1.2, "Bjarki's Barrow"],
            ['silent_field', 4.2, 1.15, 'The Silent Field'],
            ['uplands', 5.6, 1.8, 'The Uplands'],
            ['birkholt', 0, 2.3, 'Birkholt'],
            ['jarnmyr', 1.2, 2.3, 'Járnmyr'],
            ['hrafnholm', 3, 2.6, 'Hrafnholm', ['hall_of_winter']],
            ['gullstrand_coast', 2.1, 3.9, 'Gullstrand Coast'],
            ['skeldvik', 3.8, 3.6, 'Skeldvik Harbor', ['stormtide_inn']],
            ['frostspine_pass', 5.2, 4.4, 'Frostspine Pass']
        ] },
        { id: 'underworld', name: 'The Underworld', areas: [
            ['dominion_beelzebub', 0, 0.6, 'The Second Dominion'],
            ['underworld_arena', 1.5, 0, 'The First Dominion'],
            ['dominion_slotos', 3, 0.6, 'The Third Dominion'],
            ['dominion_plumede', 1.5, 1.3, 'The Fourth Dominion']
        ] }
    ];
    const UNIT_X = 150, UNIT_Y = 80, PAD_X = 110, PAD_Y = 40, MIN_W = 560, MIN_H = 300;

    // mapId -> { region, area } for every map, inner rooms included.
    const OWNER = {};
    for (const r of LAYOUT) for (const [id, , , , inner] of r.areas) for (const m of [id, ...(inner || [])]) OWNER[m] = { region: r.id, area: id };

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /** Where a map sits on the world map: { region, area } or null (a map the layout doesn't know yet). */
    function placeOf(mapId) { return OWNER[mapId] || null; }

    /**
     * The map tab's model.
     *   regions : [{ id, name, here }] the regions you have set foot in, in story order
     *   region  : the region shown: { id, name, width, height, areas, links, gates }
     *     areas : [{ id, name, x, y, known, here, anchors, quests }] (known: entered; else an unexplored
     *             neighbour, shown without its name). anchors: [{ anchorId, name, attuned, enabled, why, hint }],
     *             quests: [{ questId, title, text }] tracked objectives whose marker is in this area.
     *     links : [[areaId, areaId]] roads between two shown areas; gates: [{ area, toRegion, name }] roads out you have taken.
     *   here    : the area you are in, or null.
     */
    function view(world, travel, avail, tracked, regionId) {
        const maps = (world && world.maps) || {};
        const t = travel || { at: null, visited: [], anchors: [] };
        const visited = new Set(t.visited || []);
        if (t.at) visited.add(t.at);
        const knownAreas = new Set([...visited].map((m) => OWNER[m] && OWNER[m].area).filter(Boolean));
        const hereArea = t.at && OWNER[t.at] ? OWNER[t.at].area : null;
        const hereRegion = t.at && OWNER[t.at] ? OWNER[t.at].region : null;
        const flights = {};
        for (const a of ((avail && avail.actions) || [])) if (a.type === 'black_flight' && a.anchorId) flights[a.anchorId] = a;

        // Roads between areas, from the world's own exits (both directions are exits, so one is enough).
        const roads = new Map();
        for (const [mid, m] of Object.entries(maps)) {
            const from = OWNER[mid];
            if (!from) continue;
            for (const e of m.exits || []) {
                const to = OWNER[e.toMap];
                if (!to || to.area === from.area) continue;
                const key = [from.area, to.area].sort().join('|');
                if (!roads.has(key)) roads.set(key, { a: from, b: to });
            }
        }
        const regions = LAYOUT.filter((r) => r.areas.some(([id]) => knownAreas.has(id)))
            .map((r) => ({ id: r.id, name: r.name, here: r.id === hereRegion }));
        const pick = regions.find((r) => r.id === regionId) || regions.find((r) => r.here) || regions[0];
        if (!pick) return { regions: [], region: null, here: null };
        const def = LAYOUT.find((r) => r.id === pick.id);

        const neighbours = new Set();
        for (const { a, b } of roads.values()) {
            if (a.region !== def.id || b.region !== def.id) continue;
            if (knownAreas.has(a.area)) neighbours.add(b.area);
            if (knownAreas.has(b.area)) neighbours.add(a.area);
        }
        const areas = [];
        for (const [id, x, y, short, inner] of def.areas) {
            const known = knownAreas.has(id);
            if (!known && !neighbours.has(id)) continue;
            const own = new Set([id, ...(inner || [])]);
            const anchors = known && t.aspect ? (t.anchors || []).filter((an) => own.has(an.map)).map((an) => {
                const f = flights[an.anchorId];
                const here = !!(f && (f.here || (f.reason && f.reason.code === 'HERE')));
                const enabled = !!(an.attuned && f && f.enabled && !here);
                const obj = an.attune && maps[an.map] ? (maps[an.map].interactables || []).find((o) => o.id === an.attune) : null;
                return { anchorId: an.anchorId, name: an.name, attuned: !!an.attuned, enabled, here,
                    why: !an.attuned ? '' : here ? 'You are here' : enabled ? '' : (f && f.reason && (f.reason.message || f.reason.text)) || (t.aspect ? 'Not now' : 'The crow is not yours yet'),
                    hint: an.attuned ? '' : obj ? `Look at the ${String(obj.name || 'marked place').toLowerCase()} to attune it.` : 'Not attuned yet.' };
            }) : [];
            const quests = (tracked || []).filter((q) => q && q.marker && own.has(q.marker.map))
                .map((q) => ({ questId: q.questId, title: q.title, text: q.text }));
            areas.push({ id, name: known ? short || (maps[id] && maps[id].name) || id : 'Unexplored', x, y, known, here: id === hereArea, anchors, quests });
        }
        const shown = new Set(areas.map((a) => a.id));
        const links = [], gates = [];
        for (const { a, b } of roads.values()) {
            if (a.region === def.id && b.region === def.id) { if (shown.has(a.area) && shown.has(b.area)) links.push([a.area, b.area]); continue; }
            const [inside, out] = a.region === def.id ? [a, b] : b.region === def.id ? [b, a] : [null, null];
            // A road out is drawn once you have been down it: no spoilers (the stair below the homestead stays a secret).
            if (!inside || !knownAreas.has(inside.area) || !knownAreas.has(out.area)) continue;
            gates.push({ area: inside.area, toRegion: out.region, name: LAYOUT.find((r) => r.id === out.region).name });
        }
        // The picture frames what is shown, so a region you have only started is drawn large, not lost in a corner.
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const a of areas) { x0 = Math.min(x0, a.x); y0 = Math.min(y0, a.y); x1 = Math.max(x1, a.x); y1 = Math.max(y1, a.y); }
        const left = Math.round(x0 * UNIT_X), top = Math.round(y0 * UNIT_Y);
        let width = Math.round((x1 - x0) * UNIT_X + PAD_X * 2), height = Math.round((y1 - y0) * UNIT_Y + PAD_Y * 2 + 24);
        const box = { x: left, y: top, width: Math.max(width, MIN_W), height: Math.max(height, MIN_H) };
        box.x -= Math.round((box.width - width) / 2); box.y -= Math.round((box.height - height) / 2);
        return { regions, here: hereArea,
            region: { id: def.id, name: def.name, box, width: box.width, height: box.height, areas, links, gates } };
    }

    /** The places in the shown region you can choose in the list: entered ones, in layout order (top to bottom). */
    function places(v) {
        if (!v || !v.region) return [];
        return v.region.areas.filter((a) => a.known).slice().sort((a, b) => a.y - b.y || a.x - b.x);
    }

    const px = (a) => Math.round(a.x * UNIT_X + PAD_X);
    const py = (a) => Math.round(a.y * UNIT_Y + PAD_Y);

    /**
     * The region as an SVG string: roads, areas (a ring where you are, a feather mark for anchors, a flag for
     * tracked quests), unexplored neighbours as dim question marks, and labelled roads out to other regions.
     * Colours come from CSS classes (world.css .wm-*), so the menu palette and both themes apply.
     */
    function svg(region, selectedId) {
        if (!region) return '';
        const at = Object.fromEntries(region.areas.map((a) => [a.id, a]));
        const roads = region.links.map(([a, b]) => `<line class="wm-road${at[a].known && at[b].known ? '' : ' wm-faint'}" x1="${px(at[a])}" y1="${py(at[a])}" x2="${px(at[b])}" y2="${py(at[b])}"/>`).join('');
        const gates = region.gates.map((g) => {
            const a = at[g.area];
            if (!a) return '';
            const right = px(a) >= region.box.x + region.box.width / 2;
            const x2 = right ? px(a) + 56 : px(a) - 56;
            return `<g class="wm-gate"><line x1="${px(a)}" y1="${py(a)}" x2="${x2}" y2="${py(a)}"/><text x="${x2 + (right ? 6 : -6)}" y="${py(a) + 6}" text-anchor="${right ? 'start' : 'end'}">${right ? '' : '‹ '}${esc(g.name)}${right ? ' ›' : ''}</text></g>`;
        }).join('');
        const nodes = region.areas.map((a) => {
            const x = px(a), y = py(a);
            const cls = ['wm-area', a.known ? 'known' : 'fog', a.here ? 'here' : '', a.id === selectedId ? 'sel' : '', a.quests.length ? 'quest' : ''].filter(Boolean).join(' ');
            const anchor = a.anchors.find((n) => n.attuned) || a.anchors[0];
            const mark = anchor ? `<path class="wm-anchor${anchor.attuned ? ' on' : ''}" d="M${x + 11} ${y - 10}c2 -8 8 -13 14 -14c-1 7 -6 13 -14 14z M${x + 11} ${y - 10}l-3 4"/>` : '';
            const flag = a.quests.length ? `<g class="wm-flag"><path d="M${x - 16} ${y - 4}v-20"/><path d="M${x - 16} ${y - 24}h13l-3 4l3 4h-13z"/></g>` : '';
            return `<g class="${cls}" data-area="${esc(a.id)}" tabindex="-1">${a.here ? `<circle class="wm-ring" cx="${x}" cy="${y}" r="15"/>` : ''}
                <circle class="wm-dot" cx="${x}" cy="${y}" r="${a.known ? 8 : 7}"/>${a.known ? '' : `<text class="wm-q" x="${x}" y="${y + 5}" text-anchor="middle">?</text>`}${mark}${flag}
                ${a.known ? `<text class="wm-name" x="${x}" y="${y + 30}" text-anchor="middle">${esc(a.name)}</text>` : ''}</g>`;
        }).join('');
        const b = region.box;
        return `<svg class="wm-svg" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" role="img" aria-label="${esc(region.name)} map" preserveAspectRatio="xMidYMid meet">${roads}${gates}${nodes}</svg>`;
    }

    const api = { view, places, svg, placeOf, LAYOUT };
    ENSO.worldMapView = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
