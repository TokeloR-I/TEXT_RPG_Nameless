// Dev cheats for testing powers without the story (Tokelo 2026-11-17). Engine: src/engine/cheats.js; the hidden
// Cheats tab in the world's Esc menu: ui/world-ui.js. Every cheat is the `cheat` action, and a cheated save loads.
const { test, assert, GameEngine, data } = require('./helpers.js');

function world(cls = 'warrior', mode = 'turn') {
    const g = new GameEngine({ seed: 110, combatMode: mode });
    g.start(); g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    g.flush();
    return g;
}
const cheat = (g, name, amount) => { const r = g.act({ type: 'cheat', cheat: name, amount }); assert.ok(r.ok, `${name}: ${r.error && r.error.message}`); return r; };
/** set_level, then walk freely if the path choice comes up (it does at level 3, as in play). */
const levelTo = (g, n) => { const r = cheat(g, 'set_level', n); if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: 'free' }); return r; };
const reload = (g) => GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize({ label: 'cheat test' }))), { combatMode: g.combatMode });

test('Dev cheats: level, gold, Skill Web points and items, in one line each; the save remembers a cheat was used', () => {
    const g = world();
    const r = levelTo(g, 12);
    assert.strictEqual(g.player.level, 12);
    assert.ok(/Level 1 -> 12/.test(r.events[0].text));
    assert.ok(!r.events.some((e) => /Congratulations/.test(e.text || '')), 'one summary, not a line per level');
    assert.strictEqual(g.player.hp, g.player.maxHp);
    cheat(g, 'add_gold', 1000000);
    assert.strictEqual(g.player.gold, 1000000);
    const before = g.webPoints();
    cheat(g, 'web_points', 5);
    assert.strictEqual(g.webPoints(), before + 5);
    cheat(g, 'give_item', 'Bog Iron x5');
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Bog Iron').length, 5);
    assert.strictEqual(g.act({ type: 'cheat', cheat: 'give_item', amount: 'Nonsense Spoon' }).error.code, 'UNKNOWN_ITEM');
    assert.strictEqual(g.act({ type: 'cheat', cheat: 'set_level', amount: 3 }).error.code, 'LEVEL_TOO_LOW');
    assert.strictEqual(g.flags.devCheats, true);
    const back = reload(g);
    assert.strictEqual(back.player.level, 12);
    assert.strictEqual(back.player.gold, 1000000);
    assert.strictEqual(back.flags.devCheats, true);
});

test('Dev cheats: the text game runs any of them as "cheat <name> <arg>"', () => {
    const g = world();
    g.input('cheat set_level 2');
    assert.strictEqual(g.player.level, 2);
    g.input('cheat give_item Bandages x2');
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Bandages').length >= 2, true);
});

test('Dev cheats: god mode takes no damage, one-hit kills, and both work mid-fight', () => {
    const g = world();
    g.startCombat(['hungry_wolf']);
    assert.strictEqual(g.mode, 'combat');
    cheat(g, 'god_mode', 'on');
    const hp = g.player.hp;
    assert.strictEqual(g.damage(g.player, 50, g.combat.enemies[0]), 0);
    assert.strictEqual(g.player.hp, hp);
    cheat(g, 'one_hit', 'on');
    const wolf = g.combat.enemies[0];
    g.damage(wolf, 1, g.player);
    assert.ok(wolf.hp <= 0, 'one hit kills');
    assert.strictEqual(g.act({ type: 'cheat', cheat: 'set_level', amount: 9 }).error.code, 'IN_COMBAT', 'world-changing cheats wait for the fight to end');
    cheat(g, 'god_mode', 'off');
    assert.strictEqual(g.flags.godMode, false);
});

