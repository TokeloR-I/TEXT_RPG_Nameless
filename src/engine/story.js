/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Story (Chapter One, CH1-01)
 * Design: docs/design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md ("Quest mechanics
 * and anti-soft-lock") and ENSO_CH1_CHARACTER_ITEMS_ECONOMY.md §A. Content is
 * data (src/story/chapter1.js); this file only runs it.
 *
 * this.story (null in the text game; created by enter_world) is plain JSON:
 *   { chapter, flags: [], quests: { id: { state, step } }, seen: [], claimed: [], dialogue, tracked }
 *   quest state  unseen -> available -> active -> complete   ('failed' only if data says so)
 *   seen         every story event so far ('talk:elian', 'defeat:road_goblins'...). A quest
 *                objective whose event already happened completes the moment it becomes
 *                current, so doing things "out of order" can never soft-lock a quest.
 *   claimed      once-only rewards ('quest:Q01', 'item:...'): XP and items are never paid twice,
 *                whatever is re-entered, re-read or re-talked.
 *   tracked      the active quests the player shows on the HUD tracker, at most TRACK_MAX (Tokelo,
 *                2026-11-04). A quest that starts while there's room is tracked on its own; the journal
 *                tracks and untracks with the track_quest action. Missing in older saves: then every
 *                active quest counts as tracked (up to TRACK_MAX) until the player changes it.
 *
 * Story events come from the world (src/engine/world.js and the world intents
 * below): talk, inspect, enter (a map), pickup, defeat (a world encounter),
 * build (Rook's homestead construction, when it lands) and flag.
 *
 * Dialogue is an engine waiting state, like combat's: while this.story.dialogue
 * is set, getAvailableActions() returns awaiting 'dialogue' with the lines and
 * choices, and only dialogue actions are accepted. A NORMAL goodbye (a choice
 * that ends the talk, or 'dialogue_leave') speaks the NPC's `farewell` line:
 * Shane's "Suffer!" (CD direction, exact text) lives in data, not here.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const ORDER = { unseen: 0, available: 1, active: 2, complete: 3, failed: 3 };
    const STORY_ACTIONS = new Set(['talk', 'dialogue_choice', 'dialogue_leave', 'world_inspect', 'world_enter', 'set_identity', 'black_flight', 'talk_crow', 'track_quest']);
    const TRACK_MAX = 4;                              // quests on the HUD tracker at once (Tokelo, 2026-11-04)
    const UNREACHABLE = 'The crow cannot reach that perch yet.';
    const NAME_MAX = 24;

    class StoryMethods {
        // =====================================================================
        // Lifecycle
        // =====================================================================
        storyContent() { return this.storyData || null; }

        /** enter_world: start the chapter (once per run). */
        storyBegin() {
            const data = this.storyContent();
            if (!data || this.story) return;
            this.story = { chapter: data.id, flags: [], quests: {}, seen: [], claimed: [], dialogue: null, tracked: [] };
            for (const id of Object.keys(data.quests)) this.story.quests[id] = { state: 'unseen', step: 0 };
            // A new game meets later chapters the normal way; catch-up steps are only for older saves (src/engine/save.js).
            for (const c of data.catchUp || []) this.story.claimed.push(`catchup:${c.id}`);
            this.applyStoryEffects((data.start && data.start.effects) || [], { quiet: true });
        }

        // =====================================================================
        // Conditions (pure). { flags: [], notFlags: [], quests: { Q01: 'complete' | 'active+' | ... } }
        // =====================================================================
        storyAllows(cond) {
            if (!cond) return true;
            const s = this.story;
            if (!s) return false;
            if (cond.flag && !s.flags.includes(cond.flag)) return false;
            if (cond.notFlag && s.flags.includes(cond.notFlag)) return false;
            // className: 'warrior' | ['mage', 'necromancer']: the player's base class (class-specific gifts)
            if (cond.className && !(this.player && [].concat(cond.className).includes(this.player.className))) return false;
            for (const f of cond.flags || []) if (!s.flags.includes(f)) return false;
            for (const f of cond.notFlags || []) if (s.flags.includes(f)) return false;
            for (const it of cond.items || []) if (!this.player || !this.player.inventory.includes(it)) return false;
            // has: { item: count }: carrying at least that many (a recipe's ingredients)
            for (const [it, n] of Object.entries(cond.has || {})) if (!this.player || this.player.inventory.filter((x) => x === it).length < n) return false;
            // notAny: [items]: carrying none of them
            if (cond.notAny && this.player && cond.notAny.some((it) => this.player.inventory.includes(it))) return false;
            for (const [id, want] of Object.entries(cond.quests || {})) {
                const st = (s.quests[id] || { state: 'unseen' }).state;
                if (want.endsWith('+') ? ORDER[st] < ORDER[want.slice(0, -1)] : st !== want) return false;
            }
            // Homestead state (src/engine/exploration.js): constructions built, and what a plot is doing.
            const home = (this.player && this.player.homestead) || { built: {}, plots: {} };
            for (const id of cond.built || []) if (!home.built || !home.built[id]) return false;
            for (const id of cond.notBuilt || []) if (home.built && home.built[id]) return false;
            for (const [id, want] of Object.entries(cond.plots || {})) if (this.plotState(id) !== want) return false;
            if (cond.any && !cond.any.some((c) => this.storyAllows(c))) return false;
            // questCount: { ids, min }: at least `min` of those quests complete (two households vouch for you)
            if (cond.questCount && this.questsDone(cond.questCount) < (cond.questCount.min ?? (cond.questCount.ids || []).length)) return false;
            return true;
        }
        /** 'empty' | 'growing' | 'tended' | 'ready' for a homestead plot (pure). 'tended': a crop growing on the clock
         *  that has had all the watering and weeding it can use (src/engine/exploration.js). */
        plotState(id) {
            const v = this.plotView(id);
            return !v ? 'empty' : v.ready ? 'ready' : v.canTend ? 'growing' : 'tended';
        }
        hasStoryFlag(flag) { return !!this.story && this.story.flags.includes(flag); }
        questState(id) { return this.story && this.story.quests[id] ? this.story.quests[id].state : 'unseen'; }

        // =====================================================================
        // Effects (the only way story data changes state)
        //   { flag } { unflag } { start: questId } { available: questId } { event: { type, id } }
        //   { item, key? } (once per key) { say } { removeItem }   conditions also take has: { item: count }
        //   { shop: merchantId } { construction: upgradeId }: show Rook's CH1-04/05 data (no rules here)
        //   { plant: { plot, seed } } { tend: plot } { harvest: plot } { craft: recipeId }: run the homestead
        //   rules themselves (src/engine/exploration.js), so a station's dialogue and the text commands share one path
        //   { legend: webId }: a legendary Skill Web opens to you, its heart free (src/engine/gaze.js)
        //   { rest: true }: a full night's rest (the homestead bed); { stash: true }: this conversation offers the stash
        //   any effect may carry `when` (a condition): it runs only if that holds right now (an ending that remembers
        //   which choice you made, without a branch node for every combination)
        // =====================================================================
        applyStoryEffects(effects, opts = {}) {
            for (const e of effects || []) {
                if (e.when && !this.storyAllows(e.when)) continue;
                // A flag can wake a dormant weapon you are wearing (itemDef `kindle`): its new stats are applied here.
                const worn = (e.flag || e.unflag) && this.player && this.player.equipment && this.equipmentModifiers ? this.equipmentModifiers() : null;
                if (e.flag && !this.story.flags.includes(e.flag)) this.story.flags.push(e.flag);
                if (e.unflag) this.story.flags = this.story.flags.filter((f) => f !== e.unflag);
                if (worn) this.reapplyEquipment(worn);
                if (e.available && this.questState(e.available) === 'unseen' && this.story.quests[e.available]) this.story.quests[e.available].state = 'available';
                if (e.say) this.say(e.say, { important: !!e.important });
                if (e.item) this.storyGiveItem(e.item, e.key || `item:${e.item}`);
                if (e.removeItem) { const i = this.player.inventory.indexOf(e.removeItem); if (i !== -1) this.player.inventory.splice(i, 1); }
                if (e.gold) this.storyGold(e.gold, e.key);
                if (e.shop) this.storyShop(e.shop);
                if (e.construction && this.story.dialogue) this.story.dialogue.construction = e.construction;
                if (e.construction) this.storyConstruction(e.construction);
                if (e.plant) this.plantCrop(String(e.plant.plot), String(e.plant.seed));
                if (e.tend) this.tendPlot(String(e.tend));
                if (e.harvest) this.harvestPlot(String(e.harvest));
                if (e.craft) this.craftRecipe(String(e.craft));
                if (e.rest) this.restAtHome();
                if (e.stash && this.story.dialogue) this.story.dialogue.stash = true;
                if (e.start) this.startQuest(e.start, opts);
                if (e.legend) this.awakenLegend(String(e.legend));
                if (e.event) this.storyEvent(e.event);
            }
        }

        /** What a merchant sells (Rook's shopDefinitions; buying is his `buy <shop> <item>` rule). */
        storyShop(id) {
            const stock = (((this.data.shopDefinitions || {})[id] || {}).stock) || {};
            const items = Object.entries(stock).filter(([, e]) => e && Number.isSafeInteger(e.buyPrice) && this.stockForPlayer(e));
            if (!items.length) { this.say('(Nothing is for sale here yet.)'); return; }
            if (this.story && this.story.dialogue) this.story.dialogue.shopId = id;
            this.say(`For sale: ${items.map(([name, e]) => `${name} (${e.buyPrice} Gold)`).join(', ')}.`);
            this.say(`(To buy: 'buy ${id} <item>'.)`);
        }

        /** A construction on Orin's ledger (Rook's constructionDefinitions; building is his `build <id>` rule). */
        storyConstruction(id) {
            const rule = (this.data.constructionDefinitions || {})[id];
            const p = this.player;
            if (p.homestead && p.homestead.built && p.homestead.built[id]) { this.say(`(Ledger: ${(rule && rule.name) || id} is done.)`); return; }
            if (!rule || !Number.isSafeInteger(rule.goldCost)) { this.say('(The ledger has no figures for this yet.)'); return; }
            const mats = Object.entries(rule.materials || {}).map(([m, n]) => `${n} ${m}`);
            this.say(`(Ledger: ${rule.name || id} costs ${rule.goldCost} Gold${mats.length ? ` and ${mats.join(', ')}` : ''}. To build: 'build ${id}'.)`);
        }

        storyGiveItem(item, key) {
            if (this.story.claimed.includes(key)) return false;
            this.story.claimed.push(key);
            this.player.inventory.push(item);
            this.say(`Received: ${item}.`, { important: true, notice: 'item' });
            return true;
        }

        // =====================================================================
        // Quests
        // =====================================================================
        startQuest(id, opts = {}) {
            const def = this.storyContent().quests[id];
            const q = this.story.quests[id];
            if (!def || !q || ORDER[q.state] >= ORDER.active) return;
            q.state = 'active';
            q.step = 0;
            this.autoTrack(id);
            if (!opts.quiet) this.say(`${def.kind === 'main' ? 'Quest' : 'Side quest'} started: ${def.title}`, { important: true, notice: 'quest' });
            this.announceObjective(id, opts);
            this.catchUpQuest(id);
        }

        currentObjective(id) {
            const def = this.storyContent().quests[id];
            const q = this.story.quests[id];
            return q && def && q.state === 'active' ? def.objectives[q.step] || null : null;
        }

        announceObjective(id, opts = {}) {
            const o = this.currentObjective(id);
            if (o && !opts.quiet) this.say(`Objective: ${o.text}`, { notice: 'objective' });
        }

        /** Has this objective's event already happened? A `quests` objective ({ type: 'quests', ids, count })
         *  is met once `count` of those quests are complete ("help five households"). An objective with `skipIf`
         *  counts as met while that condition holds (a second route made the step moot). */
        objectiveMet(o) {
            if (!o || !o.on) return false;
            // skipIf: another route made this step moot (the village vouched for you, so no evidence is needed).
            if (o.skipIf && this.storyAllows(o.skipIf)) return true;
            if (o.on.type === 'quests') return this.questsDone(o.on) >= (o.on.count || (o.on.ids || []).length);
            return this.story.seen.includes(`${o.on.type}:${o.on.id}`);
        }
        questsDone(on) { return (on.ids || []).filter((q) => this.questState(q) === 'complete').length; }

        /** The current objective's event may already have happened: complete it (and the next) now. */
        catchUpQuest(id) {
            for (let guard = 0; guard < 50; guard++) {
                const o = this.currentObjective(id);
                if (!this.objectiveMet(o)) return;
                this.advanceQuest(id);
            }
        }

        advanceQuest(id) {
            const def = this.storyContent().quests[id];
            const q = this.story.quests[id];
            const done = def.objectives[q.step];
            q.step++;
            this.applyStoryEffects(done.effects);
            if (q.step >= def.objectives.length) { this.completeQuest(id); return; }
            this.announceObjective(id);
        }

        completeQuest(id) {
            const def = this.storyContent().quests[id];
            const q = this.story.quests[id];
            q.state = 'complete';
            if (this.story.tracked) this.story.tracked = this.story.tracked.filter((t) => t !== id);
            const key = `quest:${id}`;
            const pay = !this.story.claimed.includes(key);
            if (pay) this.story.claimed.push(key);
            this.say(`${def.kind === 'main' ? 'Quest' : 'Side quest'} complete: ${def.title}${pay && def.xp ? ` (+${def.xp} XP)` : ''}`, { important: true, notice: 'quest' });
            if (pay && def.xp) this.addExperience(def.xp, { quiet: true });
            this.applyStoryEffects(def.onComplete);
            // A quest waiting on a count of quests (the Shamefield locals) may be done now.
            for (const [qid, qdef] of Object.entries(this.storyContent().quests)) {
                const o = this.currentObjective(qid);
                if (o && o.on && o.on.type === 'quests' && (o.on.ids || []).includes(id)) {
                    if (this.objectiveMet(o)) this.catchUpQuest(qid);
                    else this.say(`${qdef.title}: ${this.questsDone(o.on)}/${o.on.count || o.on.ids.length}`, { notice: 'quest' });
                }
            }
            if (!this.story.dialogue) this.maybePromptBranch();
        }

        /** The main quests are a chain. If the player has gone on ahead and does something a later main quest
         *  asks for, the quests before it complete (with their XP) so the story catches up instead of stalling
         *  (QA-36/39). */
        catchUpChain(ev) {
            const quests = this.storyContent().quests;
            const next = (id) => { const s = ((quests[id] && quests[id].onComplete) || []).find((e) => e.start); return s ? s.start : null; };
            const asks = (id) => quests[id].objectives.some((o) => o.on && o.on.type === ev.type && o.on.id === ev.id);
            const active = Object.keys(this.story.quests).find((id) => quests[id] && quests[id].kind === 'main' && this.story.quests[id].state === 'active');
            if (ev.type === 'enter' || !active || asks(active)) return;   // walking somewhere isn't doing a quest's step
            let target = null;
            for (let id = next(active), n = 0; id && quests[id] && quests[id].kind === 'main' && quests[id].xp > 0 && n < 20; id = next(id), n++) {
                if (asks(id)) { target = id; break; }
            }
            if (!target) return;
            for (let guard = 0; guard < 200; guard++) {
                // Starting a quest can catch it up by itself, so stop as soon as the target has started (QA-41).
                if (this.story.quests[target].state === 'active' || this.story.quests[target].state === 'complete') return;
                const cur = Object.keys(this.story.quests).find((id) => quests[id] && quests[id].kind === 'main' && this.story.quests[id].state === 'active');
                if (!cur || cur === target) return;
                this.advanceQuest(cur);
            }
        }

        /** Whether the player is with this merchant: talked to last, on this map, and (Shane) he's been recruited. */
        storyMerchantHere(shopId) {
            if (this.story.withMerchant !== shopId) return false;
            if (shopId === 'shane' && !this.hasStoryFlag('shane_recruited')) return false;
            return true;
        }

        /** Something happened in the world. Advances every active quest waiting for it, then any triggers. */
        storyEvent(ev) {
            if (!this.story || !ev || !ev.type || ev.id == null) return;
            const key = `${ev.type}:${ev.id}`;
            const first = !this.story.seen.includes(key);
            if (first) this.story.seen.push(key);
            this.catchUpChain(ev);
            for (const id of Object.keys(this.story.quests)) {
                const o = this.currentObjective(id);
                if (o && o.on && o.on.type === ev.type && o.on.id === ev.id) { this.advanceQuest(id); this.catchUpQuest(id); }
            }
            // A step another route made moot (skipIf) gives way as soon as anything happens.
            for (const id of Object.keys(this.story.quests)) {
                const o = this.currentObjective(id);
                if (o && o.skipIf && this.objectiveMet(o)) this.catchUpQuest(id);
            }
            if (!first) return;
            const triggers = this.storyContent().triggers || [];
            triggers.forEach((t, i) => {
                if (t.on.type !== ev.type || t.on.id !== ev.id || !this.storyAllows(t.if)) return;
                const tk = `trigger:${t.id || i}`;
                if (this.story.claimed.includes(tk)) return;
                this.story.claimed.push(tk);
                this.applyStoryEffects(t.effects);
            });
        }

        // =====================================================================
        // Dialogue
        // =====================================================================
        npcDef(id) { const d = this.storyContent(); return (d && d.npcs[id]) || null; }

        npcName(id) {
            if (id === 'you') return this.player.name;
            const npc = this.npcDef(id);
            return npc ? npc.name : id;
        }

        startTalk(npcId) {
            const npc = this.npcDef(npcId);
            if (!npc) { this.refuse('UNKNOWN_NPC', `There's no one called '${npcId}' here.`); return; }
            if (!this.storyAllows(npc.when)) { this.refuse('NOT_HERE', `${npc.name} isn't here.`); return; }
            if (!(npc.talk || []).some((t) => this.storyAllows(t.if))) { this.refuse('NOTHING_TO_SAY', `${npc.name} has nothing to say right now.`); return; }
            // The conversation is open from here: a quest this talk completes must not prompt the branch choice
            // until it ends. The opening node is chosen after the event, so it sees what the talk just completed.
            this.story.dialogue = { npcId, node: null };
            this.story.withMerchant = npcId;
            this.storyEvent({ type: 'talk', id: npcId });
            const entry = (npc.talk || []).find((t) => this.storyAllows(t.if));
            if (!entry) { this.story.dialogue = null; this.say(`${npc.name} has nothing more to say.`); this.maybePromptBranch(); return; }
            this.enterNode(npcId, entry.node);
        }

        /** Dialogue choices on offer now (pure). Every node has a way out. */
        dialogueChoices() {
            const d = this.story && this.story.dialogue;
            if (!d) return [];
            const node = this.npcDef(d.npcId).nodes[d.node];
            const list = (node.choices || []).map((c, i) => ({ c, i })).filter(({ c }) => this.storyAllows(c.if));
            const out = list.map(({ c, i }) => ({ choiceId: c.id || `c${i}`, text: c.text, ends: !c.to && !c.stay }));
            // On Orin's ledger, the construction is a choice too (QA-42).
            if (d.construction) {
                const rule = (this.data.constructionDefinitions || {})[d.construction], p = this.player;
                if (rule && !(p.homestead && p.homestead.built && p.homestead.built[d.construction])) {
                    out.unshift({ choiceId: `build:${d.construction}`, text: `${rule.verb || 'Build'} ${rule.name || d.construction} (${rule.goldCost ? `${rule.goldCost} Gold` : 'free'})`, ends: false });
                }
            }
            // At the homestead stash: one choice per thing you can put away, and per thing already in it.
            if (d.stash) {
                const stashed = this.stashContents();
                const away = [...new Set(this.player.inventory)].filter((i) => !this.stashBlock(i));
                const back = [...new Set(stashed)];
                const at = out.findIndex((c) => c.ends);
                out.splice(at === -1 ? out.length : at, 0,
                    ...away.map((i) => ({ choiceId: `stash:${i}`, text: `Put away ${this.itemName(i)}${this.countOf(this.player.inventory, i)}`, ends: false })),
                    ...back.map((i) => ({ choiceId: `unstash:${i}`, text: `Take out ${this.itemName(i)}${this.countOf(stashed, i)}`, ends: false })));
            }
            if (!out.some((c) => c.ends)) out.push({ choiceId: 'leave', text: 'Goodbye.', ends: true });
            return out;
        }

        enterNode(npcId, nodeId) {
            const npc = this.npcDef(npcId);
            const node = npc.nodes[nodeId];
            if (!node) throw new Error(`Dialogue node ${npcId}.${nodeId} is missing`);
            this.story.dialogue = { npcId, node: nodeId };
            for (const line of node.lines || []) this.sayLine(npcId, line);
            this.applyStoryEffects(node.effects);
            if (this.story.dialogue && this.story.dialogue.node === nodeId) this.showDialogueChoices();
        }

        sayLine(npcId, line) {
            const [who, text] = Array.isArray(line) ? line : [npcId, line];
            if (who === null || who === 'narration') { this.say(text); return; }
            this.say(`${this.npcName(who === 'npc' ? npcId : who)}: "${text}"`);
        }

        showDialogueChoices() {
            this.dialogueChoices().forEach((c, i) => this.say(`  ${i + 1}. ${c.text}`));
        }

        chooseDialogue(choiceId) {
            const d = this.story.dialogue;
            const npc = this.npcDef(d.npcId);
            const offered = this.dialogueChoices();
            const pick = offered.find((c) => c.choiceId === choiceId);
            if (!pick) { this.refuse('INVALID_CHOICE', `That isn't one of the choices. Pick 1–${offered.length}.`); this.showDialogueChoices(); return; }
            if (pick.choiceId === 'leave') { this.endDialogue(true); return; }
            if (pick.choiceId.startsWith('build:')) {
                const id = pick.choiceId.slice(6);
                if (this.buildUpgrade(id)) this.storyEvent({ type: 'build', id });
                if (this.story.dialogue) this.showDialogueChoices();
                return;
            }
            if (pick.choiceId.startsWith('stash:') || pick.choiceId.startsWith('unstash:')) {
                const [verb, ...rest] = pick.choiceId.split(':');
                if (verb === 'stash') this.stashItem(rest.join(':')); else this.unstashItem(rest.join(':'));
                if (this.story.dialogue) this.showDialogueChoices();
                return;
            }
            const node = npc.nodes[d.node];
            const idx = (node.choices || []).findIndex((c, i) => (c.id || `c${i}`) === choiceId);
            const choice = node.choices[idx];
            delete d.shopId;
            this.say(`${this.player.name}: "${choice.say || choice.text}"`);
            this.applyStoryEffects(choice.effects);
            if (!this.story.dialogue) return;               // an effect closed it
            if (choice.to) this.enterNode(d.npcId, choice.to);
            else if (choice.stay) this.showDialogueChoices();
            else this.endDialogue(choice.end !== 'interrupt');
        }

        /** normal: a goodbye (the NPC's farewell line plays). Not normal: an interruption (no farewell). */
        endDialogue(normal) {
            const d = this.story.dialogue;
            if (!d) return;
            const npc = this.npcDef(d.npcId);
            this.story.dialogue = null;
            if (normal && npc.farewell) this.say(`${npc.name}: "${npc.farewell}"`, { important: true });
            this.maybePromptBranch();
        }

        // =====================================================================
        // Identity (CH1-02): name and a cosmetic appearance preset. No stat effect.
        // =====================================================================
        /** Normalised name, or { error } . Blank -> the chapter's lore-neutral default. */
        cleanName(raw) {
            const data = this.storyContent();
            // eslint-disable-next-line no-control-regex
            const text = String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, '').normalize('NFC').trim().replace(/\s+/g, ' ');
            if (!text) return { name: (data && data.defaultName) || 'The Wanderer' };
            if (Array.from(text).length > NAME_MAX) return { error: `Names can be at most ${NAME_MAX} characters.` };
            return { name: text };
        }

        setIdentity(a) {
            const p = this.player;
            if (!p) { this.refuse('WRONG_MODE', 'Choose a class first.'); return; }
            const data = this.storyContent();
            const looks = (data && data.appearances) || [];
            if (a.appearance != null && !(Number.isInteger(a.appearance) && a.appearance >= 0 && a.appearance < looks.length)) {
                this.refuse('INVALID_APPEARANCE', `Choose an appearance from 1 to ${looks.length}.`); return;
            }
            if (a.name !== undefined) {
                const n = this.cleanName(a.name);
                if (n.error) { this.refuse('INVALID_NAME', n.error); return; }
                p.name = n.name;
            }
            if (a.appearance != null) p.appearance = a.appearance;
            this.say(`You are ${p.name}.`);
        }

        // =====================================================================
        // Actions (src/engine/actions.js perform() hands these over)
        // =====================================================================
        isStoryAction(type) { return STORY_ACTIONS.has(type); }

        /** While a conversation is open, only dialogue actions are accepted. Returns true if handled. */
        performStory(a) {
            const s = this.story;
            if (a.type === 'black_flight' && s) {                 // refused with its own reason in every state
                const block = this.flightBlock();
                if (block) { this.refuse(block.code, block.message); if (s.dialogue) this.showDialogueChoices(); return true; }
            }
            if (s && s.dialogue) {
                if (a.type === 'dialogue_choice') { this.chooseDialogue(String(a.choiceId)); return true; }
                if (a.type === 'dialogue_leave') { this.endDialogue(true); return true; }
                if (a.type === 'sell' && a.shopId === s.dialogue.shopId) { this.sellItem(a.shopId, String(a.item || '')); return true; }
                if (a.type === 'buy' && a.shopId === s.dialogue.shopId) { this.buyItem(a.shopId, String(a.item || '')); return true; }
                if (a.type === 'describe') return false;
                this.refuse('WRONG_MODE', 'Finish the conversation first.');
                this.showDialogueChoices();
                return true;
            }
            if (!STORY_ACTIONS.has(a.type)) return false;
            if (a.type === 'set_identity') { this.setIdentity(a); return true; }
            if (!s) { this.refuse('WRONG_MODE', 'Not now.'); return true; }
            if (this.mode !== 'explore') { this.refuse('WRONG_MODE', 'Not now.'); return true; }
            switch (a.type) {
                case 'talk': this.startTalk(String(a.npcId || '')); return true;
                case 'world_inspect': this.storyEvent({ type: 'inspect', id: String(a.objectId || '') }); return true;
                case 'world_enter': s.at = String(a.mapId || ''); s.withMerchant = null; this.storyEvent({ type: 'enter', id: s.at }); return true;
                case 'black_flight': this.blackFlight(String(a.anchorId || '')); return true;
                case 'talk_crow': this.startTalk('crow'); return true;
                case 'track_quest': this.trackQuest(String(a.questId || ''), a.track); return true;
                case 'dialogue_choice': case 'dialogue_leave': this.refuse('WRONG_MODE', "You aren't talking to anyone."); return true;
                default: return false;
            }
        }

        /** Availability while talking (pure). */
        dialogueAvailability() {
            const d = this.story.dialogue;
            const npc = this.npcDef(d.npcId);
            const node = npc.nodes[d.node];
            const actions = this.dialogueChoices().map((c) => ({ type: 'dialogue_choice', choiceId: c.choiceId, text: c.text, ends: c.ends, enabled: true }));
            actions.push({ type: 'dialogue_leave', enabled: true, farewell: npc.farewell || null });
            const shopId = d.shopId;
            const shop = shopId && (this.data.shopDefinitions || {})[shopId];
            const goods = shop ? Object.entries(shop.stock || {}).filter(([, entry]) => this.stockForPlayer(entry)).map(([item, entry]) => {
                const block = this.purchaseBlock(shopId, item);
                return { type: 'buy', shopId, item, price: entry.buyPrice,
                    remaining: (this.player.shopStock || {})[`${shopId}:${item}`] ?? entry.quantity,
                    owned: this.player.inventory.filter((name) => name === item).length + Object.values(this.player.equipment || {}).filter((name) => name === item).length,
                    // Equipment shows its stats (what it does for you), everything else its flavour line.
                    description: (this.data.itemDefinitions[item] || {}).slot ? this.itemDetails(item) : (this.data.itemDefinitions[item] || {}).description || '',
                    enabled: !block, ...(block ? { reason: block } : {}) };
            }) : [];
            const selling = shop ? [...new Set(this.player.inventory)].map(item => {
                const reason = this.sellBlock(shopId, item), def = this.itemDef(item);
                return { type: 'sell', shopId, item, name: this.itemName(item), price: def?.sellPrice || 0,
                    owned: this.player.inventory.filter(id => id === item).length, description: this.itemDetails(item), enabled: !reason, ...(reason ? { reason } : {}) };
            }) : [];
            actions.push(...goods, ...selling);
            return {
                shop: shop ? { shopId, gold: this.player.gold, goods, selling } : null,
                dialogue: {
                    npcId: d.npcId, name: npc.name, title: npc.title || null,
                    lines: (node.lines || []).map((l) => {
                        const [who, text] = Array.isArray(l) ? l : [d.npcId, l];
                        return { speaker: who === null || who === 'narration' ? null : this.npcName(who === 'npc' ? d.npcId : who), text };
                    })
                },
                actions
            };
        }

        // =====================================================================
        // Journal (pure)
        // =====================================================================
        getJournal() {
            const data = this.storyContent();
            if (!this.story || !data) return null;
            const quests = [];
            const tracked = this.trackedQuestIds();
            for (const [id, def] of Object.entries(data.quests)) {
                const q = this.story.quests[id];
                if (q.state === 'unseen') continue;
                const count = (o) => (o.on && o.on.type === 'quests' && q.state === 'active' ? ` (${this.questsDone(o.on)}/${o.on.count || o.on.ids.length})` : '');
                const steps = def.objectives.map((o, i) => ({ text: o.text + (i === q.step ? count(o) : ''), done: q.state === 'complete' || i < q.step, current: q.state === 'active' && i === q.step }));
                const cur = this.currentObjective(id);
                quests.push({
                    id, title: def.title, kind: def.kind, state: q.state, summary: def.summary || '', xp: def.xp || 0,
                    tracked: q.state === 'active' && tracked.includes(id),
                    objective: cur ? { text: cur.text + count(cur), marker: cur.marker || null } : null,
                    steps: steps.filter((st) => st.done || st.current)
                });
            }
            const rank = (q) => (q.state === 'active' ? 0 : q.state === 'available' ? 1 : 2) * 10 + (q.kind === 'main' ? 0 : 1);
            quests.sort((a, b) => rank(a) - rank(b));
            return { chapter: data.title, quests };
        }

        // =====================================================================
        // Quest tracker (pure reads; trackQuest is the one write). Tokelo, 2026-11-04: up to TRACK_MAX
        // active quests on the HUD at once, and the player picks which in the journal.
        // =====================================================================
        /** Active quests in journal order (main first). */
        activeQuestIds() {
            const data = this.storyContent();
            if (!this.story || !data) return [];
            const ids = Object.keys(data.quests).filter((id) => this.questState(id) === 'active');
            return ids.filter((id) => data.quests[id].kind === 'main').concat(ids.filter((id) => data.quests[id].kind !== 'main'));
        }
        /** The tracked quest ids, active only. An older save without a list tracks the first TRACK_MAX active. */
        trackedQuestIds() {
            const active = this.activeQuestIds();
            if (!this.story || !Array.isArray(this.story.tracked)) return active.slice(0, TRACK_MAX);
            const set = new Set(this.story.tracked);
            return active.filter((id) => set.has(id)).slice(0, TRACK_MAX);
        }
        /** Give an older save its own list before the first change. */
        ensureTrackedList() {
            if (!Array.isArray(this.story.tracked)) this.story.tracked = this.trackedQuestIds();
            else this.story.tracked = this.trackedQuestIds();             // drop finished or unknown ids
            return this.story.tracked;
        }
        /** A newly started quest goes on the tracker while there's room, so a new side quest is never invisible. */
        autoTrack(id) {
            const list = this.ensureTrackedList();
            if (!list.includes(id) && list.length < TRACK_MAX) list.push(id);
        }
        /** Why the player can't track/untrack this quest, or null (pure). `track` true/false, or undefined to toggle. */
        trackBlock(questId, track) {
            const data = this.storyContent();
            if (!this.story || !data) return { code: 'WRONG_MODE', message: 'You have no journal yet.' };
            if (!data.quests[questId] || this.questState(questId) === 'unseen') return { code: 'UNKNOWN_QUEST', message: "That quest isn't in your journal." };
            if (this.questState(questId) !== 'active') return { code: 'QUEST_NOT_ACTIVE', message: 'Only active quests can be tracked.' };
            const tracked = this.trackedQuestIds();
            const on = track === undefined || track === null ? !tracked.includes(questId) : !!track;
            if (on && !tracked.includes(questId) && tracked.length >= TRACK_MAX) {
                return { code: 'TRACK_FULL', message: `You can track up to ${TRACK_MAX} quests. Untrack one first.` };
            }
            return null;
        }
        trackQuest(questId, track) {
            const block = this.trackBlock(questId, track);
            if (block) { this.refuse(block.code, block.message); return; }
            const list = this.ensureTrackedList();
            const on = track === undefined || track === null ? !list.includes(questId) : !!track;
            const title = this.storyContent().quests[questId].title;
            if (on && !list.includes(questId)) list.push(questId);
            if (!on) this.story.tracked = list.filter((t) => t !== questId);
            this.say(on ? `Tracking: ${title}` : `No longer tracking: ${title}`);
        }
        /** Journal track toggles (pure): one per active quest, the same check as trackQuest(). */
        trackAvailability() {
            if (!this.story || !this.storyContent()) return [];
            const tracked = this.trackedQuestIds();
            return this.activeQuestIds().map((questId) => {
                const on = tracked.includes(questId);
                const block = this.trackBlock(questId, !on);
                return { type: 'track_quest', questId, track: !on, tracked: on, enabled: !block, ...(block ? { reason: block } : {}) };
            });
        }

        /** Every tracked quest's objective, for the HUD tracker (main quests first). */
        trackedObjectives() {
            const j = this.getJournal();
            if (!j) return [];
            return j.quests.filter((x) => x.tracked && x.objective)
                .map((q) => ({ questId: q.id, title: q.title, kind: q.kind, text: q.objective.text, marker: q.objective.marker }));
        }
        /** The first tracked objective (the map marker and older HUDs). */
        trackedObjective() {
            return this.trackedObjectives()[0] || null;
        }

        showJournal() {
            const j = this.getJournal();
            if (!j) { this.say('You have no journal yet. (The journal belongs to the world: open world.html.)'); return; }
            this.say(`--- Journal: ${j.chapter} ---`, { important: true });
            if (!j.quests.length) this.say('Nothing yet.');
            for (const q of j.quests) {
                const tag = q.state === 'complete' ? '✓' : q.state === 'available' ? '·' : '›';
                this.say(`${tag} ${q.title}${q.kind === 'main' ? '' : ' (side)'}${q.objective ? `: ${q.objective.text}` : ''}`);
            }
        }

        // =====================================================================
        // Black Flight (Nahemoth's first aspect; docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md)
        //   Anchors are story data (chapter.anchors: { id: { name, region, map, spawn, requires? } }).
        //   An anchor is attuned by the flag 'anchor:<id>' (set by visiting its marked place, or by the seal for
        //   the homestead). Travel needs the flag 'aspect_nahemoth'. The engine checks the rules and says where
        //   to go with a { type: 'world.travel', map, spawn, anchorId } event; the world moves the player and
        //   reports the arrival with world_enter, exactly like walking in.
        // =====================================================================
        hasAspect() { return this.hasStoryFlag('aspect_nahemoth'); }

        /** Why Black Flight can't be used at all right now, or null (pure). */
        flightBlock() {
            if (!this.hasAspect()) return { code: 'NO_ASPECT', message: 'You have no way to travel like that.' };
            if (this.mode === 'combat') return { code: 'IN_COMBAT', message: 'Not in the middle of a fight. The crow will not carry a coward, or a corpse.' };
            if (this.story.dialogue) return { code: 'IN_DIALOGUE', message: 'Finish the conversation first.' };
            if (this.mode !== 'explore') return { code: 'WRONG_MODE', message: 'Not now.' };
            return null;
        }

        /** Black Flight options (pure): one per attuned anchor, none before the aspect. */
        flightAvailability() {
            const anchors = (this.storyContent() || {}).anchors || {};
            if (!this.story || !this.hasAspect()) return [];
            const block = this.flightBlock();
            const out = [];
            for (const [anchorId, an] of Object.entries(anchors)) {
                if (!this.hasStoryFlag(`anchor:${anchorId}`)) continue;     // never list places the player hasn't attuned
                const here = this.story.at === an.map;
                const opt = { type: 'black_flight', anchorId, name: an.name, region: an.region || null, here, enabled: true };
                const fail = block || (here ? { code: 'HERE', message: `You are already at ${an.name}.` } : null)
                    || (!this.storyAllows(an.requires) ? { code: 'UNREACHABLE', message: UNREACHABLE } : null);
                if (fail) { opt.enabled = false; opt.reason = fail; }
                out.push(opt);
            }
            return out;
        }

        blackFlight(anchorId) {
            const an = ((this.storyContent() || {}).anchors || {})[anchorId];
            if (!an || !this.hasStoryFlag(`anchor:${anchorId}`)) { this.refuse('UNKNOWN_ANCHOR', "The crow doesn't know that place. You have to have been there."); return; }
            const opt = this.flightAvailability().find((o) => o.anchorId === anchorId);
            if (!opt.enabled) { this.refuse(opt.reason.code, opt.reason.message); return; }
            this.say(`Black feathers close around you. When they scatter, you are at ${an.name}.`, { important: true });
            this.out.push({ type: 'world.travel', anchorId, map: an.map, spawn: an.spawn });
        }

        /** The crow's own talk option (pure): only once the aspect is owned. */
        crowAvailability() {
            if (!this.story || !this.hasAspect()) return [];
            const opt = { type: 'talk_crow', enabled: true };
            if (this.mode !== 'explore') { opt.enabled = false; opt.reason = { code: 'WRONG_MODE', message: 'Not now.' }; }
            return [opt];
        }

        /** getState().story (only when a chapter is running, so text-game state is unchanged). */
        storyState() {
            if (!this.story) return undefined;
            return { chapter: this.story.chapter, flags: [...this.story.flags], talking: this.story.dialogue ? this.story.dialogue.npcId : null, objective: this.trackedObjective(), tracked: this.trackedObjectives() };
        }
    }

    StoryMethods.NAME_MAX = NAME_MAX;
    StoryMethods.TRACK_MAX = TRACK_MAX;
    (ENSO.engineModules || (ENSO.engineModules = {}))['story'] = StoryMethods;
    if (isNode) module.exports = StoryMethods;
})(typeof window !== 'undefined' ? window : globalThis);
