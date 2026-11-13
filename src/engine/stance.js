/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Legendary stances and bond (Fenrir's Heir)
 * docs/design/FENRIRS_HEIR_LEGENDARY_CLASS_DESIGN.md (Tokelo 2026-11-13), numbers in
 * skillWeb.legendaryWebs.<id>.stances (src/data.js). Data, no names in code: any legendary web
 * with `stances` works the same way.
 *
 *   - You stand in one stance of the web at a time. Switching is manual (`switch_stance`), free out of a
 *     fight and on a cooldown in one (seconds on the fight clock, or turns as a combat.timers entry).
 *   - A stance with `bond: true` grows its own bond (0..max) for every second you fight in it. The other
 *     bonded stances fade slowly while it grows. A stance without a bond (the neutral one) holds both.
 *   - Bond persists between fights and in the save (player.stance). Its tier gives the stance's `mods`
 *     (damage, defence, speed), read where meals are read (skills.js, kitchen.js playerMoveMult).
 *   - Skills with `stance: '<id>'` can only be used in that stance (refusal WRONG_STANCE, same check in
 *     useSkill and skillAvailability).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const MOD_KEYS = ['damage', 'defence', 'speed'];

    class StanceMethods {
        /** Pure: the legendary web with stances that you hold, as { id, rules }, or null. */
        stanceWeb() {
            const webs = ((this.data.skillWeb || {}).legendaryWebs) || {};
            for (const [id, leg] of Object.entries(webs)) {
                if (leg.stances && this.webOwns && this.webOwns(`heart.${id}`)) return { id, rules: leg.stances };
            }
            return null;
        }

        /** The player's stance state for the web, made on first use (a save from before it, or a heart owned by a cheat). */
        stanceState() {
            const w = this.stanceWeb();
            const p = this.player;
            if (!w || !p) return null;
            if (!p.stance || p.stance.web !== w.id) {
                const bond = {};
                for (const [id, d] of Object.entries(w.rules.list)) if (d.bond) bond[id] = 0;
                p.stance = { web: w.id, active: w.rules.first || Object.keys(w.rules.list)[0], bond };
            }
            return p.stance;
        }

        /** Pure: the stance you stand in (the web's `first` before you ever chose one), or null. */
        activeStance() {
            const w = this.stanceWeb();
            if (!w || !this.player) return null;
            return this.player.stance && this.player.stance.web === w.id ? this.player.stance.active : (w.rules.first || Object.keys(w.rules.list)[0]);
        }

        /** Pure: the bond tier a stance has reached (null below the first). */
        stanceTier(id) {
            const w = this.stanceWeb();
            const st = this.player && this.player.stance;
            if (!w || !st || !st.bond || st.bond[id] == null) return null;
            const tiers = (w.rules.list[id] || {}).tiers || [];
            let tier = null;
            for (const t of tiers) if (st.bond[id] >= t.at) tier = t;
            return tier;
        }

        /** Pure: one stance modifier for this combatant (the player's active stance at its bond tier), e.g. 'damage'. */
        stanceMod(c, key) {
            if (!c || !c.isPlayer || c !== this.player || !this.player.stance || !this.stanceWeb()) return 0;
            const tier = this.stanceTier(this.activeStance());
            return tier && tier.mods ? Number(tier.mods[key]) || 0 : 0;
        }

        /** Why a skill can't be used in your current stance, or null. useSkill and skillAvailability share it. */
        stanceProblem(skill) {
            if (!skill || !skill.stance) return null;
            const w = this.stanceWeb();
            if (!w || this.activeStance() === skill.stance) return null;
            const d = w.rules.list[skill.stance] || {};
            return { code: 'WRONG_STANCE', message: `${skill.name || 'That skill'} needs the ${d.name || skill.stance} stance.` };
        }

        /** Pure: why you can't switch to this stance right now, or null. Also gives `readyInMs` / `readyInTurns`. */
        stanceSwitchProblem(id) {
            const w = this.stanceWeb();
            if (!w) return { code: 'NO_STANCES', message: 'You have no stances to switch between.' };
            const def = w.rules.list[id];
            if (!def) return { code: 'UNKNOWN_STANCE', message: `There is no stance '${id}'. (${Object.values(w.rules.list).map((d) => d.name).join(', ')})` };
            if (this.activeStance() === id) return { code: 'ALREADY_IN_STANCE', message: `You are already in the ${def.name} stance.` };
            if (this.mode !== 'combat' || !this.combat) return null;
            if (this.player.statusEffects.some((s) => s.type === 'skip_turn')) return { code: 'STUNNED', message: "You're stunned and can't change stance." };
            const rt = this.combat.rt;
            if (rt && (this.rtActive && this.rtActive())) {
                if ((rt.stanceReadyAt || 0) > rt.now) {
                    const ms = rt.stanceReadyAt - rt.now;
                    return { code: 'STANCE_COOLDOWN', message: `You can change stance in ${(ms / 1000).toFixed(1)}s.`, readyInMs: ms };
                }
                return null;
            }
            const t = this.timersOf(this.player.id, 'stance_cooldown')[0];
            if (t) return { code: 'STANCE_COOLDOWN', message: `You can change stance in ${t.remaining} turn${t.remaining === 1 ? '' : 's'}.`, readyInTurns: t.remaining };
            return null;
        }

        /** The rule: change stance. Free out of a fight; in one it doesn't use your turn but starts the cooldown. */
        switchStance(id) {
            const refuse = this.mode === 'combat' ? this.refuseCombat.bind(this) : this.refuse.bind(this);
            const key = this.stanceKey(id);
            const problem = this.stanceSwitchProblem(key);
            if (problem) { refuse(problem.code, problem.message); return; }
            this.setStance(key);
            if (this.mode === 'combat' && this.combat) {
                const rules = this.stanceWeb().rules;
                const rt = this.combat.rt;
                if (rt && this.rtActive && this.rtActive()) rt.stanceReadyAt = rt.now + Math.round((rules.switchCooldownSeconds || 0) * 1000);
                else if (rules.switchCooldownTurns) this.addTimer(this.player, 'stance_cooldown', rules.switchCooldownTurns, { replace: true });
            }
        }

        /** Set the active stance (the switch rule, and the unlock's first choice through the `stance` story effect). */
        setStance(id) {
            const st = this.stanceState();
            const w = this.stanceWeb();
            if (!st || !w || !w.rules.list[id]) return false;
            st.active = id;
            const d = w.rules.list[id];
            this.out.push({ type: 'stance', stance: id });
            this.say(d.say || `You take the ${d.name} stance.`, { notice: 'skill' });
            return true;
        }

        /** A stance id from what the player typed (id or name, any case, Sköll or Skoll). */
        stanceKey(input) {
            const w = this.stanceWeb();
            const s = String(input || '').trim().toLowerCase();
            if (!w || !s) return s;
            const plain = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o');
            for (const [id, d] of Object.entries(w.rules.list)) if (id === s || plain(d.name) === plain(s) || plain(id) === plain(s)) return id;
            return s;
        }

        /**
         * `ms` of fighting in your current stance: its bond grows (faster with trait mods.bondRate) and the other
         * bonded stances fade. The neutral stance does neither. Called by tick() in live fights and once per player
         * opportunity in turn fights (secondsPerTurn).
         */
        stanceAccrue(ms) {
            if (!(ms > 0) || !this.stanceWeb()) return;
            const st = this.stanceState();
            const rules = this.stanceWeb().rules;
            const b = rules.bond || {};
            const active = rules.list[st.active] || {};
            if (!active.bond) return;
            const max = b.max || 100;
            const rate = 1 + (this.player.traits || []).reduce((s, t) => s + ((t.mods && Number(t.mods.bondRate)) || 0), 0);
            const before = this.stanceTier(st.active);
            st.bond[st.active] = Math.min(max, (st.bond[st.active] || 0) + (b.gainPerSecond || 0) * rate * ms / 1000);
            for (const id of Object.keys(st.bond)) if (id !== st.active) st.bond[id] = Math.max(0, st.bond[id] - (b.fadePerSecond || 0) * ms / 1000);
            const after = this.stanceTier(st.active);
            if (after && after !== before) this.say(`${active.name} bond ${after.at}%: ${after.text || ''}`.trim(), { notice: 'skill' });
        }

        /** Pure: the stance panel for the front end (null without a stance web). */
        getStance() {
            const w = this.stanceWeb();
            if (!w) return null;
            const st = { active: this.activeStance(), bond: (this.player.stance && this.player.stance.web === w.id && this.player.stance.bond) || {} };
            const stances = Object.entries(w.rules.list).map(([id, d]) => {
                const tier = d.bond ? this.stanceTier(id) : null;
                const problem = this.stanceSwitchProblem(id);
                return {
                    id, name: d.name, title: d.title || null, active: st.active === id, bonded: !!d.bond,
                    bond: d.bond ? Math.floor(st.bond[id] || 0) : null, tier: tier ? tier.at : 0, mods: tier ? { ...tier.mods } : {},
                    enabled: !problem, ...(problem ? { reason: { code: problem.code, message: problem.message } } : {}),
                    ...(problem && problem.readyInMs != null ? { readyInMs: problem.readyInMs } : {})
                };
            });
            return { web: w.id, active: st.active, max: (w.rules.bond || {}).max || 100, stances };
        }

        /** The switch_stance options (only while you hold a stance web). */
        stanceAvailability() {
            const v = this.getStance();
            if (!v) return [];
            return v.stances.filter((s) => !s.active).map((s) => ({ type: 'switch_stance', stance: s.id, enabled: s.enabled, ...(s.reason ? { reason: s.reason } : {}) }));
        }
    }

    StanceMethods.MOD_KEYS = MOD_KEYS;
    (ENSO.engineModules || (ENSO.engineModules = {})).stance = StanceMethods;
    if (isNode) module.exports = StanceMethods;
})(typeof window !== 'undefined' ? window : globalThis);
