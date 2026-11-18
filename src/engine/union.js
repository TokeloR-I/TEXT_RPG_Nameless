/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Devil Union (legendary class, prototype)
 * docs/design/DEVIL_UNION_LEGENDARY_CLASS_IMPLEMENTATION_BRIEF.md (Tokelo 2026-11-17, "build now, rework later").
 * Numbers live in skillWeb.legendaryWebs.<id>.unions (src/data.js). Data, no names in code: any legendary web with
 * `unions` works the same way.
 *
 *   - Contracts: a union is yours once its contract flag is set (`contract:lucifero`, sealed after its Dominion's arena).
 *     The first contract also sets `devil_union_contract`, which opens the web (CB2, src/story/chapter2.js).
 *   - One equipped union at a time (`equip_union`, or `union` with a `union` id: choose and merge in one go), kept in
 *     the save (player.union.equipped). You choose which contracted demon answers (Tokelo 2026-11-18: "doesn't even
 *     allow the player to select a demon"); any time you are not merged, in a fight or out of one.
 *   - Two Qliphoth Resonance slots (`set_resonance`): Qliphoth aspects you already hold, each a small stat boost that
 *     applies only while a union is active. The same aspect can't sit in both slots. Kept in the save.
 *   - `union` merges you with the equipped demon: for `durationSeconds` its `mods` apply, its signature
 *     skills take the first slots of your skill bar (your own bar comes back untouched when it ends), and the
 *     resonance boosts apply. The cooldown (`cooldownSeconds`) starts on activation. Turn fights use turns instead.
 *   - In a fight the union lives on the fight (combat.union). Out of a fight (Tokelo 2026-11-18: "why cant I use devil
 *     union out of combat?") it lives on the calm clock (world.calm.union, src/engine/action.js), so it needs the live
 *     world (combatMode 'action'). A union and its cooldown carry from the calm clock into a fight and back out of it
 *     with the time they have left, like pre-buffs (unionEnterFight / unionLeaveFight). Falling ends it.
 *   - Skills with `union: '<id>'` can only be used while merged with that demon (refusal NOT_IN_UNION).
 *   - Web nodes with `contract: '<flag>'` need that contract; nodes with `unionMods` add to that union's mods.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies them onto GameEngine.prototype.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const MOD_KEYS = ['damage', 'defence', 'speed'];

    class UnionMethods {
        /** Pure: the legendary web with unions that you hold, as { id, rules }, or null. */
        unionWeb() {
            const webs = ((this.data.skillWeb || {}).legendaryWebs) || {};
            for (const [id, leg] of Object.entries(webs)) {
                if (leg.unions && this.webOwns && this.webOwns(`heart.${id}`)) return { id, rules: leg.unions };
            }
            return null;
        }

        /** Pure: the unions whose contract you hold, in the data's order. */
        unionContracts() {
            const w = this.unionWeb();
            if (!w) return [];
            return Object.entries(w.rules.list).filter(([, d]) => this.hasStoryFlag && this.hasStoryFlag(d.contract)).map(([id]) => id);
        }

        /** Pure: the Qliphoth aspects you hold that can resonate. */
        resonanceOwned() {
            const w = this.unionWeb();
            if (!w) return [];
            return Object.entries(w.rules.resonance || {}).filter(([, d]) => this.hasStoryFlag && this.hasStoryFlag(d.flag)).map(([id]) => id);
        }

        /** The saved choices (made on first use; a save from before the class, or one that dropped a contract, is fixed here). */
        unionState() {
            const w = this.unionWeb();
            const p = this.player;
            if (!w || !p) return null;
            if (!p.union || typeof p.union !== 'object') p.union = { equipped: null, resonance: [] };
            if (!Array.isArray(p.union.resonance)) p.union.resonance = [];
            const owned = this.unionContracts();
            if (!owned.includes(p.union.equipped)) p.union.equipped = owned[0] || null;
            const slots = w.rules.resonanceSlots || 2;
            const have = this.resonanceOwned();
            p.union.resonance = p.union.resonance.slice(0, slots).map((x) => (have.includes(x) ? x : null));
            while (p.union.resonance.length < slots) p.union.resonance.push(null);
            return p.union;
        }

        /** Pure: the union you are merged with right now (in a fight, or out of one on the calm clock), or null. */
        activeUnion() {
            const w = this.unionWeb();
            if (!w) return null;
            const u = this.mode === 'combat' ? this.combat && this.combat.union : this.calmUnion();
            return u && w.rules.list[u.id] ? u.id : null;
        }

        /** Pure: the union running out of a fight (world.calm.union while its time lasts), or null. */
        calmUnion() {
            const calm = this.world && this.world.calm;
            const u = calm && calm.union;
            return u && u.endsAt > calm.now ? u : null;
        }

        /** Out of a fight a union runs on the calm clock, which only the live world (combatMode 'action') advances. */
        calmUnionWorks() { return this.combatMode === 'action' && !!this.world && this.mode === 'explore' && typeof this.actionCalm === 'function'; }

        /** Pure: a modifier the active union gives this combatant, e.g. 'damage' (the demon, its web nodes, resonance). */
        unionMod(c, key) {
            if (!c || c !== this.player) return 0;
            const id = this.activeUnion();
            if (!id) return 0;
            const w = this.unionWeb();
            const d = w.rules.list[id];
            let v = Number((d.mods || {})[key]) || 0;
            const web = this.skillWeb ? this.skillWeb() : null;
            if (web) for (const n of web.nodes.values()) if (n.unionMods && n.union === id && this.webOwns(n.id)) v += Number(n.unionMods[key]) || 0;
            for (const r of (this.player.union && this.player.union.resonance) || []) {
                const rd = r && (w.rules.resonance || {})[r];
                if (rd && this.hasStoryFlag(rd.flag)) v += Number((rd.mods || {})[key]) || 0;
            }
            return v;
        }

        /** Pure: the active union's signature skills (they take the first slots of the bar while it lasts). */
        unionSkills() {
            const id = this.activeUnion();
            return id ? [...(this.unionWeb().rules.list[id].skills || [])] : [];
        }
        /** Pure: does the active union lend you this skill? */
        unionGrants(name) { return !!name && this.unionSkills().includes(name); }

        /** The skill bar as the fight sees it: the union's skills over the first slots, your own bar otherwise. */
        unionBar(bar) {
            const skills = this.unionSkills();
            if (!skills.length) return bar;
            const out = [...bar];
            skills.forEach((s, i) => { if (i < out.length) out[i] = s; });
            return out;
        }

        /** Why a skill can't be used now because of its union, or null. useSkill and skillAvailability share it. */
        unionProblem(skill) {
            if (!skill || !skill.union) return null;
            if (this.activeUnion() === skill.union) return null;
            const w = this.unionWeb();
            const d = (w && w.rules.list[skill.union]) || {};
            return { code: 'NOT_IN_UNION', message: `${skill.name || 'That skill'} needs union with ${d.name || skill.union}.` };
        }

        /** Pure: why you can't merge right now, or null. Gives `readyInMs` / `readyInTurns` on a cooldown. */
        unionActivateProblem() {
            const w = this.unionWeb();
            if (!w) return { code: 'NO_UNION', message: 'You have no contract to call on.' };
            const st = this.unionState();
            if (!st.equipped) return { code: 'NO_CONTRACT', message: 'You hold no contract yet.' };
            const inFight = this.mode === 'combat' && !!this.combat;
            if (!inFight && !this.calmUnionWorks()) return { code: 'WRONG_MODE', message: 'Out of a fight a union needs the live world.' };
            if (this.activeUnion()) return { code: 'ALREADY_IN_UNION', message: `You are already one with ${w.rules.list[this.activeUnion()].name}.` };
            if (this.player.statusEffects.some((s) => s.type === 'skip_turn')) return { code: 'STUNNED', message: "You're stunned and can't call the union." };
            if (!inFight) {
                const calm = this.actionCalm();
                const ms = (calm.unionReadyAt || 0) - calm.now;
                return ms > 0 ? { code: 'UNION_COOLDOWN', message: `The union answers again in ${(ms / 1000).toFixed(1)}s.`, readyInMs: ms } : null;
            }
            const rt = this.combat.rt;
            if (rt && this.rtActive && this.rtActive()) {
                if ((rt.unionReadyAt || 0) > rt.now) {
                    const ms = rt.unionReadyAt - rt.now;
                    return { code: 'UNION_COOLDOWN', message: `The union answers again in ${(ms / 1000).toFixed(1)}s.`, readyInMs: ms };
                }
                return null;
            }
            const t = this.timersOf(this.player.id, 'union_cooldown')[0];
            if (t) return { code: 'UNION_COOLDOWN', message: `The union answers again in ${t.remaining} turn${t.remaining === 1 ? '' : 's'}.`, readyInTurns: t.remaining };
            return null;
        }

        /** Pure: how long a union lasts and how long until it answers again. Demonkore's Favor (the third-contract reveal,
         *  docs/design/DEMONKORE_THIRD_CONTRACT_REVELATION_AND_FAVOR.md) multiplies the base: duration x3, cooldown -30%. */
        unionTiming() {
            const r = (this.unionWeb() || { rules: {} }).rules;
            const f = r.favor && this.hasStoryFlag && this.hasStoryFlag(r.favor.flag) ? r.favor : null;
            const dm = f ? f.durationMult : 1, cm = f ? f.cooldownMult : 1;
            return {
                favor: !!f,
                durationSeconds: (r.durationSeconds || 20) * dm, cooldownSeconds: (r.cooldownSeconds || 60) * cm,
                durationTurns: Math.max(1, Math.round((r.durationTurns || 6) * dm)), cooldownTurns: Math.max(1, Math.round((r.cooldownTurns || 18) * cm))
            };
        }

        /** The rule: merge with the equipped demon (or first choose `id`, one you hold a contract with). Never uses your turn. */
        activateUnion(id = null) {
            const refuse = this.mode === 'combat' ? this.refuseCombat.bind(this) : this.refuse.bind(this);
            if (id) {
                const problem = this.unionChooseProblem(id);
                if (problem) { refuse(problem.code, problem.message); return; }
            }
            const problem = this.unionActivateProblem();
            if (problem) { refuse(problem.code, problem.message); return; }
            const w = this.unionWeb();
            if (id) this.unionState().equipped = this.unionKey(id);
            const key = this.unionState().equipped;
            const d = w.rules.list[key];
            const t = this.unionTiming();
            if (this.mode !== 'combat') {
                const calm = this.actionCalm();
                calm.union = { id: key, endsAt: calm.now + Math.round(t.durationSeconds * 1000) };
                calm.unionReadyAt = calm.now + Math.round(t.cooldownSeconds * 1000);
            } else {
                const rt = this.combat.rt;
                if (rt && this.rtActive && this.rtActive()) {
                    this.combat.union = { id: key, endsAt: rt.now + Math.round(t.durationSeconds * 1000) };
                    rt.unionReadyAt = rt.now + Math.round(t.cooldownSeconds * 1000);
                } else {
                    this.combat.union = { id: key, turns: true };
                    this.addTimer(this.player, 'union_active', t.durationTurns, { replace: true });
                    this.addTimer(this.player, 'union_cooldown', t.cooldownTurns, { replace: true });
                }
            }
            this.out.push({ type: 'union', union: key, active: true });
            this.say(d.say || `You and ${d.name} become one.`, { important: true, notice: 'skill' });
        }

        /** The union runs out (its time, or you fell). In a fight: the fight's union; out of one: the calm clock's. */
        endUnion() {
            const calm = this.mode !== 'combat' && this.world && this.world.calm;
            const u = calm ? calm.union : this.combat && this.combat.union;
            if (!u) return;
            const d = ((this.unionWeb() || { rules: { list: {} } }).rules.list[u.id]) || {};
            if (calm) calm.union = null;
            else this.combat.union = null;
            this.out.push({ type: 'union', union: u.id, active: false });
            this.say(d.endSay || `${d.name || 'The demon'} lets go of you. You are yourself again.`, { notice: 'skill' });
        }

        /** Out of a fight: end the union when the calm clock passes its time (actionCalmTick calls this). */
        unionCalmTick() {
            const calm = this.world && this.world.calm;
            if (!calm || !calm.union || this.mode === 'combat' || calm.now < calm.union.endsAt) return false;
            this.endUnion();
            return true;
        }

        /** An action fight starts: a union you called out of it comes along with its time left, and so does the cooldown. */
        unionEnterFight() {
            const calm = this.world && this.world.calm;
            const rt = this.combat && this.combat.rt;
            if (!calm || !rt) return;
            const u = calm.union;
            if (u && u.endsAt > calm.now) this.combat.union = { id: u.id, endsAt: rt.now + (u.endsAt - calm.now) };
            rt.unionReadyAt = rt.now + Math.max(0, (calm.unionReadyAt || 0) - calm.now);
            calm.union = null;
        }

        /** An action fight ends (`c`, the fight that was): the union runs on out of it, and its cooldown keeps counting. */
        unionLeaveFight(c, { fell = false } = {}) {
            const rt = c && c.rt;
            if (!rt || !this.world) return;
            const calm = this.actionCalm();
            calm.unionReadyAt = calm.now + Math.max(0, (rt.unionReadyAt || 0) - rt.now);
            const u = c.union;
            if (!u || u.turns) return;
            if (fell || u.endsAt <= rt.now) {
                const d = ((this.unionWeb() || { rules: { list: {} } }).rules.list[u.id]) || {};
                this.out.push({ type: 'union', union: u.id, active: false });
                if (fell) this.say(`${d.name || 'The demon'} lets go of you as you fall.`, { notice: 'skill' });
                return;
            }
            calm.union = { id: u.id, endsAt: calm.now + (u.endsAt - rt.now) };
        }

        /** Called as fight time passes (tick) and each turn: end the union when its time is up. */
        unionTick() {
            const u = this.combat && this.combat.union;
            if (!u || this.mode !== 'combat') return;
            const rt = this.combat.rt;
            if (u.turns) { if (!this.timersOf(this.player.id, 'union_active').length) this.endUnion(); return; }
            if (rt && rt.now >= u.endsAt) this.endUnion();
        }

        /** Pure: why you can't choose this demon right now, or null. You can choose any time you aren't merged. */
        unionChooseProblem(input) {
            const w = this.unionWeb();
            if (!w) return { code: 'NO_UNION', message: 'You have no contracts.' };
            const id = this.unionKey(input);
            const d = w.rules.list[id];
            if (!d) return { code: 'UNKNOWN_UNION', message: `There is no demon '${input}'.` };
            if (!this.hasStoryFlag(d.contract)) return { code: 'NO_CONTRACT', message: `You hold no contract with ${d.name}.` };
            const now = this.activeUnion();
            if (now && now !== id) return { code: 'ALREADY_IN_UNION', message: `You are one with ${w.rules.list[now].name}; choose again when the union ends.` };
            return null;
        }

        /** Choose the demon you will merge with (one you hold a contract with). In a fight or out of one. */
        equipUnion(input) {
            const refuse = this.mode === 'combat' ? this.refuseCombat.bind(this) : this.refuse.bind(this);
            const problem = this.unionChooseProblem(input);
            if (problem) { refuse(problem.code, problem.message); return; }
            const w = this.unionWeb();
            const id = this.unionKey(input);
            const d = w.rules.list[id];
            this.unionState().equipped = id;
            this.say(`${d.name}, ${d.title}, will answer when you call the union.`, { notice: 'skill' });
        }

        /** Put a held Qliphoth aspect in a resonance slot (0-based), or clear it with null. Any time you aren't merged. */
        setResonance(slot, input) {
            const w = this.unionWeb();
            const refuse = this.mode === 'combat' ? this.refuseCombat.bind(this) : this.refuse.bind(this);
            if (!w) { refuse('NO_UNION', 'You have no contracts.'); return; }
            if (this.activeUnion()) { refuse('ALREADY_IN_UNION', 'The resonance is set while you are merged; change it when the union ends.'); return; }
            const st = this.unionState();
            const n = st.resonance.length;
            if (!Number.isInteger(slot) || slot < 0 || slot >= n) { refuse('INVALID_SLOT', `Resonance slots are 1 to ${n}.`); return; }
            if (input == null || input === '') { st.resonance[slot] = null; this.say(`Resonance slot ${slot + 1} cleared.`); return; }
            const id = String(input).trim().toLowerCase();
            const d = (w.rules.resonance || {})[id];
            if (!d) { refuse('UNKNOWN_ASPECT', `There is no aspect '${input}' that resonates.`); return; }
            if (!this.hasStoryFlag(d.flag)) { refuse('ASPECT_NOT_HELD', `You don't hold the ${d.name} aspect.`); return; }
            const other = st.resonance.indexOf(id);
            if (other !== -1 && other !== slot) { refuse('ALREADY_RESONATING', `${d.name} already resonates in slot ${other + 1}.`); return; }
            st.resonance[slot] = id;
            this.say(`${d.name} resonates in slot ${slot + 1}: ${d.text || ''}`.trim(), { notice: 'skill' });
        }

        unionKey(input) {
            const w = this.unionWeb();
            const s = String(input || '').trim().toLowerCase();
            if (!w || !s) return s;
            for (const [id, d] of Object.entries(w.rules.list)) if (id === s || String(d.name).toLowerCase() === s) return id;
            return s;
        }

        /** Pure: the union panel for the front end (null without the class). */
        getUnion() {
            const w = this.unionWeb();
            if (!w || !this.player) return null;
            const st = this.player.union || { equipped: null, resonance: [] };
            const owned = this.unionContracts();
            const equipped = owned.includes(st.equipped) ? st.equipped : owned[0] || null;
            const active = this.activeUnion();
            const problem = this.unionActivateProblem();
            const rt = this.combat && this.combat.rt;
            const u = this.mode === 'combat' ? this.combat && this.combat.union : null;
            const cu = this.mode !== 'combat' ? this.calmUnion() : null;
            return {
                web: w.id, equipped, active, durationMs: this.unionTiming().durationSeconds * 1000, cooldownMs: this.unionTiming().cooldownSeconds * 1000, favor: this.unionTiming().favor,
                endsInMs: u && rt && !u.turns ? Math.max(0, u.endsAt - rt.now) : cu ? Math.max(0, cu.endsAt - this.world.calm.now) : null,
                enabled: !problem, ...(problem ? { reason: { code: problem.code, message: problem.message } } : {}),
                ...(problem && problem.readyInMs != null ? { readyInMs: problem.readyInMs } : {}),
                unions: Object.entries(w.rules.list).map(([id, d]) => ({ id, name: d.name, title: d.title || null, power: d.power || null, contract: owned.includes(id), skills: [...(d.skills || [])] })),
                resonance: ((st.resonance && st.resonance.length ? st.resonance : new Array(w.rules.resonanceSlots || 2).fill(null))).map((r) => r || null),
                aspects: this.resonanceOwned().map((id) => ({ id, name: w.rules.resonance[id].name, text: w.rules.resonance[id].text || '' }))
            };
        }

        /** The `union` option, in a fight or out of one (only while you hold a contract). */
        unionAvailability() {
            if (!this.unionWeb() || !this.unionContracts().length || (this.mode !== 'combat' && !this.calmUnionWorks())) return [];
            const p = this.unionActivateProblem();
            if (p && p.code === 'ALREADY_IN_UNION') return [];
            return [{ type: 'union', enabled: !p, ...(p ? { reason: { code: p.code, message: p.message } } : {}) }];
        }
    }

    UnionMethods.MOD_KEYS = MOD_KEYS;
    (ENSO.engineModules || (ENSO.engineModules = {})).union = UnionMethods;
    if (isNode) module.exports = UnionMethods;
})(typeof window !== 'undefined' ? window : globalThis);
