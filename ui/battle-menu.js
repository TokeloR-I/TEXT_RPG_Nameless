/* =========================================================================
 * Enso's Last Stand — BATTLE MENU MODEL (no DOM)
 * Turns engine.getAvailableActions() into the world battle overlay's menus and
 * turns a menu choice back into an engine.act() action. The overlay never
 * decides what is usable: every enabled/disabled entry and every reason comes
 * from the engine (Phase 1 spec §6A W3, invariant I18). Kept DOM-free so the
 * mapping is tested headlessly (tests/23-phase1-actions.test.js).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const costText = (o) => (o.cost ? `${o.cost} ${o.resource}` : 'free');
    const noteText = (notes) => (notes && notes.length ? ` · ${notes.map((n) => n.message).join(' ')}` : '');

    /** Does choosing this option need a target menu? 'single' (pick one of several), 'multi' (pick N), or null. */
    function targetMode(option) {
        if (option.pick) return 'multi';
        if (option.targeting === 'enemy_single' && option.targets && option.targets.length > 1) return 'single';
        return null;
    }

    /** The action for an option, once its targets (if any) are chosen. */
    function actionFor(option, targetIds) {
        if (option.type === 'attack') return targetIds && targetIds.length ? { type: 'attack', targetId: targetIds[0] } : { type: 'attack' };
        if (option.type === 'skill') {
            if (option.pick) return { type: 'skill', skillId: option.skillId, targetIds: targetIds || [] };
            if (targetIds && targetIds.length) return { type: 'skill', skillId: option.skillId, targetId: targetIds[0] };
            const only = option.targeting === 'enemy_single' && option.targets && option.targets.length === 1 ? option.targets[0].id : null;
            return only ? { type: 'skill', skillId: option.skillId, targetId: only } : { type: 'skill', skillId: option.skillId };
        }
        if (option.type === 'use_item') return { type: 'use_item', item: option.item };
        if (option.type === 'turn_order') return { type: 'turn_order', order: option.mode === 'choose' ? (targetIds || []) : null }; // D-09
        if (option.type === 'control') {   // N-5 Possession: the controlled actor's move
            const only = option.targets && option.targets.length === 1 ? option.targets[0].id : null;
            const targetId = targetIds && targetIds.length ? targetIds[0] : only;
            return { type: 'control', actorId: option.actorId, skillId: option.skillId, targetId };
        }
        return { type: option.type };
    }

    /**
     * Menu entries for the current availability.
     *   root   : Attack / Skills / Items / Flee (or just Continue on a skipped turn,
     *            or the possessed enemy's moves while awaiting 'control',
     *            or Set the turn order / Keep the speed order while awaiting 'turn_order')
     *   skills : every known skill, enabled or with the engine's reason
     *   items  : usable items
     * Each entry: { kind, label, sub, disabled, option }.
     */
    function entries(avail, view, skillInfo) {
        const acts = avail.actions || [];
        if (view === 'root') {
            if (avail.awaiting === 'turn_order') {   // D-09: pick everyone in the order they should act, or keep the speed order
                return acts.map((o) => (o.mode === 'choose'
                    ? { kind: 'turn_order', label: 'Set the turn order', sub: `Pick all ${o.targets.length}, first to act first`, disabled: !o.enabled, option: o }
                    : { kind: 'turn_order', label: 'Keep the speed order', sub: 'Everyone acts by speed this round', disabled: !o.enabled, option: o }));
            }
            if (avail.awaiting === 'control') {   // N-5: one entry per move of the possessed enemy
                return acts.map((o) => ({ kind: 'control', label: o.skillId, sub: o.enabled ? `Its move · turn it on its allies${noteText(o.notes)}` : o.reason.message, disabled: !o.enabled, option: o }));
            }
            if (avail.awaiting === 'continue') return [{ kind: 'continue', label: 'Continue', sub: "You can't act this turn.", disabled: false, option: acts[0] }];
            const attack = acts.find((o) => o.type === 'attack');
            const skills = acts.filter((o) => o.type === 'skill');
            const items = acts.filter((o) => o.type === 'use_item');
            const flee = acts.find((o) => o.type === 'flee');
            const out = [];
            if (attack) out.push({ kind: 'attack', label: 'Attack', sub: attack.skillId + (attack.enabled ? noteText(attack.notes) : ` · ${attack.reason.message}`), disabled: !attack.enabled, option: attack });
            out.push({ kind: 'skills', label: 'Skills', sub: `${skills.filter((o) => o.enabled).length} of ${skills.length} usable`, disabled: !skills.length, option: null });
            out.push({ kind: 'items', label: 'Items', sub: items.length ? `${items.filter((o) => o.enabled).length} usable` : 'nothing usable', disabled: !items.some((o) => o.enabled), option: null });
            if (flee) out.push({ kind: 'flee', label: 'Flee', sub: 'Back to the map. The enemy stays.', disabled: !flee.enabled, option: flee });
            return out;
        }
        if (view === 'skills') {
            return acts.filter((o) => o.type === 'skill').map((o) => {
                const detail = skillInfo && skillInfo[o.skillId] ? `${skillInfo[o.skillId]} · ` : '';
                return { kind: 'skill', label: o.skillId, sub: `${detail}${costText(o)}${o.enabled ? noteText(o.notes) : ` · ${o.reason.message}`}`, disabled: !o.enabled, option: o };
            });
        }
        if (view === 'items') {
            return acts.filter((o) => o.type === 'use_item').map((o) => ({
                kind: 'item', label: `${o.item}${o.count > 1 ? ` (x${o.count})` : ''}`, sub: o.enabled ? 'Use it' : o.reason.message, disabled: !o.enabled, option: o
            }));
        }
        return [];
    }

    /** Target entries for an option (single or multi pick), using names/HP from getState(). */
    function targetEntries(option, state) {
        const units = new Map([...((state.combat && state.combat.enemies) || []), ...((state.combat && state.combat.minions) || [])].map((e) => [e.id, e]));
        if (state.player) units.set('player', { ...state.player, name: `${state.player.name} (you)` });
        return (option.targets || []).map((t) => {
            const u = units.get(t.id) || { name: t.id, hp: '?', maxHp: '?' };
            const extra = t.enabled ? noteText(t.notes) : ` · ${t.reason.message}`;
            return { kind: 'target', id: t.id, label: u.name, sub: `${u.hp}/${u.maxHp} HP${extra}`, disabled: !t.enabled };
        });
    }

    const api = { entries, targetEntries, targetMode, actionFor };
    ENSO.battleMenu = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
