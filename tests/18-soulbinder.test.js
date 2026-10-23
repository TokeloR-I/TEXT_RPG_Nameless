/* Soulbinder N-3/N-4: deterministic link, propagation and Feast tests. */
const { test, assert, newGame } = require('./helpers.js');

const soulFight = (seed = 13) => {
    const g = newGame(seed).do('necromancer', 'add_xp 250', 'soulbinder', 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.player.resource.current = g.player.resource.max;
    for (const t of g.combat.enemies) { t.hp = t.maxHp = 100; t.def = 0; t.critChance = 0; }
    g.player.critChance = 0;
    return g;
};
const chain = (g, targets) => g.castSkill(g.player, g.playerSkill('Soul Chain'), targets);
const feast = (g) => g.castSkill(g.player, g.playerSkill('Soul Feast'), g.activeSoulLinks(g.player));
const hit = (g, t, damage) => g.damage(t, damage, g.player);

test('Soul Chain: distinct enemies link, one status per target, 3 rounds with Binding Will', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    assert.strictEqual(g.activeSoulLinks(g.player).length, 2);
    assert.strictEqual(g.findStatus(a, 'Soul Chain').duration, 'permanent');
    assert.strictEqual(g.findStatus(b, 'Soul Chain').duration, 'permanent');
    assert.strictEqual(g.combat.soulLinkClocks[g.player.id].remaining, 3);
    const oldId = g.findStatus(a, 'Soul Chain').linkGroup;
    chain(g, [a, b]);
    assert.strictEqual(g.activeSoulLinks(g.player).length, 2);
    assert.notStrictEqual(g.findStatus(a, 'Soul Chain').linkGroup, oldId);
    assert.strictEqual(a.statusEffects.filter(s => s.type === 'soul_link').length, 1);
});

test('Soul Chain: exact HP loss propagates half once, bypassing flat DEF', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    b.def = 1000;
    chain(g, [a, b]);
    hit(g, a, 11);
    assert.strictEqual(a.hp, 89);
    assert.strictEqual(b.hp, 95, 'floor(11 / 2) propagated despite flat DEF');
    assert.strictEqual(a.hp, 89, 'no recursive propagation');
    a.hp = 3;
    hit(g, a, 20);
    assert.strictEqual(b.hp, 94, 'overkill 20 with 3 HP propagates only floor(3/2)');
});

test('Soul Chain: prevention, magical damage reduction, and cleanup', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    g.applyStatus(g.player, b, { name: 'Guard Test', type: 'damage_reduction', value: 0.2, duration: 2 });
    hit(g, a, 10);
    assert.strictEqual(b.hp, 96, '5 secondary reduced to 4');
    hit(g, a, 0);
    assert.strictEqual(b.hp, 96, 'zero HP damage does not share');
    g.cleanse(b, { statuses: ['Soul Chain'] });
    assert.strictEqual(g.activeSoulLinks(g.player).length, 0);
    assert.ok(!g.findStatus(a, 'Soul Chain'), 'orphan group removed');
});

test('Soul Feast: three linked target turns, no immediate tick and no base healing', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    g.player.hp = 500;
    feast(g);
    assert.strictEqual(a.hp, 100);
    assert.strictEqual(b.hp, 100);
    for (let i = 0; i < 3; i++) {
        g.tickSoulFeast(a);
        g.tickSoulFeast(b);
        g.armStatuses(a); g.armStatuses(b);
        g.tickStatusesEndOfRound();
    }
    assert.strictEqual(a.hp, 94);
    assert.strictEqual(b.hp, 94);
    assert.strictEqual(g.player.hp, 500);
    assert.strictEqual(g.findStatus(a, 'Soul Feast'), null);
    g.tickSoulFeast(a);
    assert.strictEqual(a.hp, 94, 'no fourth tick');
});

