/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Bestiary, lore codex and boss rematches
 * docs/design/BESTIARY_CODEX_REMATCH.md (research round two, picks #8 and #9; Tokelo approved 2026-11-25).
 * Content: src/story/codex.js (storyData.codex). Numbers: actionRules.rematch in src/data.js.
 *
 *   getBestiary()        pure: every creature in the book, what you know of it (more the more you kill), and its rematch
 *   getCodex()           pure: the lore entries, open ones with their text, the rest as unknown
 *   bossCard(enemyKey)   pure: { name, epithet } for the name card a boss fight opens with, or null
 *   rematchBegin(key)    the `rematch` story effect (a feather ring): the remembered boss stands up where it fell
 *
 * What the book remembers lives in stats (created on first use, so older saves load unchanged):
 *   stats.bestiary  { enemyKey: { kills } }   a key is there once you have fought it
 *   stats.rematches { bossKey: { wins } }     the first win keeps its trophy
 * A remembered fight is the encounter `rematch_<bossKey>` (src/world/rematch-maps.js), shown while the story flag
 * `rematch:<bossKey>` is set. Winning, falling or walking away all end it; only a win counts.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies them onto GameEngine.prototype.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const REMATCH_PREFIX = 'rematch_';
    const flagOf = (key) => `rematch:${key}`;
    // How much of an entry you know: met it (name, kind, lore), beat it once (what it does to you, what hurts it),
    // beat it `drops` times (what it drops). A boss tells you everything the first time it falls.
    const STUDY = { facts: 1, drops: 3 };
    const KIND_FLAG = { undead: 'Undead', spirit: 'Spirit', demon: 'Demon' };

    class CodexMethods {
        codexData() { const s = this.storyContent && this.storyContent(); return (s && s.codex) || null; }
        bestiaryState() { return this.stats.bestiary || (this.stats.bestiary = {}); }

        /** A creature joined a fight against you (buildEnemies): it goes in the book. */
        codexSeen(key) {
            const c = this.codexData();
            if (!c || !c.bestiary[key]) return;
            const b = this.bestiaryState();
            if (!b[key]) b[key] = { kills: 0 };
        }
        /** You (or your summons) killed it. Illusions and summoned things don't count. */
        codexKill(target) {
            const c = this.codexData();
            if (!c || !target || !c.bestiary[target.key] || target.illusion || target.hallucination || target.summoned || target.isSummoned) return;
            const b = this.bestiaryState();
            (b[target.key] || (b[target.key] = { kills: 0 })).kills++;
        }

        /** True if this boss has fallen in the story (also for saves made before the book existed). */
        rematchBeaten(key) {
            const r = ((this.codexData() || {}).rematches || {})[key];
            return !!r && (this.storyAllows(r.beaten) || ((this.stats.bestiary || {})[key] || {}).kills > 0);
        }
        /** The rematch key of a remembered encounter id, or null. */
        rematchKeyOf(encounterId) {
            const id = String(encounterId || '');
            if (!id.startsWith(REMATCH_PREFIX)) return null;
            const key = id.slice(REMATCH_PREFIX.length);
            return ((this.codexData() || {}).rematches || {})[key] ? key : null;
        }

        bossCard(enemyKey) {
            const e = this.data.enemies[enemyKey];
            const b = ((this.codexData() || {}).bosses || {})[enemyKey];
            if (!e || !b) return null;
            return { name: e.name, epithet: b.epithet || null };
        }

        // =====================================================================
        // Rematches
        // =====================================================================
        /** The feather ring's choice: the remembered boss stands up where it fell. Refuses with a reason. */
        rematchBegin(key) {
            const r = ((this.codexData() || {}).rematches || {})[key];
            if (!r || !this.world) { this.refuse('NO_REMATCH', 'Nothing here remembers a fight.'); return false; }
            if (this.mode === 'combat') { this.refuse('IN_COMBAT', 'Not while you are fighting.'); return false; }
            if (!this.rematchBeaten(key)) { this.refuse('NOT_BEATEN', 'You have not beaten it yet.'); return false; }
            if (!this.hasStoryFlag('aspect_nahemoth')) { this.refuse('NO_CROW', 'Only the crow could remember this for you.'); return false; }
            for (const f of this.story.flags.filter((x) => x.startsWith('rematch:'))) this.story.flags = this.story.flags.filter((x) => x !== f);   // one at a time
            this.story.flags.push(flagOf(key));
            const id = REMATCH_PREFIX + key;
            this.world.defeated = this.world.defeated.filter((x) => x !== id);
            this.say(`The feathers lift and turn. ${r.name} stands where it fell, as you remember it.`, { important: true });
            this.out.push({ type: 'rematch.begin', key, encounterId: id });
            return true;
        }
        /** A remembered fight ended. Only a win is kept. */
        rematchEnded(encounterId, won) {
            const key = this.rematchKeyOf(encounterId);
            if (!key || !this.story) return;
            this.story.flags = this.story.flags.filter((f) => f !== flagOf(key));
            if (!won) return;
            const r = this.codexData().rematches[key];
            const all = this.stats.rematches || (this.stats.rematches = {});
            const rec = all[key] || (all[key] = { wins: 0 });
            rec.wins++;
            if (rec.wins === 1 && r.trophy) {
                this.say(`Trophy: ${r.trophy.name}. (Journal → Bestiary)`, { important: true, notice: 'item' });
                this.out.push({ type: 'rematch.trophy', key, trophy: r.trophy.name });
            } else this.say(`${r.name}, beaten again (${rec.wins} times).`, { important: true });
        }
        /** You fell: every remembered fight fades. */
        rematchFadeAll() {
            if (!this.story) return;
            this.story.flags = this.story.flags.filter((f) => !f.startsWith('rematch:'));
        }
        /** A remembered boss grows to your level (Dominion rulers already do, by their own `scaleToLevel`). */
        rematchScaleEnemy(e, encounterId) {
            const key = this.rematchKeyOf(encounterId);
            if (!key || e.key !== key) return;
            const boss = (this.actionRules().bosses || {})[e.key] || {};
            if (boss.scaleToLevel) return;
            const sc = (this.actionRules().rematch || {}).scale || {};
            const lvl = this.codexData().rematches[key].level || 1;
            const over = this.player ? Math.max(0, (this.player.level || 1) - lvl) : 0;
            if (!over) return;
            e.hp = e.maxHp = Math.round(e.maxHp * (1 + (sc.hp || 0) * over));
            if (sc.atk) e.atk = Math.round(e.atk * (1 + sc.atk * over));
            if (sc.def) e.def = Math.round(e.def * (1 + sc.def * over));
        }

        // =====================================================================
        // Views (pure)
        // =====================================================================
        getBestiary() {
            const c = this.codexData();
            if (!c) return null;
            const known = this.stats.bestiary || {};
            const wins = this.stats.rematches || {};
            const bosses = this.actionRules().bosses || {};
            const regions = { vale: 'Blackbriar Vale', north: 'Hrimvald', dominions: 'The Dominions' };
            const entries = Object.entries(c.bestiary).map(([key, b]) => {
                const e = this.data.enemies[key] || {};
                const isBoss = !!c.bosses[key];
                const fellInStory = isBoss && !!c.rematches[key] && this.storyAllows(c.rematches[key].beaten);
                const rec = known[key] || (fellInStory ? { kills: 0 } : null);
                const kills = rec ? rec.kills : 0;
                const beatenOnce = kills > 0 || fellInStory;
                const out = { key, region: b.region, regionName: regions[b.region] || b.region, boss: isBoss, seen: !!rec, kills };
                if (!rec) return { ...out, name: '???' };
                out.name = e.name || key;
                out.kind = b.kind;
                out.lore = [b.lore, ...(b.more || []).filter((m) => this.storyAllows(m.if)).map((m) => m.text)].join(' ');
                out.facts = beatenOnce || kills >= STUDY.facts;
                if (out.facts) {
                    out.xp = e.xp || 0;
                    out.conditions = [...new Set((e.skills || []).flatMap((s) => (s.effects || []).filter((x) => x.type === 'inflict').map((x) => x.status)))];
                    out.weakTo = (e.specialFlags || []).includes('undead') ? ['Radiant blows (they hit undead harder)'] : [];
                    out.traits = (e.specialFlags || []).map((f) => KIND_FLAG[f]).filter(Boolean);
                    const bc = bosses[key];
                    if (bc) out.bossNotes = [bc.phases && bc.phases.length ? `${bc.phases.length + 1} phases` : null, bc.rage ? `Rages below ${Math.round((bc.rage.atHpPct || 0) * 100)}% health` : null].filter(Boolean);
                }
                out.dropsKnown = (isBoss && beatenOnce) || kills >= STUDY.drops;
                if (out.dropsKnown) {
                    const d = [];
                    if (e.lootProfile) d.push(`${e.lootProfile[0].toUpperCase()}${e.lootProfile.slice(1)} spoils: gold, materials, now and then gear`);
                    for (const f of e.foodDrops || []) d.push(f.item);
                    for (const f of e.bossDrops || []) d.push(f.item);
                    out.drops = d;
                }
                const r = c.rematches[key];
                if (r && beatenOnce) {
                    const w = (wins[key] || {}).wins || 0;
                    out.rematch = { where: r.where, wins: w, trophy: w > 0 && r.trophy ? { ...r.trophy } : null, ready: this.hasStoryFlag('aspect_nahemoth') };
                }
                return out;
            });
            const seen = entries.filter((x) => x.seen).length;
            const trophies = entries.filter((x) => x.rematch && x.rematch.trophy).length;
            return { entries, seen, total: entries.length, trophies, trophyTotal: Object.keys(c.rematches).length, regions };
        }

        getCodex() {
            const c = this.codexData();
            if (!c) return null;
            const groups = [];
            for (const l of c.lore) {
                let g = groups.find((x) => x.title === l.group);
                if (!g) groups.push(g = { title: l.group, entries: [] });
                const open = this.storyAllows(l.unlock);
                g.entries.push(open ? { id: l.id, title: l.title, open: true, text: [l.text, ...(l.more || []).filter((m) => this.storyAllows(m.if)).map((m) => m.text)].join(' ') } : { id: l.id, title: '???', open: false });
            }
            const all = groups.flatMap((g) => g.entries);
            return { groups, open: all.filter((x) => x.open).length, total: all.length };
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {})).codex = CodexMethods;
    if (isNode) module.exports = CodexMethods;
})(typeof window !== 'undefined' ? window : globalThis);
