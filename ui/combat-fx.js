/* =========================================================================
 * Enso's Last Stand — COMBAT PRESENTATION (GFX-4, #106)
 * Hit flashes, floating numbers, projectiles, deaths and status highlights for the battle
 * screen. RENDERING ONLY: it reads what happened and draws it; it never touches game state.
 *
 * Effects are driven by PRESENTATION EVENTS, named like the Phase 1 structured events
 * (architecture/PHASE1_ENGINE_INTERFACE_SPEC.md) so the engine's own events can feed it directly
 * once they exist (spec PR-3):
 *   { type: 'cast',           actorId, targetIds, damageType }       projectile / swing from actor to targets
 *   { type: 'damage',         targetId, amount, damageType }          number + flash + shake
 *   { type: 'heal',           targetId, amount }                      green number + glow
 *   { type: 'resource',       targetId, amount, resource }            small blue number (gains only)
 *   { type: 'death',          targetId }                              fade-out burst
 *   { type: 'status.applied', targetId, status, category }            ring in the category's colour
 *   { type: 'status.removed', targetId, status, category }            fading ring
 *   { type: 'combat.presentation', kind: 'dash', actorId, anchorId }  the engine's existing presentation event
 * Until then, eventsFromStates() derives them from two getState() snapshots (before/after an action).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const PLAYER = 'player';
    const units = (s) => {
        const out = new Map();
        if (!s) return out;
        if (s.player) out.set(PLAYER, { hp: s.player.hp, statuses: s.player.statusEffects || [], resource: s.player.resource });
        for (const e of (s.combat && s.combat.enemies) || []) out.set(e.id, { hp: e.hp, statuses: e.statusEffects || [] });
        for (const m of (s.combat && s.combat.minions) || []) out.set(m.id, { hp: m.hp, statuses: m.statusEffects || [] });
        return out;
    };
    const statusNames = (u) => new Set((u ? u.statuses : []).map((x) => x.name));

    /**
     * Presentation events for one player action, from the state before and after it (pure).
     * `action` is what was sent to engine.act(); `data` is the game data (for status categories and
     * damage types). Order: the cast, then hits/heals/resources, then statuses, then deaths.
     */
    function eventsFromStates(before, after, action, data, extra = []) {
        const ev = [];
        const a = units(before), b = units(after);
        const statusDefs = (data && data.statusDefinitions) || {};
        if (action && (action.type === 'attack' || action.type === 'skill' || action.type === 'control')) {
            const def = action.type === 'skill' && data && data.skillDefinitions ? data.skillDefinitions[action.skillId] : null;
            const targetIds = action.targetIds || (action.targetId ? [action.targetId] : []);
            ev.push({ type: 'cast', actorId: action.type === 'control' ? action.actorId : PLAYER, targetIds,
                damageType: action.type === 'attack' ? 'physical' : (def && def.damage_type) || 'magical' });
        }
        for (const x of extra) if (x && x.type === 'combat.presentation') ev.push(x);
        for (const [id, u] of b) {
            const was = a.get(id);
            if (!was) continue;
            const d = u.hp - was.hp;
            if (d < 0) ev.push({ type: 'damage', targetId: id, amount: -d, damageType: 'physical' });
            if (d > 0) ev.push({ type: 'heal', targetId: id, amount: d });
            if (id === PLAYER && was.resource && u.resource && u.resource.current > was.resource.current) {
                ev.push({ type: 'resource', targetId: id, amount: u.resource.current - was.resource.current, resource: u.resource.type });
            }
        }
        // A damage number takes the cast's damage type when the target was one the cast aimed at.
        const cast = ev.find((e) => e.type === 'cast');
        if (cast) for (const e of ev) if (e.type === 'damage' && cast.targetIds.includes(e.targetId)) e.damageType = cast.damageType;
        for (const [id, u] of b) {
            const was = a.get(id);
            if (!was) continue;
            const now = statusNames(u), then = statusNames(was);
            for (const n of now) if (!then.has(n)) ev.push({ type: 'status.applied', targetId: id, status: n, category: (statusDefs[n] && statusDefs[n].category) || 'other' });
            for (const n of then) if (!now.has(n)) ev.push({ type: 'status.removed', targetId: id, status: n, category: (statusDefs[n] && statusDefs[n].category) || 'other' });
        }
        for (const [id, u] of b) { const was = a.get(id); if (was && was.hp > 0 && u.hp <= 0) ev.push({ type: 'death', targetId: id }); }
        // The engine drops the dead from its lists. A unit that vanished died, unless the fight ended some other
        // way (fled): after the last kill there is no combat left, and the world records a victory.
        const fightGoesOn = !!(after && after.combat);
        const won = !fightGoesOn && after && after.world && after.world.lastResult === 'victory';
        if (fightGoesOn || won) {
            const gone = [...a.keys()].filter((id) => id !== PLAYER && !b.has(id) && a.get(id).hp > 0);
            const deaths = gone.map((id) => ({ type: 'death', targetId: id }));
            const hits = gone.map((id) => ({ type: 'damage', targetId: id, amount: a.get(id).hp, damageType: cast && cast.targetIds.includes(id) ? cast.damageType : 'physical' }));
            const firstStatus = ev.findIndex((e) => e.type.startsWith('status') || e.type === 'death');
            ev.splice(firstStatus === -1 ? ev.length : firstStatus, 0, ...hits);
            ev.push(...deaths);
        }
        return ev;
    }

    // ---------------------------------------------------------------------
    // Looks: one place to restyle every effect (Sable).
    // ---------------------------------------------------------------------
    const STYLE = {
        damage: { physical: '#ffd9c8', magical: '#c8b8ff', true: '#ffffff', dot: '#b8e08a' },
        projectile: { physical: '#e8d8c0', magical: '#a890ff', true: '#ffffff' },
        heal: '#8ae69a', resource: '#7ab8ff',
        status: { buff: '#e8c860', debuff: '#c060e0', control: '#60c8ff', dot: '#90d060', other: '#c8c8c8' },
        durations: { cast: 260, number: 900, flash: 160, shake: 220, death: 520, status: 700 }
    };

    /** The active effects at `now` as plain draw instructions (pure: tests check timing and shapes). */
    function frame(effects, now, anchorOf) {
        const D = STYLE.durations;
        const out = [];
        for (const e of effects) {
            const t = now - e.t0;
            if (t < 0) continue;
            const at = anchorOf(e.targetId || e.actorId);
            if (e.type === 'cast') {
                if (t > D.cast) continue;
                const from = anchorOf(e.actorId);
                for (const id of e.targetIds) {
                    const to = anchorOf(id);
                    if (!from || !to) continue;
                    const k = t / D.cast;
                    out.push({ shape: e.damageType === 'physical' ? 'slash' : 'orb', x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 18, colour: STYLE.projectile[e.damageType] || STYLE.projectile.magical, k });
                }
                continue;
            }
            if (!at) continue;
            if (e.type === 'damage' || e.type === 'heal' || e.type === 'resource') {
                if (t > D.number) continue;
                const k = t / D.number;
                const colour = e.type === 'heal' ? STYLE.heal : e.type === 'resource' ? STYLE.resource : STYLE.damage[e.damageType] || STYLE.damage.physical;
                const text = e.type === 'damage' ? `-${e.amount}` : `+${e.amount}`;
                out.push({ shape: 'number', text, x: at.x, y: at.y - 10 - k * 26, alpha: 1 - k * k, colour, size: e.type === 'resource' ? 11 : 15 });
                if (e.type === 'damage' && t < D.flash) out.push({ shape: 'flash', id: e.targetId, alpha: 0.6 * (1 - t / D.flash) });
                if (e.type === 'damage' && t < D.shake) out.push({ shape: 'shake', id: e.targetId, dx: Math.round(Math.sin(t / 18) * 4 * (1 - t / D.shake)) });
                if (e.type === 'heal' && t < D.status) out.push({ shape: 'ring', x: at.x, y: at.y, r: 10 + k * 20, alpha: 0.5 * (1 - k), colour: STYLE.heal });
                continue;
            }
            if (e.type === 'death') {
                if (t > D.death) continue;
                const k = t / D.death;
                out.push({ shape: 'burst', x: at.x, y: at.y, r: 6 + k * 30, alpha: 1 - k, colour: '#e8e0d8' });
                out.push({ shape: 'fade', id: e.targetId, alpha: Math.min(1, k * 1.2) });
                continue;
            }
            if (e.type === 'status.applied' || e.type === 'status.removed') {
                if (t > D.status) continue;
                const k = t / D.status;
                const colour = STYLE.status[e.category] || STYLE.status.other;
                out.push({ shape: 'ring', x: at.x, y: at.y, r: e.type === 'status.applied' ? 28 - k * 10 : 18 + k * 14, alpha: (e.type === 'status.applied' ? 0.9 : 0.5) * (1 - k), colour });
                if (e.type === 'status.applied' && t < D.status * 0.7) out.push({ shape: 'number', text: e.status, x: at.x, y: at.y + 22 - k * 8, alpha: 1 - k, colour, size: 11 });
                continue;
            }
            if (e.type === 'combat.presentation' && e.kind === 'dash') {
                if (t > D.cast) continue;
                const to = anchorOf(e.anchorId), from = anchorOf(e.actorId);
                if (from && to) out.push({ shape: 'streak', x1: from.x, y1: from.y, x2: to.x, y2: to.y, alpha: 1 - t / D.cast, colour: STYLE.projectile.physical });
            }
        }
        return out;
    }

    /** How long effects stay alive. A cast's hits start when its projectile lands. */
    function schedule(events, now) {
        const hitAt = events.some((e) => e.type === 'cast') ? now + STYLE.durations.cast * 0.85 : now;
        return events.map((e) => ({ ...e, t0: e.type === 'cast' || e.type === 'combat.presentation' ? now : hitAt + (e.type === 'death' ? 120 : 0) + (e.type.startsWith('status') ? 60 : 0) }));
    }
    const maxLife = () => Math.max(...Object.values(STYLE.durations)) + 400;

    /** Canvas side: an overlay over the battle panel. anchorOf(id) -> { x, y } in the overlay's pixels. */
    function createFx(canvas) {
        let effects = [];
        const g = canvas.getContext('2d');
        function push(events, now) { effects = effects.concat(schedule(events, now)); }
        function draw(now, anchorOf, elementOf) {
            effects = effects.filter((e) => now - e.t0 < maxLife());
            g.clearRect(0, 0, canvas.width, canvas.height);
            const shapes = frame(effects, now, anchorOf);
            for (const el of elementOf ? elementOf() : []) { el.style.transform = ''; el.style.filter = ''; el.style.opacity = ''; }
            for (const s of shapes) {
                if (s.shape === 'shake' || s.shape === 'flash' || s.shape === 'fade') {
                    const el = elementOf && elementOf(s.id);
                    if (!el) continue;
                    if (s.shape === 'shake') el.style.transform = `translateX(${s.dx}px)`;
                    if (s.shape === 'flash') el.style.filter = `brightness(${1 + s.alpha * 2})`;
                    if (s.shape === 'fade') el.style.opacity = String(Math.max(0.35, 1 - s.alpha * 0.65));
                    continue;
                }
                g.save();
                g.globalAlpha = s.alpha == null ? 1 : Math.max(0, Math.min(1, s.alpha));
                g.fillStyle = s.colour; g.strokeStyle = s.colour;
                if (s.shape === 'orb') { g.beginPath(); g.arc(Math.round(s.x), Math.round(s.y), 5, 0, Math.PI * 2); g.fill(); g.globalAlpha = 0.35; g.beginPath(); g.arc(Math.round(s.x), Math.round(s.y), 10, 0, Math.PI * 2); g.fill(); }
                if (s.shape === 'slash') { g.lineWidth = 3; g.beginPath(); g.moveTo(s.x - 8, s.y - 8); g.lineTo(s.x + 8, s.y + 8); g.stroke(); }
                if (s.shape === 'number') { g.font = `bold ${s.size}px monospace`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(s.text, Math.round(s.x), Math.round(s.y)); g.fillText(s.text, Math.round(s.x), Math.round(s.y)); }
                if (s.shape === 'ring') { g.lineWidth = 2; g.beginPath(); g.arc(Math.round(s.x), Math.round(s.y), s.r, 0, Math.PI * 2); g.stroke(); }
                if (s.shape === 'burst') { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillRect(Math.round(s.x + Math.cos(a) * s.r), Math.round(s.y + Math.sin(a) * s.r), 3, 3); } }
                if (s.shape === 'streak') { g.lineWidth = 2; g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.stroke(); }
                g.restore();
            }
            return effects.length > 0;
        }
        return { push, draw, clear() { effects = []; g.clearRect(0, 0, canvas.width, canvas.height); }, get active() { return effects.length; } };
    }

    const api = { eventsFromStates, frame, schedule, createFx, STYLE, PLAYER };
    ENSO.combatFx = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
