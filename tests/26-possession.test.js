// N-5 Possession (docs/design/VAELIS_PACKAGE_1_NECROMANCER_COMPLETION.md), action authority per
// architecture/REVIEW_DESIGN_PACKAGES_1-3.md §3.1: awaiting 'control', { type: 'control', actorId, skillId, targetId }.
const { test, assert, newGame, gameWith } = require('./helpers.js');
const BM = require('../ui/battle-menu.js');

/** Necromancer with Possession in the hallway (ghoul, ghoul, Rust Rat), acting first; enemies hit for 5. */
function fight({ seed = 1, mutate, hp = 999 } = {}) {
    const g = gameWith((d) => {
        for (const k of ['shackled_ghoul', 'rust_rat']) {
            const e = d.enemies[k];
            e.skills = [{ name: 'Test Hit', base_damage: [5, 5] }, { name: 'Test Swipe', base_damage: [3, 3] }];
            e.critChance = 0; e.hp = e.maxHp = hp;
        }
        if (mutate) mutate(d);
    }, seed);
    g.do('necromancer');
    g.player.spd = 40;
    g.do('n', 'engage');
    g.player.hp = g.player.maxHp = 9999;
    g.player.critChance = 0;
    g.player.skills.push('Possession');
    g.player.resource.current = g.player.resource.max = 10;
    return g;
}
const [GHOUL_A, GHOUL_B, RAT] = ['enemy_0', 'enemy_1', 'enemy_2'];
const possess = (g, id) => g.act({ type: 'skill', skillId: 'Possession', targetId: id });
const option = (g) => g.getAvailableActions().actions.find((o) => o.skillId === 'Possession');
const turnsOf = (text, name) => (text.match(new RegExp(`--- ${name}'s Turn! ---`, 'g')) || []).length;

test('N-5: the possessed enemy\'s own turn pauses for the player\'s choice; its moves, its former allies as targets', () => {
    const g = fight();
    const se = g.player.resource.current;
    const r = possess(g, RAT);
    assert.ok(r.ok);
    assert.strictEqual(g.player.resource.current, se - 3, 'costs its 3 Soul Energy');
    const avail = g.getAvailableActions();
    assert.strictEqual(avail.awaiting, 'control');
    assert.strictEqual(avail.controlledActorId, RAT);
    assert.deepStrictEqual(avail.actions.map((o) => [o.type, o.actorId, o.skillId, o.enabled]), [['control', RAT, 'Test Hit', true], ['control', RAT, 'Test Swipe', true]]);
    assert.deepStrictEqual(avail.actions[0].targets.map((t) => t.id), [GHOUL_A, GHOUL_B], 'its allies only: never itself, never the player');
    assert.match(r.events.map((e) => e.text).join('\n'), /--- You control Rust Rat! ---[\s\S]*1\. Shackled Ghoul[\s\S]*2\. Shackled Ghoul[\s\S]*> Test Hit/);
    // anything else is refused at no cost
    for (const a of [{ type: 'attack', targetId: RAT }, { type: 'flee' }, { type: 'skill', skillId: 'Grave Bolt', targetId: RAT }]) {
        const x = g.act(a);
        assert.strictEqual(x.error.code, 'WRONG_MODE', JSON.stringify(a));
    }
    assert.strictEqual(g.act({ type: 'control', actorId: RAT, skillId: 'Frenzied Bite', targetId: GHOUL_A }).error.code, 'UNKNOWN_SKILL');
    assert.strictEqual(g.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: RAT }).error.code, 'INVALID_TARGET', 'not itself');
    assert.strictEqual(g.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: 'player' }).error.code, 'INVALID_TARGET', 'not the player');
    assert.strictEqual(g.act({ type: 'control', actorId: GHOUL_A, skillId: 'Test Hit', targetId: GHOUL_B }).error.code, 'WRONG_MODE', 'only the controlled actor');
    const ghoul = g.findCombatant(GHOUL_B);
    const hp = ghoul.hp;
    const done = g.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: GHOUL_B });
    assert.ok(done.ok);
    const text = done.events.map((e) => e.text).join('\n');
    const dealt = Number((text.match(/Rust Rat uses Test Hit on Shackled Ghoul for (\d+) damage!/) || [])[1]);
    assert.ok(dealt > 0 && ghoul.hp === hp - dealt, 'the rat\'s own move, its own damage (after the ghoul\'s DEF)');
    assert.match(text, /Rust Rat uses Test Hit on Shackled Ghoul[\s\S]*Rust Rat shakes off your control\./);
    assert.ok(!g.isPossessed(g.findCombatant(RAT)), 'one opportunity only');
    assert.strictEqual(g.combat.controlledActorId, null);
    assert.strictEqual(g.getAvailableActions().awaiting, 'action', 'back to the player');
    assert.strictEqual(g.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: GHOUL_A }).error.code, 'WRONG_MODE');
});

