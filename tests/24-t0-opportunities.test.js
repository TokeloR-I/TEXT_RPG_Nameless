// T-0 (architecture/REVIEW_DESIGN_PACKAGES_1-3.md §1): one turn-opportunity hook pair and generic combat timers.
const fs = require('fs');
const path = require('path');
const { test, assert, newGame } = require('./helpers.js');

/** Warrior in the hallway with lots of HP; enemies hit for nothing much. */
function fight(seed = 1) {
    const g = newGame(seed).do('warrior', 'n', 'engage');
    g.player.hp = g.player.maxHp = 9999;
    for (const e of g.combat.enemies) e.hp = e.maxHp = 999;
    return g;
}
const timer = (g, id) => g.combat.timers.find((t) => t.id === id);

test('T-0: the per-turn bookkeeping lives in one place (no copies at the call sites)', () => {
    const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    for (const f of ['engine/combat.js', 'engine/actions.js', 'engine/combat-input.js', 'engine/skills.js']) {
        assert.doesNotMatch(src(f), /\.(endNormalTurn|beginNormalTurn)\(/, `${f} calls the hooks instead`);
        assert.doesNotMatch(src(f), /shieldBashRecovery === 'await_(skip|recovery)'\) [a-z]+\.shieldBashRecovery =/, `${f}: QA-2 bookkeeping moved to the hooks`);
    }
    assert.strictEqual((src('engine/combat.js').match(/endOpportunity\(/g) || []).length, 2, 'advance(): enemy/minion turn end + skipped turn');
    assert.strictEqual((src('engine/actions.js').match(/endOpportunity\(/g) || []).length, 2, 'player: item turn + skill turn (after Haste)');
});

test('T-0: timers count the owner\'s opportunities: not the start turn, skipped turns only if they say so, never Haste bonus actions', () => {
    const g = fight();
    g.player.skills.push('haste');
    g.player.resource.current = g.player.resource.max = 99;
    const counts = g.addTimer(g.player, 'test', 5, { countSkipped: true }).id;
    const ignores = g.addTimer(g.player, 'test', 5, { countSkipped: false }).id;
    g.act({ type: 'attack', targetId: 'enemy_0' });                 // the start turn: no count
    assert.deepStrictEqual([timer(g, counts).remaining, timer(g, ignores).remaining], [5, 5]);
    g.act({ type: 'attack', targetId: 'enemy_0' });                 // a normal turn
    assert.deepStrictEqual([timer(g, counts).remaining, timer(g, ignores).remaining], [4, 4]);
    g.act({ type: 'skill', skillId: 'haste' });                     // bonus action follows...
    assert.deepStrictEqual([timer(g, counts).remaining, timer(g, ignores).remaining], [4, 4], 'Haste: still the same opportunity');
    g.act({ type: 'attack', targetId: 'enemy_0' });                 // ...the opportunity ends once
    assert.deepStrictEqual([timer(g, counts).remaining, timer(g, ignores).remaining], [3, 3]);
    g.player.inventory.push('Bandages'); g.player.hp -= 50;
    g.act({ type: 'use_item', item: 'Bandages' });                  // an item turn is an opportunity too
    assert.deepStrictEqual([timer(g, counts).remaining, timer(g, ignores).remaining], [2, 2]);
    g.applyStatus(g.combat.enemies[0], g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.strictEqual(g.combat.awaitingContinue, true, 'next turn skipped');
    assert.strictEqual(timer(g, counts), undefined, 'this turn (2 -> 1) plus the skipped turn (1 -> 0): expired and removed');
    assert.strictEqual(timer(g, ignores).remaining, 1, 'the other one ignored the skip');
});

test('T-0: enemy timers tick on the enemy\'s own turns, including skipped ones; expiry runs the kind\'s rule', () => {
    const g = fight();
    const e = g.combat.enemies[2];
    g.addTimer(e, 'soul_link', 2, { countSkipped: true });
    g.applyStatus(g.player, e, { name: 'Soul Chain', type: 'soul_link', duration: 'permanent' });
    e.statusEffects[e.statusEffects.length - 1].appliedBy = e.id;   // owned by the timer's owner
    g.act({ type: 'attack', targetId: 'enemy_0' });                  // e takes a normal turn this round
    assert.strictEqual(g.timersOf(e.id, 'soul_link')[0].remaining, 1);
    g.applyStatus(g.player, e, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.act({ type: 'attack', targetId: 'enemy_0' });                  // e's next turn is skipped: still counts
    assert.deepStrictEqual(g.timersOf(e.id), [], 'expired on the skipped turn');
    assert.ok(!e.statusEffects.some((s) => s.type === 'soul_link'), 'soul_link expiry rule ran');
});

test('T-0: timers are plain JSON: they roll back with a failed command and survive snapshot/restore', () => {
    const g = fight();
    g.addTimer(g.player, 'test', 3);
    const before = JSON.stringify(g.combat.timers);
    const orig = g.castSkill;
    g.castSkill = () => { throw new Error('boom'); };
    assert.strictEqual(g.act({ type: 'attack', targetId: 'enemy_0' }).error.code, 'INTERNAL_ERROR');
    g.castSkill = orig;
    assert.strictEqual(JSON.stringify(g.combat.timers), before, 'rolled back');
    const copy = newGame(1);
    copy.restore(g.snapshot());
    assert.deepStrictEqual(copy.combat.timers, g.combat.timers);
    copy.act({ type: 'attack', targetId: 'enemy_0' }); g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.deepStrictEqual(copy.combat.timers, g.combat.timers, 'and keep counting the same way');
    assert.strictEqual(copy.snapshot().json, g.snapshot().json);
});