test('Soul Feast: refresh without extra instance; re-link cannot transfer old drain', () => {
    const g = soulFight();
    const [a, b, c] = g.combat.enemies;
    chain(g, [a, b]);
    feast(g);
    feast(g);
    assert.strictEqual(a.statusEffects.filter(s => s.type === 'soul_feast').length, 1);
    chain(g, [b, c]);
    g.tickSoulFeast(b);
    assert.strictEqual(b.hp, 100, 'old Feast group does not transfer after re-link');
    assert.strictEqual(g.findStatus(c, 'Soul Feast'), null);
    feast(g);
    g.tickSoulFeast(c);
    assert.strictEqual(c.hp, 98, 'new Feast applies on recast');
});

test('Soul Chain: owner death and encounter cleanup prevent propagation', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    g.player.hp = 0;
    hit(g, a, 10);
    assert.strictEqual(b.hp, 100, 'dead owner cannot propagate');
    g.mode = 'explore';
    g.combat = null;
    g.player.statusEffects = [];
    g.player.hp = 999;
    g.do('engage');
    assert.strictEqual(g.activeSoulLinks(g.player).length, 0);
});

test('Soul Chain CLI: explicit distinct target selection and cost guard', () => {
    const g = soulFight();
    g.player.resource.current = 5;
    const before = g.player.resource.current;
    g.do('soul chain 1,1');
    assert.strictEqual(g.player.resource.current, before, 'duplicate targets refused without spending');
    assert.strictEqual(g.combat.awaitingPlayer, true, 'invalid cast does not consume action');
    g.do('soul chain 1,2');
    assert.match(g.text(), /Soul Chain binds/);
    assert.match(g.text(), /Used 1 Soul Energy/);
});

test('Soul Chain: Chain of Woe gets three targets and one Wound Transfer multiplier', () => {
    const g = soulFight();
    g.player.traits.push({ name: 'Wound Transfer' });
    const [a, b, c] = g.combat.enemies;
    chain(g, [a, b, c]);
    assert.strictEqual(g.activeSoulLinks(g.player).length, 3);
    a.hp = 100;
    b.hp = 100;
    c.hp = 100;
    hit(g, a, 10);
    assert.strictEqual(a.hp, 89, 'Wound Transfer applies 10% to original HP damage once');
    assert.strictEqual(b.hp, 95, 'floor(5 x 1.1) is 5 once');
    assert.strictEqual(c.hp, 95);
    g.cleanse(a, { statuses: ['Soul Chain'] });
    assert.strictEqual(g.activeSoulLinks(g.player).length, 2);
    g.cleanse(b, { statuses: ['Soul Chain'] });
    assert.strictEqual(g.activeSoulLinks(g.player).length, 0);
});

test('Soul Feast: Eidolon King heals only actual drained HP and stops at max HP', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    g.player.traits.push({ name: 'You heal for 100% of Soul Feast dmg' });
    chain(g, [a, b]);
    feast(g);
    g.player.hp = g.player.maxHp - 3;
    g.tickSoulFeast(a);
    g.tickSoulFeast(b);
    assert.strictEqual(g.player.hp, g.player.maxHp, 'healing capped at missing three HP');
    a.hp = 1;
    g.player.hp = 100;
    g.tickSoulFeast(a);
    assert.strictEqual(g.player.hp, 101, 'drain heals by actual HP removed, not overkill');
});

test('Soul Feast: targeted cleanse stops drain but leaves Soul Chain intact', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    feast(g);
    g.cleanse(a, { statuses: ['Soul Feast'] });
    assert.ok(g.findStatus(a, 'Soul Chain'));
    g.tickSoulFeast(a);
    g.tickSoulFeast(b);
    assert.strictEqual(a.hp, 100);
    assert.strictEqual(b.hp, 98);
});

test('Soul Chain: Bone Wall absorbs linked secondary damage without consuming other defense', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    g.applyStatus(g.player, b, { name: 'Bone Wall', type: 'absorb', duration: 1 });
    hit(g, a, 12);
    assert.strictEqual(b.hp, 100);
    assert.ok(!g.findStatus(b, 'Bone Wall'), 'shield consumed by prevented soul hit');
    hit(g, a, 12);
    assert.strictEqual(b.hp, 94, 'second soul hit deals ordinary half damage');
});

