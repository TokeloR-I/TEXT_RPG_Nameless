/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Dev cheats (testing powers without the story)
 *
 * Tokelo (2026-11-17): "dev or testing cheats to check some of these powers myself without going through the
 * entire story / quest". Every cheat is the `cheat` action ({ type: 'cheat', cheat, amount }), so the text game
 * (`cheat <name> <arg>`), the browser console (enso.act(...)) and the world's hidden Cheats tab (ui/world-ui.js)
 * share one path. The original cheats (add_xp, become_hollow_king, unlock_events, awaken_fenrir, bind_contract)
 * stay in actions.js; everything new is here.
 *
 * Saves stay safe: a cheat only changes fields a save already holds (level, gold, inventory, item records,
 * Skill Web nodes and bonus points, story flags, quest states, engine flags), through the same functions the
 * story uses wherever one exists, so nothing new needs a migration. Using any cheat sets flags.devCheats, so a
 * save that was cheated can be told apart in a bug report.
 *
 *   cheatCatalog()        pure: what the Cheats tab lists (webs, legends, unions, quests, item groups)
 *   devCheat(name, arg)   runs one cheat; returns false if `name` isn't one of these
 *
 * Toggles (flags.godMode, flags.oneHit) are read by damage() in skills.js.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    // Cheats that make sense mid-fight (the rest wait until the fight is over, like the Skill Web does).
    const IN_FIGHT = new Set(['god_mode', 'one_hit', 'full_heal', 'add_gold', 'give_item']);
    const NEEDS_STORY = new Set(['awaken_legend', 'pass_trial', 'bind_all_contracts', 'demonkore_favor', 'teach_leg_cramp', 'finish_quest', 'start_quest']);
    const DEV_CHEATS = new Set([...IN_FIGHT, ...NEEDS_STORY, 'set_level', 'web_points', 'learn_web', 'temper_weapon']);
    const MAX_LEVEL = 60;   // a sanity cap for the cheat only; the game itself has no level cap

    const toggle = (cur, arg) => { const a = String(arg == null ? '' : arg).toLowerCase(); return a === 'on' || a === '1' || a === 'true' ? true : a === 'off' || a === '0' || a === 'false' ? false : !cur; };
    const itemGroup = (d) => {
        if (d.slot === 'mainHand' || d.slot === 'offHand') return 'weapons';
        if (['head', 'bodyArmor', 'hands', 'feet'].includes(d.slot)) return 'armor';
        if (d.slot === 'accessory') return 'accessories';
        if (d.use === 'heal' || d.type === 'consumable') return 'food';
        if (d.type === 'material') return 'materials';
        if (d.type === 'quest') return 'quest';
        return 'other';
    };
    const ITEM_GROUPS = [['weapons', 'Weapons'], ['armor', 'Armor'], ['accessories', 'Accessories (signets, rings)'], ['food', 'Food, potions and healing'],
        ['materials', 'Materials and seeds'], ['quest', 'Quest items'], ['other', 'Other']];

    class CheatMethods {
        isDevCheat(name) { return DEV_CHEATS.has(name); }

        /** Pure: what the Cheats tab lists. */
        cheatCatalog() {
            const p = this.player;
            const web = this.skillWeb ? this.skillWeb() : null;
            const sw = this.data.skillWeb || {};
            const owned = (id) => !!(this.webOwns && this.webOwns(id));
            const left = (region) => (web ? web.list.filter((n) => n.region === region && !owned(n.id) && !n.taught).length : 0);
            const classes = Object.keys(this.data.basePlayerClasses || {}).filter((c) => web && web.list.some((n) => n.region === c));
            const legends = Object.entries(sw.legendaryWebs || {}).filter(([id]) => web && web.nodes.has(`heart.${id}`)).map(([id, leg]) => {
                const heart = web.nodes.get(`heart.${id}`);
                return { id, label: heart.label, open: owned(heart.id), flag: (leg.requires || {}).flag || null, stances: leg.stances && leg.stances.list ? Object.entries(leg.stances.list).map(([sid, st]) => ({ id: sid, name: st.name || sid, first: sid === leg.stances.first })).sort((x, y) => y.first - x.first) : null,
                    trial: leg.trial || null, trialPassed: !!(leg.trial && this.hasStoryFlag && this.hasStoryFlag(leg.trial.flag)), left: left(id) };
            });
            const unionDef = Object.values(sw.legendaryWebs || {}).find((l) => l.unions);
            const unions = unionDef ? Object.entries(unionDef.unions.list).map(([id, u]) => ({ id, name: u.name, title: u.title, bound: !!(this.hasStoryFlag && this.hasStoryFlag(u.contract)) })) : [];
            const story = this.storyContent ? this.storyContent() : null;
            const quests = story && this.story ? Object.entries(story.quests).map(([id, q]) => ({ id, title: q.title, kind: q.kind || 'side', state: this.questState(id) })) : [];
            const groups = {};
            for (const [id, d] of Object.entries(this.data.itemDefinitions || {})) (groups[itemGroup(d)] = groups[itemGroup(d)] || []).push(id);
            const main = p && p.equipment && p.equipment.mainHand;
            const md = main && this.itemDef(main);
            legends.sort((x, y) => (!!y.flag - !!x.flag));   // the ones with a story event first; the unbuilt ones last
            return {
                level: p ? p.level : 0, gold: p ? p.gold : 0, webPoints: this.webPoints && this.webState && this.webState() ? this.webPoints() : 0,
                godMode: !!this.flags.godMode, oneHit: !!this.flags.oneHit, used: !!this.flags.devCheats, inFight: this.mode === 'combat', story: !!this.story,
                webs: [...classes.map((id) => ({ id, label: (this.data.basePlayerClasses[id] || {}).name || id, own: p && p.className === id, left: left(id) })),
                    ...legends.filter((l) => l.open).map((l) => ({ id: l.id, label: l.label, legendary: true, left: l.left }))],
                legends, unions, favor: !!(this.hasStoryFlag && this.hasStoryFlag('demonkore_favor')),
                legCramp: !!(p && p.skills && p.skills.includes('LEG CRAMP!')),
                hollowKing: !!(p && p.isHollowKing), eventsUnlocked: !!this.flags.eventsUnlocked,
                weapon: main ? { id: main, name: this.itemName(main), tempered: (md && md.tempered) || 0, max: ((this.data.smithingRules || {}).temper || { ranks: [] }).ranks.length, holy: !!(md && (md.holy || md.kindle)) } : null,
                quests, itemGroups: ITEM_GROUPS.filter(([g]) => groups[g]).map(([id, label]) => ({ id, label, items: groups[id] }))
            };
        }

        /** Runs one of this module's cheats. false: not one of them (actions.js then says it's unknown). */
        devCheat(name, arg) {
            if (!DEV_CHEATS.has(name)) return false;
            if (!this.player) { this.refuse('WRONG_MODE', 'Choose a class first.'); return true; }
            if (this.mode === 'combat' && !IN_FIGHT.has(name)) { this.refuse('IN_COMBAT', 'That cheat waits until the fight is over.'); return true; }
            if (NEEDS_STORY.has(name) && !this.story) { this.refuse('WRONG_MODE', 'That cheat needs the story: play in the world.'); return true; }
            this.flags.devCheats = true;
            const p = this.player;
            const n = parseInt(arg, 10);
            switch (name) {
                case 'god_mode': this.flags.godMode = toggle(this.flags.godMode, arg); this.say(`[cheat] God mode ${this.flags.godMode ? 'on: nothing can hurt you' : 'off'}.`); return true;
                case 'one_hit': this.flags.oneHit = toggle(this.flags.oneHit, arg); this.say(`[cheat] One-hit kills ${this.flags.oneHit ? 'on: every hit you land kills' : 'off'}.`); return true;
                case 'full_heal': this.cheatFullHeal(); return true;
                case 'add_gold': {
                    const amt = Number.isSafeInteger(n) && n > 0 ? n : 1000;
                    p.gold = Math.min(Number.MAX_SAFE_INTEGER, p.gold + amt);
                    this.say(`[cheat] +${amt} Gold (${p.gold} now).`, { notice: 'gold' });
                    return true;
                }
                case 'give_item': this.cheatGiveItem(String(arg || '')); return true;
                case 'set_level': this.cheatSetLevel(n); return true;
                case 'web_points': {
                    const s = this.webState();
                    const amt = Number.isSafeInteger(n) && n > 0 ? n : 5;
                    if (!s || this.webUnavailable()) { const off = this.webUnavailable(); this.refuse(off.code, off.message); return true; }
                    s.bonusPoints = (s.bonusPoints || 0) + amt;
                    this.say(`[cheat] +${amt} Skill Web points (${this.webPoints()} to spend).`, { notice: 'level' });
                    return true;
                }
                case 'learn_web': this.cheatLearnWeb(String(arg || p.className)); return true;
                case 'temper_weapon': this.cheatTemper(); return true;
                case 'awaken_legend': this.cheatAwaken(String(arg || '')); return true;
                case 'pass_trial': {
                    const [legId] = String(arg || '').split(/\s+/);
                    const leg = ((this.data.skillWeb || {}).legendaryWebs || {})[legId];
                    if (!leg || !leg.trial) { this.refuse('UNKNOWN_ACTION', `No legendary web '${legId}' has a trial.`); return true; }
                    this.applyStoryEffects([{ flag: leg.trial.flag }]);
                    this.say(`[cheat] ${leg.trial.name} counts as passed.`);
                    return true;
                }
                case 'bind_all_contracts': {
                    for (const u of this.cheatCatalog().unions) if (!u.bound) this.cheat('bind_contract', u.id);
                    return true;
                }
                case 'demonkore_favor':
                    this.applyStoryEffects([{ flag: 'demonkore_favor' }]);
                    this.say("[cheat] Demonkore's Favor: your unions last three times as long and answer 30% sooner.");
                    return true;
                case 'teach_leg_cramp': {   // Shane's S02 reward, the way the story pays it
                    this.applyStoryEffects([{ flag: 'leg_cramp_learned' }, { teach: 'LEG CRAMP!' }]);
                    if (this.ensureSkillBar) { const bar = this.ensureSkillBar(); if (bar && !bar.includes('LEG CRAMP!') && bar.indexOf(null) !== -1) bar[bar.indexOf(null)] = 'LEG CRAMP!'; }
                    this.say(p.skills.includes('LEG CRAMP!') ? '[cheat] Shane taught you LEG CRAMP!. Sort of.' : '[cheat] LEG CRAMP! could not be taught to this character.');
                    return true;
                }
                case 'start_quest': case 'finish_quest': this.cheatQuest(String(arg || ''), name === 'finish_quest'); return true;
                default: return false;
            }
        }

        cheatFullHeal() {
            const p = this.player;
            p.hp = p.maxHp;
            if (p.resource) p.resource.current = p.resource.max;
            const rt = this.combat && this.combat.rt;
            if (rt) { rt.cooldowns = {}; rt.gcdUntil = rt.now; rt.unionReadyAt = 0; }
            if (this.world && this.world.calm) { this.world.calm.cooldowns = {}; this.world.calm.unionReadyAt = 0; }
            if (this.combat && Array.isArray(this.combat.timers)) this.combat.timers = this.combat.timers.filter((t) => !(t.ownerId === p.id && t.kind === 'union_cooldown'));
            this.say(`[cheat] Full HP and ${p.resource ? p.resource.type : 'resource'}, cooldowns ready.`);
        }

        cheatGiveItem(spec) {
            const m = /^(.*?)(?:\s+x?(\d+))?$/.exec(spec.trim());
            const lower = String((m && m[1]) || '').toLowerCase();
            const item = Object.keys(this.data.itemDefinitions || {}).find((id) => id.toLowerCase() === lower || this.itemName(id).toLowerCase() === lower) || (m && m[1]);
            const count = Math.min(99, Math.max(1, parseInt((m && m[2]) || '1', 10)));
            if (!item || !this.itemDef(item)) { this.refuse('UNKNOWN_ITEM', `There is no item called '${item || ''}'.`); return; }
            for (let i = 0; i < count; i++) this.player.inventory.push(item);
            this.say(`[cheat] Received: ${this.itemName(item)}${count > 1 ? ` ×${count}` : ''}.`, { notice: 'item' });
        }

        /** Levels up through addExperience (stat growth, refills, the guide), one line instead of a line per level. */
        cheatSetLevel(target) {
            const p = this.player;
            const want = Math.min(MAX_LEVEL, Number.isSafeInteger(target) && target > 0 ? target : p.level + 1);
            if (want <= p.level) { this.refuse('LEVEL_TOO_LOW', `You are already level ${p.level}. Cheats only level up (start a new game to go lower).`); return; }
            const from = p.level, mark = this.out.length;
            while (p.level < want) this.addExperience(Math.max(1, p.xpToNext - p.xp), { quiet: true });
            this.out.length = mark;
            p.xp = 0;
            const pts = this.webState && this.webState() ? this.webPoints() : 0;
            this.say(`[cheat] Level ${from} -> ${p.level}. HP and ${p.resource.type} refilled.${pts > 0 ? ` ${pts} Skill Web point${pts === 1 ? '' : 's'} to spend.` : ''}`, { notice: 'level' });
            this.maybePromptBranch();
        }

        /** Owns every node of one web it can reach (class or open legendary web), ignoring level, points, trials and
         *  events. Points are added for what it learns, so the balance you had stays the same and unlearning refunds. */
        cheatLearnWeb(region) {
            const off = this.webUnavailable();
            if (off) { this.refuse(off.code, off.message); return; }
            const web = this.skillWeb();
            const heart = web.nodes.get(`heart.${region}`);
            if (!heart) { this.refuse('UNKNOWN_NODE', `There is no '${region}' web.`); return; }
            if (heart.legendary && !this.webOwns(heart.id)) { this.refuse('LEGEND_LOCKED', `Open ${heart.label} first (Cheats → Legendary classes).`); return; }
            const s = this.webState();
            // A foreign class web: its gateway from your own side first (the cheapest way across), else its heart.
            if (!this.webOwns(heart.id)) {
                const gates = web.list.filter((n) => n.kind === 'gateway' && n.target === region);
                const gate = gates.find((n) => this.webOwns(n.from)) || gates[0];   // a cheat may cross from a node you don't own yet
                if (gate && !this.webOwns(gate.id)) { s.bonusPoints = (s.bonusPoints || 0) + gate.cost; this.webGain(gate); }
            }
            const SKIP = new Set(['CONTRACT_LOCKED', 'NOT_TAUGHT', 'LEGEND_LOCKED']);   // a contract, a teacher and a legend have their own cheats
            const IGNORE = new Set(['LEVEL_TOO_LOW', 'NO_WEB_POINTS', 'TRIAL_LOCKED', 'EVENT_LOCKED']);
            const learned = [];
            for (let progress = true; progress;) {
                progress = false;
                for (const node of web.list) {
                    if (node.region !== region || node.kind === 'gateway' || this.webOwns(node.id)) continue;   // its own gateways lead out of it
                    const why = this.webLearnProblem(node.id);
                    if (why && (SKIP.has(why.code) || !IGNORE.has(why.code))) continue;
                    s.bonusPoints = (s.bonusPoints || 0) + node.cost;
                    this.webGain(node);
                    learned.push(node);
                    progress = true;
                }
            }
            this.refreshSpecialization();
            if (this.ensureSkillBar) this.ensureSkillBar();
            const skipped = web.list.filter((x) => x.region === region && !this.webOwns(x.id) && x.kind !== 'gateway').length;
            this.say(learned.length ? `[cheat] Learned ${learned.length} node${learned.length === 1 ? '' : 's'} of the ${heart.label} web.${skipped ? ` ${skipped} still need a contract or a teacher.` : ''}` : `[cheat] Nothing more to learn in the ${heart.label} web.`, { important: true });
        }

        /** Tempers the main-hand weapon one rank for free (the same item record a smith makes). */
        cheatTemper() {
            const p = this.player, main = p.equipment && p.equipment.mainHand, d = main && this.itemDef(main);
            const ranks = ((this.data.smithingRules || {}).temper || { ranks: [] }).ranks;
            if (!d || d.slot !== 'mainHand' || d.type !== 'weapon') { this.refuse('NOT_TEMPERABLE', 'Hold a weapon in your main hand first.'); return; }
            if (d.holy || d.kindle) { this.refuse('NOT_TEMPERABLE', 'Holy weapons grow with you; they cannot be tempered.'); return; }
            if ((d.tempered || 0) >= ranks.length) { this.refuse('TEMPER_MAX', 'That weapon is tempered as far as it will go.'); return; }
            const record = this.temperedRecord(main), id = `${record.temperBase} [+${record.tempered}]`;
            p.itemInstances = p.itemInstances || {};
            p.itemInstances[id] = record;
            const before = this.equipmentModifiers();
            p.equipment.mainHand = id;
            this.reapplyEquipment(before);
            this.say(`[cheat] Tempered: ${record.name}. ${this.itemDetails(id)}`, { notice: 'item' });
        }

        /** Opens a legendary web the way its story does (its flag, then the `legend` effect with its gifts). */
        cheatAwaken(spec) {
            const [legId, stance] = spec.split(/\s+/);
            if (legId === 'fenrirs_heir') { this.cheat('awaken_fenrir', stance || 'skoll'); return; }
            if (legId === 'devil_union') { this.cheat('bind_contract', stance || 'lucifero'); return; }
            const leg = ((this.data.skillWeb || {}).legendaryWebs || {})[legId];
            const heart = this.skillWeb().nodes.get(`heart.${legId}`);
            if (!leg || !heart) { this.refuse('UNKNOWN_NODE', `There is no legendary web '${legId}'.`); return; }
            if (this.webOwns(heart.id)) { this.say(`[cheat] ${heart.label} is already open.`); return; }
            const req = leg.requires || {};
            const effects = [];
            if (legId === 'fallen_seraphim') effects.push({ flag: 'seraph_met' });   // the statue then talks to you as one who woke it
            if (req.flag) effects.push({ flag: req.flag });
            else if (req.event) this.flags.eventsUnlocked = true;   // an event with no flag yet (Deathlord Eternal, Reality Breaker): the old unlock_events
            this.applyStoryEffects(effects);
            const why = this.webLearnProblem(heart.id, { ignoreMode: true });
            if (why && why.code === 'LEGEND_LOCKED') { this.refuse('LEGEND_LOCKED', `[cheat] ${why.message} Use "Learn a whole web" on those paths first.`); return; }
            this.awakenLegend(legId);
            this.say(this.webOwns(heart.id) ? `[cheat] ${heart.label} opens.` : `[cheat] ${heart.label} did not open.`, { important: true });
        }

        /** start_quest starts a quest; finish_quest also runs every objective left (with its rewards) to the end. */
        cheatQuest(id, finish) {
            const def = this.storyContent().quests[id];
            if (!def || !this.story.quests[id]) { this.refuse('UNKNOWN_QUEST', `There is no quest '${id}'.`); return; }
            if (this.questState(id) === 'complete') { this.refuse('QUEST_DONE', `${def.title} is already complete.`); return; }
            if (this.questState(id) !== 'active') this.startQuest(id);
            if (!finish) { this.say(`[cheat] Started: ${def.title}.`); return; }
            for (let guard = 0; this.questState(id) === 'active' && guard < 100; guard++) this.advanceQuest(id);
            this.say(`[cheat] ${this.questState(id) === 'complete' ? 'Finished' : 'Advanced'}: ${def.title}.`);
        }
    }

    CheatMethods.DEV_CHEATS = DEV_CHEATS;
    (ENSO.engineModules || (ENSO.engineModules = {})).cheats = CheatMethods;
    if (isNode) module.exports = CheatMethods;
})(typeof window !== 'undefined' ? window : globalThis);
