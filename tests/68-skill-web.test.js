// Skill Webs (Tokelo 2026-11-02, docs/design/SKILL_WEB.md): each class has its own web; gateways cross between them.
const { test, assert, newGame, assertHealthy, data } = require('./helpers.js');
const { GameEngine } = require('../src/engine.js');
const SkillWeb = require('../src/engine/skill-web.js');

const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); return g; };
const node = (g, id) => g.getSkillWeb().nodes.find((n) => n.id === id);

test('Skill Web: each class has its own web, valid, at the planned scale; only gateways cross between webs', () => {
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
    const web = SkillWeb.buildSkillWeb(data);
    assert.deepStrictEqual(web.webs.sort(), ['mage', 'necromancer', 'rogue', 'warrior']);
    assert.ok(web.list.filter((n) => n.skill).length >= 70, 'skills');
    // Every skill a class starts with or a branch grants is in its own class's web.
    for (const [cls, def] of Object.entries(data.basePlayerClasses)) for (const s of def.startingSkills) assert.ok(web.list.some((n) => n.skill === s && n.region === cls), s);
    for (const [cls, tree] of Object.entries(data.evolutionPaths)) for (const b of Object.values(tree.branches))
        for (const st of b.stages) {
            if (st.skill) assert.ok(web.list.some((n) => n.skill === st.skill && n.region === cls), st.skill);
            assert.ok(web.list.some((n) => n.trait && n.trait.name === st.trait && n.region === cls), st.trait);
        }
    // Hearts no longer touch each other; every link between webs runs through a gateway, and each class has gateways out.
    assert.ok(!web.nodes.get('heart.warrior').links.some((id) => id.startsWith('heart.')));
    for (const n of web.list) for (const to of n.links) {
        const t = web.nodes.get(to);
        if (t.region !== n.region) assert.ok(n.kind === 'gateway' || t.kind === 'gateway', `${n.id} - ${to}`);
    }
    for (const c of web.webs) assert.ok(web.list.filter((n) => n.kind === 'gateway' && n.region === c).length >= 3, c);
});

test('Skill Web: validation reports a broken link, an unknown skill, an island and a link that skips the gateways', () => {
    const bad = (patch) => SkillWeb.validateSkillWeb({ ...data, skillWeb: { ...data.skillWeb, ...patch } });
    assert.match(bad({ gateways: [{ id: 'g', from: 'heart.warrior', to: 'nowhere' }] })[0], /missing node/);
    assert.ok(bad({ extraNodes: [{ id: 'x', kind: 'active', region: 'warrior', skill: 'Not A Skill', links: ['heart.warrior'] }] }).some((p) => /not in skillDefinitions/.test(p)));
    assert.ok(bad({ extraNodes: [{ id: 'island', kind: 'active', region: 'warrior', skill: 'War Cry', links: [] }] }).some((p) => /island: not linked/.test(p)));
    assert.ok(bad({ extraNodes: [{ id: 'sneak', kind: 'active', region: 'warrior', skill: 'War Cry', links: ['heart.warrior', 'heart.rogue'] }] }).some((p) => /sneak: links straight into the rogue web/.test(p)));
    assert.ok(bad({ gateways: [{ id: 'g', from: 'heart.warrior', to: 'warrior.slash' }] }).some((p) => /another class's web/.test(p)));
});

test('Skill Web: a new character owns its heart and starting skills for free and earns one point per level', () => {
    const g = newGame().do('warrior');
    const view = g.getSkillWeb();
    assert.deepStrictEqual(view.nodes.filter((n) => n.owned).map((n) => n.id).sort(), ['heart.warrior', 'warrior.guard', 'warrior.power_strike', 'warrior.slash']);
    assert.deepStrictEqual(view.webs.map((w) => [w.classId, w.home, w.entered]),
        [['warrior', true, true], ['mage', false, false], ['rogue', false, false], ['necromancer', false, false]]);
    assert.strictEqual(view.points, 0);
    levelTo(g, 2);
    assert.strictEqual(g.getSkillWeb().points, 1);
    assert.strictEqual(node(g, 'warrior.war_cry').state, 'available');
    assert.strictEqual(node(g, 'heart.rogue').reason.code, 'NOT_CONNECTED');   // another class's web: only through a gateway
    assert.strictEqual(node(g, 'vanguard.1.skill').reason.code, 'LEVEL_TOO_LOW');
    assert.strictEqual(node(g, 'rogue.backstab').reason.code, 'NOT_CONNECTED');
});

test('Skill Web: choosing a path at level 3 evolves exactly as the old trees did (skills, traits, title, resource)', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'vanguard');
    assert.strictEqual(g.player.level, 3);
    assert.ok(g.player.skills.includes('Shield Bash'));
    assert.ok(g.hasTrait('Shield Discipline'));
    assert.strictEqual(g.player.traits.find((t) => t.name === 'Shield Discipline').damageReductionOverride, 0.35);
    assert.strictEqual(g.progression.branch, 'vanguard');
    assert.strictEqual(g.progression.evolutionName, 'Vanguard');
    assert.strictEqual(g.player.resource.type, 'Oath Points');
    assert.strictEqual(g.getSkillWeb().points, 0);
    assert.ok(/You become a Vanguard/.test(g.text()));
    levelTo(g, 14);    // the guide keeps following; Dark Knight waits on its story event, as before
    assert.strictEqual(g.progression.evolutionName, 'Paladin');
    assert.ok(g.player.skills.includes('Holy Smite') && !g.player.skills.includes('Soul Rend'));
    g.do('unlock_events');
    assert.strictEqual(g.progression.evolutionName, 'Abyssal King');
    assert.strictEqual(g.player.resource.type, 'Sin Marks');
    assert.ok(g.player.skills.includes('Oblivion Reign'));
    assert.strictEqual(g.getSkillWeb().points, 3);   // 13 earned, 10 on the path
    assertHealthy(g);
});

