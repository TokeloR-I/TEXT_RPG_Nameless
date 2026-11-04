/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Gaze (legendary awakenings)
 * Tokelo (2026-11-04): the Fallen Seraphim legendary class opens when you stare at the robed statue in the
 * Kloster's inner courtyard for 120 seconds. At 60 s a halo lights over it; at 120 s six wings come out of the
 * statue and it speaks to you, and the Fallen Seraphim web opens (docs/design/SKILL_WEB.md, Legendary webs).
 *
 * Data: `gazeRules` in src/data.js, keyed by the world object's id (seconds, range, cone, the flag it sets and
 * the NPC that speaks). The world owns space: the action sim (src/action/sim.js) decides whether you are
 * standing still, close and facing the object, and hands the engine the calm time you spent doing it, the same
 * way it hands it calm time for pre-buffs (actionCalmTick). The engine owns the rule: it counts, lights the halo,
 * sets the story flag, starts the talk and opens the web. It never reads a timer.
 *
 *   gazeTick(id, ms)   id: the object you are gazing at this step, or null. Returns the events (like tick):
 *                      { type: 'gaze', id, stage: 'halo' | 'awake' | 'broken' } plus any text.
 *   gazeView(id)       pure: { ms, haloMs, wakeMs, halo, awake } for the front end to draw the halo and wings.
 *   awakenLegend(id)   the `legend` story effect: a free Skill Web point and the legendary heart, through the web.
 *
 * Progress is not saved: a reload starts the count again (a gaze is one sitting).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies them onto GameEngine.prototype.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    class GazeMethods {
        gazeRule(id) { return (id && (this.data.gazeRules || {})[id]) || null; }
        /** The object already woke (its flag is set). */
        gazeAwake(id) { const r = this.gazeRule(id); return !!r && !!this.hasStoryFlag && this.hasStoryFlag(r.flag); }

        /** Pure: how far a gaze at `id` has got, for drawing. */
        gazeView(id) {
            const r = this.gazeRule(id);
            if (!r) return null;
            const g = this.gazeState || { id: null, ms: 0 };
            const awake = this.gazeAwake(id);
            const ms = awake ? r.wakeSeconds * 1000 : g.id === id ? g.ms : 0;
            return { ms, haloMs: r.haloSeconds * 1000, wakeMs: r.wakeSeconds * 1000, halo: ms >= r.haloSeconds * 1000, awake };
        }

        /** One calm step of gazing at `id` (null: not gazing at anything). Returns the events. */
        gazeTick(id, ms) {
            const g = this.gazeState || (this.gazeState = { id: null, ms: 0 });
            const r = this.gazeRule(id);
            const calm = r && this.story && this.player && this.mode === 'explore' && !this.story.dialogue && !this.gazeAwake(id);
            if (!calm || (g.id && g.id !== id)) {
                if (g.id && g.ms > 0) {
                    const was = this.gazeRule(g.id);
                    if (was && g.ms >= was.haloSeconds * 1000) {
                        this.out.push({ type: 'gaze', id: g.id, stage: 'broken' });
                        this.say('You look away, and the ring of light over the statue fades.', { notice: 'quest' });
                    }
                    g.id = null; g.ms = 0;
                }
                if (!calm) return this.flush();
            }
            g.id = id;
            const before = g.ms;
            g.ms += Math.max(0, Number(ms) || 0);
            const haloMs = r.haloSeconds * 1000, wakeMs = r.wakeSeconds * 1000;
            if (before < haloMs && g.ms >= haloMs) {
                this.out.push({ type: 'gaze', id, stage: 'halo' });
                if (r.haloText) this.say(r.haloText, { notice: 'quest' });
            }
            if (g.ms >= wakeMs) {
                g.id = null; g.ms = 0;
                this.applyStoryEffects([{ flag: r.flag }]);
                this.storyEvent({ type: 'story', id: r.flag });
                this.out.push({ type: 'gaze', id, stage: 'awake' });
                if (r.talk) this.startTalk(r.talk);
            }
            return this.flush();
        }

        /** The `legend` story effect: the legendary web opens to you, its heart paid by the awakening itself, and its
         *  `gifts` (one skill from each pair of wings) owned free on top. Safe to run again: an older save that woke the
         *  statue before the gifts existed gets them through the story's catch-up. */
        awakenLegend(legId) {
            const web = this.skillWeb();
            const heart = web.nodes.get(`heart.${legId}`);
            if (!heart || !heart.legendary || !this.webState()) return;
            const key = `legend:${legId}`;
            if (!this.webOwns(heart.id) && !this.story.claimed.includes(key)) {
                const s = this.webState();
                s.bonusPoints = (s.bonusPoints || 0) + heart.cost;   // the gift: the heart costs you nothing
                this.story.claimed.push(key);
                const problem = this.webLearnProblem(heart.id, { ignoreMode: true });
                if (problem) { this.say(`(${problem.message})`); return; }
                this.webGain(heart);
            }
            if (!this.webOwns(heart.id)) return;
            const gifts = (heart.gifts || []).map((id) => web.nodes.get(id)).filter((n) => n && !this.webOwns(n.id));
            for (const n of gifts) this.webGain(n);   // free (webNodeFixed): no point, no level gate
            if (gifts.length) {
                const bar = this.ensureSkillBar ? this.ensureSkillBar() : null;   // onto the bar where there is room
                if (bar) for (const n of gifts) if (n.skill && !bar.includes(n.skill) && bar.indexOf(null) !== -1) bar[bar.indexOf(null)] = n.skill;
                this.say(`Open the Skill Web (Esc) to see the ${heart.label} web. Its first gifts are already yours.`, { notice: 'quest' });
            }
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {})).gaze = GazeMethods;
    if (isNode) module.exports = GazeMethods;
})(typeof window !== 'undefined' ? window : globalThis);