test('Dev cheats: learn a whole class web without spending your own points, and a foreign web through its gateway', () => {
    const g = world('rogue');
    levelTo(g, 20);
    const pts = g.webPoints();
    cheat(g, 'learn_web', 'rogue');
    const web = g.skillWeb();
    const left = web.list.filter((n) => n.region === 'rogue' && n.kind !== 'gateway' && !n.taught && !g.webOwns(n.id));
    assert.deepStrictEqual(left.map((n) => n.id), []);
    assert.strictEqual(g.webPoints(), pts, 'the cheat pays for what it learns');
    cheat(g, 'learn_web', 'mage');
    assert.ok(web.list.filter((n) => n.region === 'mage' && g.webOwns(n.id)).length > 10, 'mage nodes learned');
    assert.strictEqual(g.webPoints(), pts);
    const back = reload(g);
    assert.strictEqual(back.webPoints(), pts);
});

test('Dev cheats: every legendary web with a story flag opens, and its whole web can be learned', () => {
    for (const legId of ['fallen_seraphim', 'fenrirs_heir', 'devil_union']) {
        const g = world('mage');
        levelTo(g, 20);
        cheat(g, 'awaken_legend', legId);
        assert.ok(g.webOwns(`heart.${legId}`), `${legId} opens`);
        if (legId === 'fallen_seraphim') cheat(g, 'pass_trial', legId);
        cheat(g, 'learn_web', legId);
        const missing = g.skillWeb().list.filter((n) => n.region === legId && !g.webOwns(n.id) && !n.contract);
        assert.deepStrictEqual(missing.map((n) => n.id), [], `${legId}: all learned`);
        assert.ok(reload(g).webOwns(`heart.${legId}`));
    }
});

test('Dev cheats: all four Devil Union contracts, Demonkore\'s Favor, and LEG CRAMP!', () => {
    const g = world('necromancer', 'realtime');
    levelTo(g, 20);
    cheat(g, 'bind_all_contracts');
    const cat = g.cheatCatalog();
    assert.deepStrictEqual(cat.unions.filter((u) => !u.bound), []);
    assert.deepStrictEqual(g.unionContracts().sort(), ['beelzebub', 'lucifero', 'plumede', 'slotos']);
    cheat(g, 'demonkore_favor');
    assert.ok(g.hasStoryFlag('demonkore_favor'));
    cheat(g, 'learn_web', 'devil_union');
    assert.ok(g.player.skills.includes('Gravity Well') || g.skillWeb().list.some((n) => n.region === 'devil_union' && n.union && g.webOwns(n.id)));
    cheat(g, 'teach_leg_cramp');
    assert.ok(g.player.skills.includes('LEG CRAMP!'));
});

test('Dev cheats: temper the held weapon for free, up to its last rank', () => {
    const g = world('warrior');
    const main = g.player.equipment.mainHand;
    assert.ok(main, 'starts with a weapon');
    const max = data.smithingRules.temper.ranks.length;
    for (let i = 0; i < max; i++) cheat(g, 'temper_weapon');
    assert.strictEqual(g.itemDef(g.player.equipment.mainHand).tempered, max);
    assert.strictEqual(g.act({ type: 'cheat', cheat: 'temper_weapon' }).error.code, 'TEMPER_MAX');
    assert.strictEqual(reload(g).itemDef(g.player.equipment.mainHand).tempered, max);
});

test('Dev cheats: start and finish quests, with their rewards; the catalog lists everything the tab needs', () => {
    const g = world('warrior');
    const cat = g.cheatCatalog();
    assert.ok(cat.quests.length > 10);
    assert.ok(cat.legends.some((l) => l.id === 'fallen_seraphim'));
    assert.ok(cat.itemGroups.some((x) => x.id === 'armor'));
    const q = cat.quests.find((x) => x.state === 'active') || cat.quests[0];
    const xp = g.player.xp + g.player.level * 1000;
    cheat(g, 'finish_quest', q.id);
    assert.strictEqual(g.questState(q.id), 'complete');
    assert.ok(g.player.xp + g.player.level * 1000 >= xp);
    assert.strictEqual(g.act({ type: 'cheat', cheat: 'finish_quest', amount: q.id }).error.code, 'QUEST_DONE');
    reload(g);
});
