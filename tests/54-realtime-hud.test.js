// Real-time battle HUD model (ui/battle-realtime.js) and the world UI's real-time hooks (combat v2).
const { test, assert, GameEngine } = require('./helpers.js');
const RT = require('../ui/battle-realtime.js');
const BM = require('../ui/battle-menu.js');
const BV = require('../ui/battle-view.js');

function rtFight(cls = 'warrior', seed = 3) {
    const g = new GameEngine({ seed, combatMode: 'realtime' });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.input('e'); g.input('engage');
    return g;
}

test('RT HUD clock: ticks in ~100 ms steps, caps each tick at 250 ms, drops time while paused', () => {
    const c = RT.createClock({ stepMs: 100, maxMs: 250 });
    assert.strictEqual(c.feed(16), 0);
    assert.strictEqual(c.feed(16), 0);
    assert.strictEqual(c.feed(80), 112);
    assert.strictEqual(c.feed(5000), 250, 'a long frame (hidden tab) is cut to one capped tick');
    c.feed(60);
    assert.strictEqual(c.feed(60, false), 0, 'paused');
    assert.strictEqual(c.pending, 0, 'paused time is dropped, not saved up');
    assert.strictEqual(c.feed(NaN), 0);
});

test('RT HUD text helpers: clock, seconds, short names, fractions', () => {
    assert.strictEqual(RT.clockText(0), '0:00');
    assert.strictEqual(RT.clockText(83500), '1:23');
    assert.strictEqual(RT.secondsText(1420), '1.5');
    assert.strictEqual(RT.secondsText(12001), '13');
    assert.strictEqual(RT.secondsText(0), '');
    assert.strictEqual(RT.shortName('Guard'), 'Guard');
    assert.ok(RT.shortName('March of the Endless Bones').length <= 12);
    assert.strictEqual(RT.fraction({ remainingMs: 500, totalMs: 1000 }), 0.5);
    assert.strictEqual(RT.fraction({ remainingMs: 500, totalMs: 1000 }, 250), 0.25, 'smoothed between ticks');
    assert.strictEqual(RT.fraction({ remainingMs: 500, totalMs: 1000 }, 900), 0, 'never past ready');
    assert.strictEqual(RT.remaining({ endsAt: 1500, totalMs: 1000 }, 1000), 0.5);
    assert.strictEqual(RT.remaining(null, 0), 0);
});

test('RT HUD keys and targets: 1-6 (and digit/numpad codes) pick slots; Tab cycles living foes and wraps', () => {
    assert.strictEqual(RT.slotForKey({ key: '1' }), 0);
    assert.strictEqual(RT.slotForKey({ key: '!', code: 'Digit1' }), 0);
    assert.strictEqual(RT.slotForKey({ key: 'x', code: 'Numpad6' }), 5);
    assert.strictEqual(RT.slotForKey({ key: '7', code: 'Digit7' }), -1);
    const foes = [{ id: 'a', hp: 5 }, { id: 'b', hp: 0 }, { id: 'c', hp: 3 }];
    assert.strictEqual(RT.cycleTarget(foes, 'a', 1), 'c', 'the dead are skipped');
    assert.strictEqual(RT.cycleTarget(foes, 'c', 1), 'a');
    assert.strictEqual(RT.cycleTarget(foes, 'a', -1), 'c');
    assert.strictEqual(RT.cycleTarget(foes, 'gone', 1), 'a');
    assert.strictEqual(RT.cycleTarget([], 'a', 1), null);
});

test('RT HUD slots come from the engine: six slots, usability and reasons exactly as getAvailableActions says', () => {
    const g = rtFight();
    const avail = g.getAvailableActions();
    assert.strictEqual(avail.awaiting, 'realtime');
    const v = g.getRealtimeState();
    const before = g.snapshot().json;
    const slots = RT.skillSlots(avail, v);
    assert.strictEqual(g.snapshot().json, before, 'pure');
    assert.strictEqual(slots.length, 6);
    assert.deepStrictEqual(slots.map((s) => s.key), ['1', '2', '3', '4', '5', '6']);
    for (const s of slots) {
        if (s.empty) { assert.strictEqual(s.enabled, false); continue; }
        const o = avail.actions.find((a) => a.type === 'skill' && a.skillId === s.skillId);
        assert.strictEqual(s.enabled, o.enabled, s.skillId);
        if (!o.enabled) assert.deepStrictEqual(s.reason, o.reason);
    }
    const basic = RT.basicSlot(avail, v);
    assert.strictEqual(basic.key, 'F');
    assert.strictEqual(basic.enabled, avail.actions.find((a) => a.type === 'attack').enabled);
});