test('Skill Web: the existing evolutions still come out the same for every class (Bone Warden, Plaguecaller, Soulbinder…)', () => {
    for (const [cls, path, title, skill] of [['necromancer', 'bone warden', 'Bone Warden', 'Bone Wall'], ['necromancer', 'plaguecaller', 'Plaguecaller', 'Contagion'],
        ['rogue', 'assassin', 'Assassin', 'Shadowstep'], ['mage', 'chronomancer', 'Chronomancer', 'haste']]) {
        const g = newGame().do(cls, 'add_xp 250', path);
        assert.strictEqual(g.progression.evolutionName, title, cls + path);
        assert.ok(g.player.skills.includes(skill), skill);
    }
    const g = newGame().do('necromancer', 'add_xp 250', 'plaguecaller');
    levelTo(g, 14);
    assert.strictEqual(g.progression.evolutionName, 'Plague Sovereign');
    for (const s of ['Black Spit', 'Plague Burst', 'Withering Curse', 'Plague of Ages']) assert.ok(g.player.skills.includes(s), s);
    assert.ok(g.hasTrait('All DoTs become true dmg, ignore resistances.'));
});

test('Skill Web: a warrior crosses a gateway into the rogue web, uses its skills from its own pool, and can walk as a Duelist', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'berserker');
    assert.strictEqual(g.player.resource.type, 'Fury Gauge');
    levelTo(g, 5);                                              // the guide learns Whirlwind (Ravager)
    g.do('guide off');
    levelTo(g, 10);                                             // five free points
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'Flurry' }).error.code, 'NOT_CONNECTED');
    let r = g.act({ type: 'learn_node', nodeId: 'gate.blade_frenzy' });
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.strictEqual(g.getSkillWeb().points, 3);              // a gateway costs 2
    assert.ok(g.act({ type: 'learn_node', nodeId: 'flurry' }).ok);   // by name, any case
    assert.ok(g.getSkillWeb().webs.find((w) => w.classId === 'rogue').entered);
    // Inside the rogue web its nodes link as usual: back down the Duelist path.
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Riposte deals +50% dmg' }).ok);
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Riposte' }).ok);
    assert.strictEqual(g.progression.branch, 'berserker');    // learning does not change who you are
    assert.deepStrictEqual(g.getSkillWeb().specializations.map((x) => x.branchId).sort(), ['berserker', 'duelist']);
    assert.ok(g.act({ type: 'set_specialization', branchId: 'duelist' }).ok);
    assert.strictEqual(g.progression.evolutionName, 'Duelist');
    assert.strictEqual(g.player.resource.type, 'Combo Points');
    assert.ok(g.act({ type: 'set_specialization', branchId: 'Berserker' }).ok);
    assert.strictEqual(g.player.resource.type, 'Fury Gauge');
    assert.strictEqual(g.act({ type: 'set_specialization', branchId: 'soulbinder' }).error.code, 'SPEC_LOCKED');
    // The borrowed skill sits on the skill bar and works in a fight, paid from the warrior's pool.
    assert.ok(g.skillBarView().some((x) => x.skillId === 'Flurry'));
    g.do('engage');
    assert.strictEqual(g.mode, 'combat');
    g.player.resource.current = 5;
    const opt = g.getAvailableActions().actions.find((a) => a.skillId === 'Flurry');
    assert.ok(opt.enabled, JSON.stringify(opt.reason));
    assert.strictEqual(opt.resource, 'Fury Gauge');
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'Backstab' }).error.code, 'IN_COMBAT');
    assertHealthy(g);
});

