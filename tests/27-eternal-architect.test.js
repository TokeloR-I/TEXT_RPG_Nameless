// D-09 Eternal Architect (docs/design/VAELIS_PACKAGE_3_REMAINING_CLASS_MECHANICS.md), scheduler per
// architecture/REVIEW_DESIGN_PACKAGES_1-3.md §3.2: awaiting 'turn_order', { type: 'turn_order', order: [ids] | null }.
const { test, assert, newGame, gameWith } = require('./helpers.js');
const BM = require('../ui/battle-menu.js');

/** Chronomancer in the hallway, acting first; enemies hit for 1 and can't die by accident. Ghoul #2 is renamed. */
function fight({ seed = 1, mutate } = {}) {
    const g = gameWith((d) => {
        for (const k of ['shackled_ghoul', 'rust_rat']) {
            const e = d.enemies[k];
            e.skills = [{ name: 'Test Hit', base_damage: [1, 1] }];
            e.critChance = 0; e.hp = e.maxHp = 999;
        }
        if (mutate) mutate(d);
    }, seed);
    g.do('mage', 'add_xp 250', 'chronomancer');
    g.player.spd = 40;
    g.do('n', 'engage');
    g.combat.enemies[1].name = 'Ghoul B';
    g.player.hp = g.player.maxHp = 9999;
    g.player.critChance = 0;
    g.player.skills.push('rearrangeTurnOrder');
    g.player.resource.current = 4;
    return g;
}
const cast = (g) => g.act({ type: 'skill', skillId: 'rearrangeTurnOrder' });
const order = (g, ids) => g.act({ type: 'turn_order', order: ids });
/** Who took a turn, in log order ('You' for the player). */
const turns = (events) => events.filter((e) => e.type === 'text').map((e) => e.text)
    .map((t) => (t === '--- Your Turn! ---' ? 'You' : (t.match(/^--- (.+)'s Turn! ---$/) || [])[1])).filter(Boolean);

test('D-09: casting costs all Time Charges and opens a 3-round window; each round starts with the player\'s order', () => {
    const g = fight();
    const r = cast(g);
    assert.ok(r.ok);
    assert.ok(/Used 4 Time Charges\./.test(r.events.map((e) => e.text).join('\n')), 'all 4 charges spent');
    const avail = g.getAvailableActions();
    assert.strictEqual(avail.awaiting, 'turn_order');
    const choose = avail.actions.find((o) => o.mode === 'choose');
    assert.deepStrictEqual(choose.defaultOrder, ['player', 'enemy_2', 'enemy_0', 'enemy_1'], 'living ids in speed order');
    assert.deepStrictEqual(choose.pick, { min: 4, max: 4 });
    assert.strictEqual(choose.roundsLeft, 2);
    assert.match(r.events.map((e) => e.text).join('\n'), /--- Round 2: you set the turn order \(2 more rounds after this\) ---[\s\S]*1\. Mage \(you\) \(SPD: 40\)[\s\S]*2\. Rust Rat/);
    const x = order(g, ['enemy_1', 'enemy_0', 'player', 'enemy_2']);
    assert.ok(x.ok);
    assert.deepStrictEqual(turns(x.events), ['Ghoul B', 'Shackled Ghoul', 'You'], 'the chosen order, up to the player\'s turn');
    const y = g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.deepStrictEqual(turns(y.events), ['Rust Rat'], 'then the rest of the round; nobody acts twice');
    assert.strictEqual(g.getAvailableActions().awaiting, 'turn_order', 'round 3 asks again');
    assert.ok(order(g, null).ok, 'null keeps the speed order');
    assert.deepStrictEqual(g.combat.order.map((u) => u.id), ['player', 'enemy_2', 'enemy_0', 'enemy_1']);
    const r4 = g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.strictEqual(g.getAvailableActions().awaiting, 'turn_order', 'round 4 is the third and last');
    assert.match(r4.events.map((e) => e.text).join('\n'), /--- Round 4: you set the turn order \(last round\) ---/);
    assert.ok(order(g, ['enemy_2', 'player', 'enemy_0', 'enemy_1']).ok);
    assert.strictEqual(g.combat.turnOrder, null, 'window closed');
    g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.strictEqual(g.getAvailableActions().awaiting, 'action', 'round 5: normal initiative, no pause');
    assert.deepStrictEqual(g.combat.order.map((u) => u.id), ['player', 'enemy_2', 'enemy_0', 'enemy_1']);
});

test('D-09: a bad order is refused (INVALID_ORDER) at no cost and the round keeps waiting; other actions are WRONG_MODE', () => {
    const g = fight();
    cast(g);
    const before = g.snapshot().json;
    const bad = [
        [['enemy_1', 'enemy_0', 'player'], /Missing: enemy_2/],
        [['enemy_1', 'enemy_0', 'player', 'player'], /only once/],
        [['enemy_1', 'enemy_0', 'player', 'enemy_9'], /Not a living combatant: enemy_9/],
        ['player', /must be a list/]
    ];
    for (const [o, re] of bad) {
        const r = order(g, o);
        assert.strictEqual(r.error.code, 'INVALID_ORDER', JSON.stringify(o));
        assert.match(r.error.message, re);
        assert.strictEqual(g.snapshot().json, before, 'nothing changed');
    }
    for (const a of [{ type: 'attack', targetId: 'enemy_0' }, { type: 'flee' }, { type: 'continue' }, { type: 'skill', skillId: 'Focus' }]) {
        assert.strictEqual(g.act(a).error.code, 'WRONG_MODE', JSON.stringify(a));
    }
    assert.strictEqual(g.getAvailableActions().awaiting, 'turn_order');
    // and outside the window
    const h = fight();
    assert.strictEqual(order(h, null).error.code, 'WRONG_MODE');
});

test('D-09: needs at least 1 Time Charge (refused before cost); availability and act() agree; a recast refreshes, never stacks', () => {
    const g = fight();
    g.player.resource.current = 0;
    const opt = g.getAvailableActions().actions.find((o) => o.skillId === 'rearrangeTurnOrder');
    assert.strictEqual(opt.enabled, false);
    const r = cast(g);
    assert.strictEqual(r.error.code, 'REQUIREMENT_FAILED');
    assert.strictEqual(r.error.message, opt.reason.message);
    assert.match(r.error.message, /needs at least 1 Time Charges/);
    // recast inside the window: back to 3 rounds
    const h = fight();
    cast(h);
    order(h, null);                                   // round 2 (2 left)
    h.player.resource.current = 2;
    const again = cast(h);
    assert.ok(again.ok);
    assert.match(again.events.map((e) => e.text).join('\n'), /Your design is renewed/);
    assert.strictEqual(h.getAvailableActions().actions[0].roundsLeft, 2, 'round 3 is the first of a fresh 3-round window');
});

test('D-09: the boss still acts, deaths drop out, summons join the next round\'s choice', () => {
    const b = gameWith((d) => { const w = d.enemies.crow_touched_warden; w.skills = [{ name: 'Test Hit', base_damage: [1, 1] }]; w.critChance = 0; w.hp = w.maxHp = 9999; });
    b.do('mage', 'add_xp 250', 'chronomancer');
    b.player.spd = 40;
    b.currentRoom = 'wardens_roost';
    b.do('engage');
    b.player.hp = b.player.maxHp = 9999;
    b.player.skills.push('rearrangeTurnOrder');
    b.player.resource.current = 3;
    cast(b);
    const r = order(b, ['player', 'enemy_0']);
    const r2 = b.act({ type: 'attack', targetId: 'enemy_0' });
    assert.deepStrictEqual([...turns(r.events), ...turns(r2.events)], ['You', 'The Crow-Touched Warden'], 'placed last, never denied');
    // deaths and summons
    const g = fight();
    cast(g);
    order(g, null);
    g.findCombatant('enemy_1').hp = 0;
    g.summon('skeleton');
    g.act({ type: 'attack', targetId: 'enemy_0' });
    const ids = g.getAvailableActions().actions[0].defaultOrder;
    assert.ok(!ids.includes('enemy_1'), 'the dead drop out');
    assert.ok(ids.some((id) => /^minion_/.test(id)), 'the new summon is in the next choice');
    assert.ok(order(g, [...ids].reverse()).ok, 'and can be placed anywhere');
});

test('D-09: DoTs tick once per actual turn, skipped turns stay skipped once, Haste is unchanged', () => {
    const g = fight();
    const ghoul = g.findCombatant('enemy_0');
    cast(g);
    g.applyDot(g.player, ghoul, { name: 'Bleed', value: 2, duration: 5 });
    g.applyStatus(g.player, g.findCombatant('enemy_1'), { name: 'Stun', type: 'skip_turn', duration: 1 });
    const hp = ghoul.hp;
    const r = order(g, ['enemy_0', 'enemy_1', 'enemy_2', 'player']);
    const text = r.events.map((e) => e.text).join('\n');
    assert.strictEqual(hp - ghoul.hp, 2, 'one Bleed tick for one turn');
    assert.strictEqual((text.match(/Ghoul B is unable to act this turn!/g) || []).length, 1);
    assert.deepStrictEqual(turns(r.events), ['Shackled Ghoul', 'Rust Rat', 'You'], 'the stunned ghoul is skipped in its slot');
    // Haste in a reordered round: still one bonus action, then the round goes on
    g.player.resource.current = 5;
    g.combat.extraTurn = true;
    const a = g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.match(a.events.map((e) => e.text).join('\n'), /You act again/);
    const b2 = g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.strictEqual(g.getAvailableActions().awaiting, 'turn_order', 'then the next round asks for an order');
    assert.ok(b2.ok);
});

test('D-09: typing and act() set the same order; the battle menu builds the same action', () => {
    const a = fight({ seed: 5 });
    const b = fight({ seed: 5 });
    a.do('rearrangeTurnOrder', 'order 4 3 1 2');
    cast(b);
    const choose = b.getAvailableActions().actions.find((o) => o.mode === 'choose');
    assert.strictEqual(BM.targetMode(choose), 'multi');
    assert.deepStrictEqual(BM.entries(b.getAvailableActions(), 'root').map((e) => e.label), ['Set the turn order', 'Keep the speed order']);
    const names = BM.targetEntries(choose, b.getState()).map((t) => t.label);
    assert.deepStrictEqual(names, ['Mage (you)', 'Rust Rat', 'Shackled Ghoul', 'Ghoul B']);
    const action = BM.actionFor(choose, ['enemy_1', 'enemy_0', 'player', 'enemy_2']);
    assert.deepStrictEqual(action, { type: 'turn_order', order: ['enemy_1', 'enemy_0', 'player', 'enemy_2'] });
    assert.ok(b.act(action).ok);
    assert.strictEqual(a.snapshot().json, b.snapshot().json);
    const keep = BM.entries(fightCast().getAvailableActions(), 'root')[1].option;
    assert.deepStrictEqual(BM.actionFor(keep), { type: 'turn_order', order: null });
    // CLI refusals
    const c = fightCast();
    c.do('order 1 2', 'order 9 1 2 3', 'attack 1', 'order 1 1 2 3');
    const text = c.text();
    assert.match(text, /Missing: /);
    assert.match(text, /No combatant number 9/);
    assert.match(text, /Set this round's turn order first/);
    assert.match(text, /only once/);
    assert.strictEqual(c.getAvailableActions().awaiting, 'turn_order');
    c.do('order');
    assert.strictEqual(c.getAvailableActions().awaiting, 'action');
});
function fightCast() { const g = fight(); g.do('rearrangeTurnOrder'); return g; }

test('D-09: the waiting state survives snapshot/restore and rolls back with a failed command', () => {
    const g = fight();
    cast(g);
    const copy = newGame(1);
    copy.restore(g.snapshot());
    assert.strictEqual(copy.getAvailableActions().awaiting, 'turn_order');
    for (const x of [g, copy]) { assert.ok(order(x, ['enemy_1', 'enemy_0', 'player', 'enemy_2']).ok); x.act({ type: 'attack', targetId: 'enemy_0' }); }
    assert.strictEqual(copy.snapshot().json, g.snapshot().json);
    const h = fight();
    cast(h);
    const before = h.snapshot().json;
    const orig = h.advance;
    h.advance = () => { throw new Error('boom'); };
    assert.strictEqual(order(h, ['enemy_1', 'enemy_0', 'player', 'enemy_2']).error.code, 'INTERNAL_ERROR');
    h.advance = orig;
    assert.strictEqual(h.snapshot().json, before);
    assert.strictEqual(h.getAvailableActions().awaiting, 'turn_order');
});
