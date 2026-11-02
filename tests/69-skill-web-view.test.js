// Skill Web tab view model (ui/skill-web-view.js, Pixie and Hollis): built only from engine.getSkillWeb().
const { test, assert, newGame } = require('./helpers.js');
const SW = require('../ui/skill-web-view.js');

const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); return g; };

test('Skill Web view: your own web first; another class web appears once a gateway into it can be learned', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'berserker');
    assert.deepStrictEqual(SW.webs(g.getSkillWeb()).map((w) => w.webId), ['warrior']);
    levelTo(g, 6);    // Whirlwind (L5) learned by the path; one free point is not enough for a 2-point gateway, but it is learnable at 7
    levelTo(g, 7);
    const ws = SW.webs(g.getSkillWeb());
    assert.deepStrictEqual(ws.map((w) => w.webId), ['warrior', 'rogue']);
    assert.match(ws[1].why, /Blade Frenzy/);
    assert.strictEqual(ws[0].home, true);
});

test('Skill Web view: rows put what you can learn first, mark the class kit, and carry the engine\'s reasons', () => {
    const g = newGame().do('mage', 'add_xp 250', 'free');
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Fireball' }).ok);
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Elemental Affinity' }).ok);
    levelTo(g, 4);
    const view = g.getSkillWeb();
    const rows = SW.rows(view, 'mage');
    assert.strictEqual(rows[0].state, 'available');
    assert.ok(rows.some((r) => r.label === 'Arcane Bolt' && r.action === null && /class kit/.test(r.sub)));
    assert.ok(!rows.some((r) => r.id === 'heart.mage'));
    const locked = rows.find((r) => r.state === 'locked');
    assert.ok(locked && locked.sub === view.nodes.find((n) => n.id === locked.id).reason.message);
    // Nothing unreachable is listed (it only shows faintly on the picture).
    for (const r of rows) assert.notStrictEqual((view.nodes.find((n) => n.id === r.id).reason || {}).code, 'NOT_CONNECTED');
    // Learning from a row's action works, and the row becomes known.
    const pick = rows.find((r) => r.action === 'learn');
    assert.ok(g.act({ type: 'learn_node', nodeId: pick.id }).ok);
    assert.strictEqual(SW.rows(g.getSkillWeb(), 'mage').find((r) => r.id === pick.id).action, 'unlearn');
});

test('Skill Web view: the picture draws only that web, with the selected node ringed and every node titled', () => {
    const g = newGame().do('necromancer', 'add_xp 250', 'plaguecaller');
    const view = g.getSkillWeb();
    const svg = SW.svg(view, 'necromancer', 'plaguecaller.1.skill');
    const ids = [...svg.matchAll(/data-node="([^"]+)"/g)].map((m) => m[1]);
    assert.strictEqual(ids.length, view.nodes.filter((n) => n.region === 'necromancer').length);
    assert.ok(/class="sw-owned sw-sel" data-node="plaguecaller.1.skill"/.test(svg));
    assert.strictEqual((svg.match(/<title>/g) || []).length, ids.length);
    assert.match(SW.summary(view), /walking as Plaguecaller · a path guides your points/);
    assert.deepStrictEqual(SW.sealedLegends(view).map((x) => x.name), ['Deathlord Eternal', 'Reality Breaker']);
});