test('Skill Web: a gateway only opens from its own web; the other class cannot use it backwards', () => {
    const g = newGame().do('rogue', 'add_xp 250', 'duelist');
    levelTo(g, 8);
    g.do('guide off');
    levelTo(g, 10);
    assert.ok(node(g, 'duelist.2.skill').owned);               // Flurry: the far end of the warrior's Blade Frenzy gateway
    assert.strictEqual(node(g, 'gate.blade_frenzy').reason.code, 'NOT_CONNECTED');
    assert.strictEqual(node(g, 'berserker.2.skill').reason.code, 'NOT_CONNECTED');
    assert.strictEqual(node(g, 'gate.tempo').reason.code, 'NOT_CONNECTED');       // the mage's gateway into the rogue web
});

test('Skill Web: unlearning refunds a point, never cuts the web, and never takes your class kit', () => {
    const g = newGame().do('mage', 'add_xp 250', 'elementalist');
    assert.strictEqual(g.act({ type: 'unlearn_node', nodeId: 'Arcane Bolt' }).error.code, 'NODE_FIXED');
    assert.strictEqual(g.act({ type: 'unlearn_node', nodeId: 'Fireball' }).error.code, 'NODE_ANCHORS_OTHERS');
    assert.ok(g.act({ type: 'unlearn_node', nodeId: 'Elemental Affinity' }).ok);
    assert.ok(!g.hasTrait('Elemental Affinity'));
    assert.strictEqual(g.getSkillWeb().guide, null);            // stepping off the guided path
    assert.strictEqual(g.progression.branch, null);              // stage one is no longer complete
    assert.strictEqual(g.progression.evolutionName, 'Mage');
    assert.ok(g.act({ type: 'unlearn_node', nodeId: 'Fireball' }).ok);
    assert.ok(!g.player.skills.includes('Fireball'));
    assert.strictEqual(g.getSkillWeb().points, 2);
    assert.strictEqual(g.act({ type: 'unlearn_node', nodeId: 'Fireball' }).error.code, 'NOT_LEARNED');
});

test('Skill Web: what the view says is learnable is exactly what learn_node accepts (same codes and messages)', () => {
    const g = newGame().do('rogue', 'add_xp 250', 'duelist');
    levelTo(g, 6);
    for (const n of g.getSkillWeb().nodes.filter((x) => !x.owned)) {
        const probe = new GameEngine({ seed: 1 });
        probe.restore(g.snapshot());
        const r = probe.act({ type: 'learn_node', nodeId: n.id });
        if (n.state === 'available') assert.ok(r.ok, `${n.id}: ${JSON.stringify(r.error)}`);
        else assert.deepStrictEqual(r.error, n.reason, n.id);
    }
});

test('Skill Web: a save from before the web loads with the path it walked', () => {
    const g = newGame().do('necromancer', 'add_xp 250', 'bone warden');
    levelTo(g, 8);
    const save = JSON.parse(JSON.stringify(g.serialize()));
    delete save.state.progression.web;               // what an older save looks like
    const h = GameEngine.fromSave(save);
    const view = h.getSkillWeb();
    assert.strictEqual(view.guide, 'bone_warden');
    for (const id of ['bone_warden.1.skill', 'bone_warden.1.trait', 'bone_warden.3.skill', 'bone_warden.3.trait']) assert.ok(node(h, id).owned, id);
    assert.strictEqual(view.points, 1);               // 7 earned, 6 on the path
    assert.strictEqual(h.progression.evolutionName, 'Gravekeeper');
});

test('Skill Web: text commands show the web and learn by name', () => {
    const g = newGame().do('warrior', 'add_xp 100', 'web');
    assert.match(g.text(), /Skill Web/);
    assert.match(g.text(), /War Cry \(skill, 1 pt\)/);
    g.do('learn war cry');
    assert.ok(g.player.skills.includes('War Cry'));
    g.do('learn backstab');
    assert.match(g.text(), /Backstab isn't connected/);
});

test('Skill Web: the Hollow King stands outside the web', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'warden', 'become_hollow_king');
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'warrior.war_cry' }).error.code, 'WEB_UNAVAILABLE');
});