test('N-5: refused before cost for bosses, explicit immunity and 75+ CR (74 is fine); availability and act() agree', () => {
    const g = fight();
    const rat = g.findCombatant(RAT);
    const check = (expectOk, why) => {
        const t = option(g).targets.find((x) => x.id === RAT);
        assert.strictEqual(t.enabled, expectOk, why);
        const se = g.player.resource.current;
        const round = g.combat.round;
        const r = possess(g, RAT);
        if (expectOk) { assert.ok(r.ok, why); return; }
        assert.strictEqual(r.error.code, 'REQUIREMENT_FAILED', why);
        assert.strictEqual(r.error.message, t.reason.message, `${why}: same message`);
        assert.strictEqual(g.player.resource.current, se, `${why}: no Soul Energy spent`);
        assert.strictEqual(g.combat.round, round, `${why}: turn not used`);
        assert.strictEqual(g.getAvailableActions().awaiting, 'action');
    };
    g.crState(rat).value = 75;
    check(false, '75 CR');
    assert.match(possess(g, RAT).error.message, /Control Resistance is too high to possess \(75; it must be below 75\)/);
    rat.statusAffinities = { Possessed: 'immune' };
    g.crState(rat).value = 0;
    check(false, 'explicit immunity');
    rat.statusAffinities = {};
    g.crState(rat).value = 74;
    check(true, '74 CR');
    assert.strictEqual(rat.cr.value, 100, '74 + 35, capped');
    // boss: always refused
    const b = gameWith(() => {});
    b.do('necromancer', 'add_xp 250', 'bone warden');
    b.player.spd = 40;
    b.currentRoom = 'wardens_roost';
    b.do('engage');
    b.player.skills.push('Possession');
    b.player.resource.current = 10;
    const boss = b.combat.enemies[0];
    b.crState(boss).value = 0;
    const r = b.act({ type: 'skill', skillId: 'Possession', targetId: boss.id });
    assert.strictEqual(r.error.code, 'REQUIREMENT_FAILED');
    assert.match(r.error.message, /too powerful to possess/);
    assert.strictEqual(b.player.resource.current, 10);
    assert.strictEqual(b.getAvailableActions().actions.find((o) => o.skillId === 'Possession').enabled, false);
});

test('N-5: an elite below 75 CR can be possessed (starts at 25)', () => {
    const g = fight({ mutate: (d) => { d.enemies.rust_rat.tier = 'elite'; } });
    assert.strictEqual(g.crValue(g.findCombatant(RAT)), 25);
    assert.ok(possess(g, RAT).ok);
    assert.strictEqual(g.getAvailableActions().awaiting, 'control');
});

test('N-5: the controlled actor keeps its own initiative slot; no extra or duplicate turns', () => {
    const g = fight();
    const order = g.combat.order.map((x) => x.id);
    const n = g.log.length;
    g.do('possession 3');                                    // rat (SPD 16) acts right after the player
    assert.deepStrictEqual(g.combat.order.map((x) => x.id), order, 'initiative untouched');
    g.do('test hit 1');
    const text = g.log.slice(n).map((e) => e.text).join('\n');
    assert.strictEqual(turnsOf(text, 'Rust Rat'), 1);
    assert.strictEqual(turnsOf(text, 'Shackled Ghoul'), 2, 'everyone else once');
    assert.ok(text.indexOf("--- Rust Rat's Turn! ---") < text.indexOf("--- Shackled Ghoul's Turn! ---"), 'in its own slot');
});

test('N-5: a skipped (stunned) holder loses the turn and the Possession with it; no extra action', () => {
    const h = fight();
    const rat = h.findCombatant(RAT);
    h.applyStatus(h.player, rat, { name: 'Stun', type: 'skip_turn', duration: 1 });
    const r = possess(h, RAT);
    assert.ok(r.ok);
    const text = r.events.map((e) => e.text).join('\n');
    assert.match(text, /Rust Rat lost its turn, and your hold on it with it\./);
    assert.notStrictEqual(h.getAvailableActions().awaiting, 'control');
    assert.ok(!h.isPossessed(rat));
});

test('N-5: cleanse or death before its turn ends control; no pause, normal AI', () => {
    const g = fight();
    const rat = g.findCombatant(RAT);
    g.possess(g.player, rat, { duration: 1 });
    g.cleanse(rat, { statuses: ['Possessed'] });
    const n = g.log.length;
    g.do('attack 1');
    assert.notStrictEqual(g.getAvailableActions().awaiting, 'control');
    assert.match(g.log.slice(n).map((e) => e.text).join('\n'), /Rust Rat uses Test (Hit|Swipe) on Necromancer/, 'its own AI, on the player');
    const h = fight();
    const rat2 = h.findCombatant(RAT);
    h.possess(h.player, rat2, { duration: 1 });
    rat2.hp = 0;
    h.do('attack 1');
    assert.notStrictEqual(h.getAvailableActions().awaiting, 'control');
    assert.strictEqual(h.combat.controlledActorId, null);
});

