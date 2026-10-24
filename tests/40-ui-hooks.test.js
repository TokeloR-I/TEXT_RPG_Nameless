// UI-6, UI-8: engine hooks for the UI kit (equipment screen, turn-order strip).
const { test, assert, GameEngine } = require('./helpers.js');

function fight(cls = 'warrior', seed = 3) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.input('e'); g.input('engage');
    return g;
}

test('UI-8 getTurnOrder: this round from the current actor, the next round by speed, and it changes nothing', () => {
    const g = new GameEngine({ seed: 1 }); g.start();
    assert.strictEqual(g.getTurnOrder(), null, 'no fight, no strip');
    const f = fight();
    const before = f.snapshot().json;
    const t = f.getTurnOrder();
    assert.strictEqual(f.snapshot().json, before);
    assert.strictEqual(t.round, f.combat.round);
    assert.ok(t.now[0].current && t.now.filter((x) => x.current).length === 1);
    assert.strictEqual(t.now[0].id, 'player', 'the fight waits on the player, who is up now');
    assert.ok(t.now.every((x) => ['player', 'enemy', 'minion'].includes(x.side)));
    const ids = new Set(['player', ...f.combat.enemies.filter((e) => e.hp > 0).map((e) => e.id)]);
    assert.deepStrictEqual(new Set(t.next.map((x) => x.id)), ids);
    const spd = t.next.map((x) => f.speedOf([f.player, ...f.combat.enemies].find((y) => y.id === x.id)));
    assert.deepStrictEqual(spd, [...spd].sort((a, b) => b - a));
});

test('UI-8 getTurnOrder: the dead leave the strip', () => {
    const f = fight();
    const e = f.combat.enemies[0];
    e.hp = 0;
    const t = f.getTurnOrder();
    assert.ok(!t.now.some((x) => x.id === e.id) && !t.next.some((x) => x.id === e.id));
});

test('UI-6 getEquipment: slots, candidates with stat changes, and equip/unequip agree with it', () => {
    const g = new GameEngine({ seed: 1 }); g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    g.player.inventory.push('Roadworn Blade', 'Padded Jerkin');
    const before = g.snapshot().json;
    const eq = g.getEquipment();
    assert.strictEqual(g.snapshot().json, before, 'pure');
    assert.deepStrictEqual(Object.keys(eq.slots), ['mainHand', 'bodyArmor', 'accessory']);
    const blade = eq.slots.mainHand.candidates.find((c) => c.item === 'Roadworn Blade');
    assert.ok(blade.enabled);
    assert.deepStrictEqual(blade.diff, g.equipmentDiff('Roadworn Blade'));
    const str = g.player.strength;
    assert.ok(g.act({ type: 'equip', item: 'Roadworn Blade' }).ok);
    assert.strictEqual(g.player.strength, str + (blade.diff.strength || 0));
    assert.strictEqual(g.getEquipment().slots.mainHand.item, 'Roadworn Blade');
    assert.ok(g.act({ type: 'unequip', slot: 'mainHand' }).ok);
    assert.strictEqual(g.player.strength, str);
});

test('UI-6 getEquipment: an item the player cannot wear gives the same reason equip refuses with', () => {
    const g = new GameEngine({ seed: 1 }); g.start();
    g.act({ type: 'choose_class', classId: 'mage' });
    g.data.itemDefinitions['Test Greatsword'] = { type: 'weapon', slot: 'mainHand', statModifiers: { strength: 3 }, requirements: { strength: 999 }, description: 'heavy' };
    g.player.inventory.push('Test Greatsword');
    const c = g.getEquipment().slots.mainHand.candidates.find((x) => x.item === 'Test Greatsword');
    assert.strictEqual(c.enabled, false);
    const r = g.act({ type: 'equip', item: 'Test Greatsword' });
    assert.ok(!r.ok);
    assert.strictEqual(r.error.code, c.reason.code);
    assert.strictEqual(r.error.message, c.reason.message);
    delete g.data.itemDefinitions['Test Greatsword'];
});