test('RT HUD: firing a slot puts it on cooldown and the GCD on the others; ticking runs the timers down', () => {
    const g = rtFight();
    const slots = RT.skillSlots(g.getAvailableActions(), g.getRealtimeState());
    const ready = slots.find((s) => s.enabled);
    assert.ok(ready, 'a usable skill on the bar');
    assert.ok(g.act({ type: 'skill_slot', slot: ready.slot }).ok);
    let v = g.getRealtimeState();
    const after = RT.skillSlots(g.getAvailableActions(), v);
    const same = after.find((s) => s.slot === ready.slot);
    assert.strictEqual(same.enabled, false);
    assert.ok(['ON_COOLDOWN', 'GLOBAL_COOLDOWN'].includes(same.reason.code));
    assert.ok(same.cooldown && same.cooldown.endsAt > v.now);
    for (const s of after.filter((x) => !x.empty)) assert.ok(s.gcd && s.gcd.endsAt > v.now, `GCD sweep on ${s.skillId}`);
    const r = g.act({ type: 'skill_slot', slot: ready.slot });
    assert.ok(!r.ok, 'the engine refuses a press on cooldown (the HUD shows that as a hint)');
    for (let i = 0; i < 40 && g.mode === 'combat'; i++) g.tick(100);
    if (g.mode === 'combat') {
        v = g.getRealtimeState();
        assert.strictEqual(RT.skillSlots(g.getAvailableActions(), v).find((s) => s.slot === ready.slot).gcd, null, 'GCD over');
    }
});

test('RT HUD: enemy timers show the next move, then the wind-up with its skill name', () => {
    const g = rtFight();
    const id = g.getState().combat.enemies[0].id;
    let t = RT.actorTimers(g.getRealtimeState(), id);
    assert.ok(t.next && !t.windup);
    let seen = null;
    for (let i = 0; i < 60 && g.mode === 'combat' && !seen; i++) {
        g.tick(100);
        const v = g.getRealtimeState();
        if (!v) break;
        t = RT.actorTimers(v, id);
        if (t.windup) seen = t.windup;
    }
    assert.ok(seen, 'a wind-up appeared');
    assert.ok(typeof seen.skill === 'string' && seen.totalMs > 0);
});

test('RT HUD: status chips count seconds on the fight clock in real time, rounds in turn mode', () => {
    const defs = { Bleed: { category: 'dot' } };
    const rt = BV.statusChip({ name: 'Bleed', stacks: 12, duration: 3, rtEndsAt: 9000, rtTotalMs: 9000 }, defs, 4100);
    assert.strictEqual(rt.text, 'Bleed ×12');
    assert.strictEqual(rt.seconds, 5);
    assert.strictEqual(rt.endsAt, 9000);
    const turn = BV.statusChip({ name: 'Bleed', stacks: 2, duration: 3 }, defs);
    assert.strictEqual(turn.text, 'Bleed ×2 3');
    assert.strictEqual(turn.endsAt, undefined);
});

test('RT HUD pause menu: Resume, Items and Flee; Flee is the engine\'s flee', () => {
    const g = rtFight();
    const ents = BM.entries(g.getAvailableActions(), 'realtime');
    assert.deepStrictEqual(ents.map((e) => e.kind), ['resume', 'items', 'flee']);
    assert.deepStrictEqual(BM.actionFor(ents[2].option), { type: 'flee' });
});

test('RT HUD presentation: a slot press is drawn as that slot\'s skill', () => {
    const slots = [{ slot: 0, skillId: 'Guard' }, { slot: 1, skillId: null }];
    assert.deepStrictEqual(RT.presentationAction({ type: 'skill_slot', slot: 0 }, slots), { type: 'skill', skillId: 'Guard', targetId: undefined });
    assert.strictEqual(RT.presentationAction({ type: 'skill_slot', slot: 1 }, slots), null);
    assert.deepStrictEqual(RT.presentationAction({ type: 'attack' }, slots), { type: 'attack' });
});

test('RT HUD skill bar menu: set_skill_slot swaps out of combat and is refused in a fight', () => {
    const g = new GameEngine({ seed: 5, combatMode: 'realtime' });
    g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    const bar = g.getSkillBar();
    assert.strictEqual(bar.length, 6);
    const filled = bar.filter((b) => b.skillId);
    if (filled.length >= 2) {
        assert.ok(g.act({ type: 'set_skill_slot', slot: filled[0].slot, skillId: filled[1].skillId }).ok);
        const now = g.getSkillBar();
        assert.strictEqual(now[filled[0].slot].skillId, filled[1].skillId);
        assert.strictEqual(now[filled[1].slot].skillId, filled[0].skillId);
    }
    g.input('e'); g.input('engage');
    const r = g.act({ type: 'set_skill_slot', slot: 0, skillId: null });
    assert.ok(!r.ok);
    assert.strictEqual(r.error.code, 'IN_COMBAT');
});

test('world UI: real time is the default, ?combat=turn keeps the turn-based fights, and the engine gets the mode', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../ui/world-ui.js'), 'utf8');
    assert.match(src, /const COMBAT_MODE = \/\[\?&\]combat=turn/);
    assert.match(src, /new ENSO\.GameEngine\(\{ seed: seedFromUrl\(\), combatMode: COMBAT_MODE \}\)/);
    assert.match(src, /GameEngine\.fromSave\(save, \{ combatMode: COMBAT_MODE \}\)/);
    const html = require('fs').readFileSync(require('path').join(__dirname, '../world.html'), 'utf8');
    assert.ok(html.indexOf('ui/battle-realtime.js') > 0 && html.indexOf('ui/battle-realtime.js') < html.indexOf('ui/world-ui.js'));
});