test('Soul Chain: immune targets refuse cast without deleting an existing link', () => {
    const g = soulFight();
    const [a, b, c] = g.combat.enemies;
    chain(g, [a, b]);
    const id = g.findStatus(a, 'Soul Chain').linkGroup;
    c.statusAffinities = { 'Soul Chain': 'immune' };
    const effect = g.playerSkill('Soul Chain').effects[0];
    const reason = g.effects.link_targets.requires({
        engine: g, caster: g.player, targets: [a, c],
        skill: g.playerSkill('Soul Chain'), effect
    });
    assert.match(reason, /immune/);
    assert.strictEqual(g.findStatus(a, 'Soul Chain').linkGroup, id);
});

test('Soul Feast: immunity and prevention yield zero damage and healing', () => {
    const g = soulFight();
    const [a, b] = g.combat.enemies;
    g.player.traits.push({ name: 'You heal for 100% of Soul Feast dmg' });
    chain(g, [a, b]);
    feast(g);
    g.player.hp = 700;
    a.statusAffinities = { 'Soul Feast': 'immune' };
    g.applyStatus(g.player, b, { name: 'Bone Wall', type: 'absorb', duration: 1 });
    g.tickSoulFeast(a);
    g.tickSoulFeast(b);
    assert.strictEqual(a.hp, 100);
    assert.strictEqual(b.hp, 100);
    assert.strictEqual(g.player.hp, 700);
    assert.ok(!g.findStatus(b, 'Bone Wall'));
});

test('QA-19: one caster-owned link clock ignores enemy speed and counts skipped opportunities', () => {
    for (const speeds of [[40, 40], [1, 1], [40, 1]]) {
        const g = soulFight(23);
        const [a, b] = g.combat.enemies;
        a.spd = speeds[0]; b.spd = speeds[1];
        g.player.normalTurns = 1;
        chain(g, [a, b]);
        const id = g.player.id;
        assert.strictEqual(g.combat.soulLinkClocks[id].remaining, 3);
        g.tickStatusesEndOfRound();
        assert.strictEqual(g.activeSoulLinks(g.player).length, 2);
        g.player.normalTurns = 2; g.advanceSoulLinkClock(g.player);
        assert.strictEqual(g.combat.soulLinkClocks[id].remaining, 2);
        g.player.normalTurns = 3; g.advanceSoulLinkClock(g.player);
        assert.strictEqual(g.combat.soulLinkClocks[id].remaining, 1);
        g.advanceSoulLinkClock(g.player, true);
        assert.strictEqual(g.activeSoulLinks(g.player).length, 0);
    }
});

test('QA-20: secondary damage and Feast never grant Soul Energy or marked-hit income', () => {
    const g = soulFight(24);
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    g.player.resource.current = 0;
    g.combat.dealtDamageThisRound = false;
    g.combat.markedEnemyHitThisRound = false;
    b.hp = 2;
    g.secondarySoulDamage(b, 4, g.player);
    assert.strictEqual(g.player.resource.current, 0, 'link kill has no resource payout');
    assert.strictEqual(g.combat.dealtDamageThisRound, false);
    g.player.resource.current = 0;
    feast(g);
    a.hp = 2;
    g.tickSoulFeast(a);
    assert.strictEqual(g.player.resource.current, 0, 'Feast kill has no payout');
    assert.strictEqual(g.combat.dealtDamageThisRound, false);
});

test('QA-21: primary lethal death processes before snapshotted secondary damage', () => {
    const g = soulFight(25);
    const [a, b] = g.combat.enemies;
    chain(g, [a, b]);
    const events = [];
    const original = g.secondarySoulDamage.bind(g);
    g.secondarySoulDamage = (...args) => { events.push('secondary'); return original(...args); };
    const death = g.onDeath.bind(g);
    g.onDeath = (...args) => { events.push('death'); return death(...args); };
    a.hp = 3;
    g.damage(a, 20, g.player);
    assert.deepStrictEqual(events.slice(0, 2), ['death', 'secondary']);
    assert.strictEqual(b.hp, 99, 'snapshot still propagates after link group dissolves');
});
