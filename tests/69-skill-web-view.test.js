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
    assert.deepStrictEqual(SW.sealedLegends(view).map((x) => x.name), ['Deathlord Eternal', 'Fallen Seraphim', 'Reality Breaker']);
});

test('Skill Web screen: the radial scene keeps one web, links each pair once and gives every branch a wedge', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'free');
    assert.ok(g.act({ type: 'learn_node', nodeId: 'berserker.1.skill' }).ok);
    const view = g.getSkillWeb();
    const sc = SW.scene(view, 'warrior', { berserker: 'Berserker' });
    assert.ok(sc.nodes.length > 20 && sc.nodes.every((n) => n.region === 'warrior'));
    const keys = sc.links.map((l) => [l.a, l.b].sort().join('|'));
    assert.strictEqual(new Set(keys).size, keys.length);
    assert.deepStrictEqual(sc.sectors.map((s) => s.branch).sort(), ['berserker', 'vanguard', 'warden']);
    assert.strictEqual(sc.sectors.find((s) => s.branch === 'berserker').name, 'Berserker');
    assert.ok(sc.links.some((l) => l.owned) && sc.links.some((l) => l.open));
    const html = SW.screenSvg(sc, 'heart.warrior', { title: 'Warrior web' });
    assert.strictEqual((html.match(/class="swx-wedge/g) || []).length, 3);
    assert.match(html, /swx-emblem/);
    assert.ok(!/region="rogue"|data-node="rogue\./.test(html));
});

test('Skill Web screen: arrows travel to a node in that direction, and a fresh screen opens on something learnable', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'free');
    const view = g.getSkillWeb();
    const sc = SW.scene(view, 'warrior');
    const start = SW.startNode(sc);
    assert.strictEqual(view.nodes.find((n) => n.id === start).state, 'available');
    const from = sc.nodes.find((n) => n.id === start);
    for (const dir of ['up', 'down', 'left', 'right']) {
        const to = SW.nearest(sc, start, dir);
        if (!to) continue;
        const t = sc.nodes.find((n) => n.id === to);
        const d = { up: from.py - t.py, down: t.py - from.py, left: from.px - t.px, right: t.px - from.px }[dir];
        assert.ok(d > 0, `${dir} moved the wrong way`);
    }
});

test('Skill Web screen: the node card offers exactly what act() allows', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'free');
    for (const id of g.getSkillWeb().nodes.filter((n) => n.region === 'warrior').map((n) => n.id)) {
        const card = SW.nodeCard(g.getSkillWeb(), id, (name) => g.describeSkill ? g.describeSkill(name) : null);
        if (card.action === 'learn') {
            const r = g.act({ type: 'learn_node', nodeId: id });
            assert.ok(r.ok, `${id}: card said learn`);
            assert.strictEqual(SW.nodeCard(g.getSkillWeb(), id).action, 'unlearn');
            assert.ok(g.act({ type: 'unlearn_node', nodeId: id }).ok);
        } else if (card.action === null) {
            assert.ok(!g.act({ type: 'learn_node', nodeId: id }).ok, `${id}: card offered nothing but act() learned it`);
        }
    }
    const fixed = SW.nodeCard(g.getSkillWeb(), 'heart.warrior');
    assert.strictEqual(fixed.action, null);
});