test('N-5: with no usable move (no living allies) the engine does the no-op itself and moves on', () => {
    const g = fight();
    for (const id of [GHOUL_A, GHOUL_B]) g.findCombatant(id).hp = 0;
    const r = possess(g, RAT);
    assert.ok(r.ok);
    assert.match(r.events.map((e) => e.text).join('\n'), /Rust Rat has no move it can make\. Your hold on it fades\./);
    assert.strictEqual(g.getAvailableActions().awaiting, 'action', 'no pause');
    assert.ok(!g.isPossessed(g.findCombatant(RAT)));
});

test('N-5: a silenced puppet can only use a basic attack', () => {
    const g = fight();
    const rat = g.findCombatant(RAT);
    g.applyStatus(g.player, rat, { name: 'Silence', type: 'silence', duration: 1 });
    possess(g, RAT);
    const acts = g.getAvailableActions().actions;
    assert.deepStrictEqual(acts.map((o) => [o.skillId, o.enabled, o.reason && o.reason.code]), [['Test Hit', false, 'SILENCED'], ['Test Swipe', false, 'SILENCED'], ['Basic Attack', true, undefined]]);
    assert.strictEqual(g.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: GHOUL_A }).error.code, 'SILENCED');
    assert.ok(g.act({ type: 'control', actorId: RAT, skillId: 'Basic Attack', targetId: GHOUL_A }).ok);
});

test('N-5: kills belong to the controlled actor: no kill credit, Soul Energy or corpse bonus for the Necromancer', () => {
    const g = fight();
    possess(g, RAT);
    g.findCombatant(GHOUL_A).hp = 1;
    const se = g.player.resource.current;
    const kills = g.stats.kills;
    const r = g.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: GHOUL_A });
    const text = r.events.map((e) => e.text).join('\n');
    assert.match(text, /Shackled Ghoul has been defeated!/);
    assert.doesNotMatch(text, /Soul Energy from/);
    assert.strictEqual(g.stats.kills, kills, 'not the player\'s kill');
    assert.ok(g.player.resource.current <= se + 1, 'at most the ordinary end-of-round gain');
});

test('N-5: one possessed target per caster; recasting releases the previous one', () => {
    const g = fight();
    const [a, , rat] = g.combat.enemies;
    g.possess(g.player, a, { duration: 1 });
    g.possess(g.player, rat, { duration: 1 });
    assert.ok(!g.isPossessed(a) && g.isPossessed(rat));
    assert.match(g.flush().map((e) => e.text).join('\n'), /Shackled Ghoul is released from your will\./);
});

test('N-5: typing and act() drive the controlled turn identically, and the battle menu builds the same action', () => {
    const a = fight({ seed: 4 });
    const b = fight({ seed: 4 });
    a.do('possession 3', 'test swipe 2');
    possess(b, RAT);
    const opt = b.getAvailableActions().actions.find((o) => o.skillId === 'Test Swipe');
    assert.strictEqual(BM.targetMode(opt), 'single');
    const entries = BM.entries(b.getAvailableActions(), 'root');
    assert.deepStrictEqual(entries.map((e) => [e.kind, e.label, e.disabled]), [['control', 'Test Hit', false], ['control', 'Test Swipe', false]]);
    const action = BM.actionFor(opt, [GHOUL_B]);
    assert.deepStrictEqual(action, { type: 'control', actorId: RAT, skillId: 'Test Swipe', targetId: GHOUL_B });
    assert.ok(b.act(action).ok);
    assert.strictEqual(a.snapshot().json, b.snapshot().json);
    // CLI refusals while controlling
    const c = fight();
    c.do('possession 3', 'grave bolt 1', 'test hit 9', 'test hit');
    const text = c.text();
    assert.match(text, /Rust Rat has no move called 'grave bolt'/);
    assert.match(text, /Invalid target '9'\. Valid targets: 1, 2\. Example: 'test hit 1'/);
    assert.match(text, /Invalid target 'none specified'/);
    assert.strictEqual(c.getAvailableActions().awaiting, 'control', 'still waiting for a valid move');
});

test('N-5: the waiting state survives snapshot/restore and rolls back with a failed command', () => {
    const g = fight();
    possess(g, RAT);
    const copy = newGame(1);
    copy.restore(g.snapshot());
    assert.strictEqual(copy.getAvailableActions().awaiting, 'control');
    for (const x of [g, copy]) assert.ok(x.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: GHOUL_A }).ok);
    assert.strictEqual(copy.snapshot().json, g.snapshot().json);
    // rollback
    const h = fight();
    possess(h, RAT);
    const before = h.snapshot().json;
    const orig = h.castSkillEffects;
    h.castSkillEffects = () => { throw new Error('boom'); };
    assert.strictEqual(h.act({ type: 'control', actorId: RAT, skillId: 'Test Hit', targetId: GHOUL_A }).error.code, 'INTERNAL_ERROR');
    h.castSkillEffects = orig;
    assert.strictEqual(h.snapshot().json, before);
    assert.strictEqual(h.getAvailableActions().awaiting, 'control');
});