test('Skill Web: a legendary web (Deathlord Eternal) opens on its conditions and adds to the build', () => {
    const g = newGame().do('necromancer', 'add_xp 250', 'soulbinder');
    levelTo(g, 14);
    assert.strictEqual(g.progression.evolutionName, 'Eternal Lich');
    g.do('guide off');
    g.progression.web.bonusPoints = 20;                          // stand-in for a long hybrid run
    let leg = g.getSkillWeb().legendaryWebs.find((w) => w.webId === 'deathlord_eternal');
    assert.deepStrictEqual(leg.missing, ['Abyssal King', 'the Throne of Bones']);
    assert.strictEqual(node(g, 'heart.deathlord_eternal').reason.code, 'LEGEND_LOCKED');
    // Cross into the Warrior web (The Two Walls) and walk Vanguard to Abyssal King.
    for (const id of ['bone_warden.1.skill', 'gate.two_walls', 'vanguard.1.skill', 'vanguard.1.trait', 'vanguard.2.skill', 'vanguard.2.trait', 'vanguard.3.skill', 'vanguard.3.trait'])
        assert.ok(g.act({ type: 'learn_node', nodeId: id }).ok, id);
    g.do('unlock_events');
    for (const id of ['vanguard.4.skill', 'vanguard.4.trait', 'vanguard.5.skill', 'vanguard.5.trait']) assert.ok(g.act({ type: 'learn_node', nodeId: id }).ok, id);
    leg = g.getSkillWeb().legendaryWebs.find((w) => w.webId === 'deathlord_eternal');
    assert.ok(leg.open && !leg.entered);
    const r = g.act({ type: 'learn_node', nodeId: 'Deathlord Eternal' });
    assert.ok(r.ok);
    assert.ok(r.events.some((e) => /the Deathlord Eternal web opens/.test(e.text || '')));
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Legion of the Dead' }).ok);
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Death’s Dominion' }).ok);
    // On top of the build: the necromancer keeps everything, still walks as the Eternal Lich.
    assert.ok(g.player.skills.includes('Eternal Lich Unmake') && g.player.skills.includes('Oblivion Reign') && g.player.skills.includes('Death’s Dominion'));
    assert.strictEqual(g.progression.evolutionName, 'Eternal Lich');
    // A stage the legend rests on can't be unlearned while the legendary web is held.
    assert.strictEqual(g.act({ type: 'unlearn_node', nodeId: 'vanguard.5.trait' }).error.code, 'NODE_ANCHORS_OTHERS');
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'Reality Breaker' }).error.code, 'LEGEND_LOCKED');
    assertHealthy(g);
});

test('Skill Web: "walk freely" at level 3 leaves every point to the player and never asks again', () => {
    const g = newGame().do('rogue', 'add_xp 250');
    assert.strictEqual(g.mode, 'branch_select');
    const free = g.getAvailableActions().actions.find((a) => a.branchId === 'free');
    assert.ok(free && free.enabled && free.name === 'Walk freely');
    g.do('walk freely');
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.progression.branch, null);
    assert.strictEqual(g.getSkillWeb().points, 2);
    assert.ok(g.getSkillWeb().free);
    levelTo(g, 5);
    assert.strictEqual(g.mode, 'explore');                       // no second prompt
    assert.strictEqual(g.getSkillWeb().points, 4);              // nothing spent for the player
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Shadowstep' }).ok);
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Caltrops' }).ok);
    assert.strictEqual(g.progression.branch, null);              // no stage one complete yet
});

test('Skill Web: stats and growth always come from the starting class, whatever you learn or walk as', () => {
    const plain = newGame().do('warrior', 'add_xp 250', 'berserker');
    levelTo(plain, 10);
    const hybrid = newGame().do('warrior', 'add_xp 250', 'berserker');
    levelTo(hybrid, 5);
    hybrid.do('guide off');
    levelTo(hybrid, 10);
    for (const id of ['gate.blade_frenzy', 'duelist.2.skill', 'duelist.1.trait', 'duelist.1.skill']) assert.ok(hybrid.act({ type: 'learn_node', nodeId: id }).ok, id);
    assert.ok(hybrid.act({ type: 'set_specialization', branchId: 'duelist' }).ok);
    levelTo(hybrid, 12); levelTo(plain, 12);
    for (const k of ['maxHp', 'strength', 'intelligence', 'agility', 'def', 'critChance']) assert.strictEqual(hybrid.player[k], plain.player[k], k);
    assert.strictEqual(hybrid.levelGrowthFor(hybrid.player), data.basePlayerClasses.warrior.levelGrowth);
    assert.strictEqual(hybrid.player.className, 'warrior');
});
