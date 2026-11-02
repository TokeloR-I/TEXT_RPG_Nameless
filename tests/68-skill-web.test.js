// Skill Web (Tokelo 2026-11-02, docs/design/SKILL_WEB.md): one connected web replaces locked class trees.
const { test, assert, newGame, assertHealthy, data } = require('./helpers.js');
const { GameEngine } = require('../src/engine.js');
const SkillWeb = require('../src/engine/skill-web.js');

const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); return g; };
const node = (g, id) => g.getSkillWeb().nodes.find((n) => n.id === id);

test('Skill Web: the data builds into one connected web with no problems, at the planned scale', () => {
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
    const web = SkillWeb.buildSkillWeb(data);
    assert.ok(web.list.length >= 80, `only ${web.list.length} nodes`);
    // Every skill a class starts with or a branch grants is somewhere in the web.
    const granted = new Set(web.list.filter((n) => n.skill).map((n) => n.skill));
    for (const c of Object.values(data.basePlayerClasses)) for (const s of c.startingSkills) assert.ok(granted.has(s), s);
    for (const tree of Object.values(data.evolutionPaths)) for (const b of Object.values(tree.branches))
        for (const st of b.stages) { if (st.skill) assert.ok(granted.has(st.skill), st.skill); assert.ok(web.list.some((n) => n.trait && n.trait.name === st.trait), st.trait); }
    // Hearts are linked in a ring, and at least one bridge leaves every class.
    assert.ok(web.nodes.get('heart.warrior').links.includes('heart.rogue'));
    assert.ok(web.nodes.get('heart.warrior').links.includes('heart.necromancer'));
});

test('Skill Web: validation reports a broken link, an unknown skill and an island', () => {
    const bad = (patch) => SkillWeb.validateSkillWeb({ ...data, skillWeb: { ...data.skillWeb, ...patch } });
    assert.match(bad({ bridges: [['heart.warrior', 'nowhere']] })[0], /missing node/);
    assert.ok(bad({ extraNodes: [{ id: 'x', kind: 'active', region: 'warrior', skill: 'Not A Skill', links: ['heart.warrior'] }] }).some((p) => /not in skillDefinitions/.test(p)));
    assert.ok(bad({ extraNodes: [{ id: 'island', kind: 'active', region: 'warrior', skill: 'War Cry', links: [] }] }).some((p) => /island: not linked/.test(p)));
});

test('Skill Web: a new character owns its heart and starting skills for free and earns one point per level', () => {
    const g = newGame().do('warrior');
    const view = g.getSkillWeb();
    assert.deepStrictEqual(view.nodes.filter((n) => n.owned).map((n) => n.id).sort(), ['heart.warrior', 'warrior.guard', 'warrior.power_strike', 'warrior.slash']);
    assert.strictEqual(view.points, 0);
    levelTo(g, 2);
    assert.strictEqual(g.getSkillWeb().points, 1);
    assert.strictEqual(node(g, 'warrior.war_cry').state, 'available');
    assert.strictEqual(node(g, 'heart.rogue').state, 'available');           // the ring: a neighbouring class opens
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

test('Skill Web: a warrior can cross into the necromancer web and use its skills, paid from its own pool', () => {
    const g = newGame().do('warrior');
    levelTo(g, 3);
    g.mode = 'explore'; g.pendingBranchChoice = false;
    let r = g.act({ type: 'learn_node', nodeId: 'Grave Bolt' });
    assert.strictEqual(r.error.code, 'NOT_CONNECTED');
    r = g.act({ type: 'learn_node', nodeId: 'heart.necromancer' });
    assert.ok(r.ok, JSON.stringify(r.error));
    r = g.act({ type: 'learn_node', nodeId: 'raise skeleton' });    // by name, any case
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.ok(g.player.skills.includes('Raise Skeleton'));
    assert.strictEqual(g.getSkillWeb().points, 0);
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'Grave Bolt' }).error.code, 'NO_WEB_POINTS');
    // The new skill sits on the skill bar.
    assert.ok(g.skillBarView().some((s) => s.skillId === 'Raise Skeleton'));
    // And it works in a fight, paid in Momentum.
    g.do('engage');
    assert.strictEqual(g.mode, 'combat');
    g.player.resource.current = 5;
    const opt = g.getAvailableActions().actions.find((a) => a.skillId === 'Raise Skeleton');
    assert.ok(opt.enabled, JSON.stringify(opt.reason));
    assert.strictEqual(opt.resource, 'Momentum');
    g.act({ type: 'skill', skillId: 'Raise Skeleton' });
    assert.ok(g.combat.minions.length >= 1);
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'Grave Bolt' }).error.code, 'IN_COMBAT');
    assertHealthy(g);
});

test('Skill Web: a cross-class specialization takes that branch\'s title and resource, and you can switch back', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'berserker');
    assert.strictEqual(g.player.resource.type, 'Fury Gauge');
    levelTo(g, 5);
    g.do('guide off');
    levelTo(g, 7);                                              // two free points
    // Fury Gauge -> through the Hemorrhage bridge into Plaguecaller: Contagion, then Virulent Touch.
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Contagion' }).ok);
    assert.ok(g.act({ type: 'learn_node', nodeId: 'Virulent Touch' }).ok);
    assert.strictEqual(g.progression.branch, 'berserker');    // learning does not change who you are
    assert.deepStrictEqual(g.getSkillWeb().specializations.map((s) => s.branchId).sort(), ['berserker', 'plaguecaller']);
    assert.ok(g.act({ type: 'set_specialization', branchId: 'plaguecaller' }).ok);
    assert.strictEqual(g.progression.evolutionName, 'Plaguecaller');
    assert.strictEqual(g.player.resource.type, 'Soul Energy');
    assert.ok(g.act({ type: 'set_specialization', branchId: 'Berserker' }).ok);
    assert.strictEqual(g.player.resource.type, 'Fury Gauge');
    assert.strictEqual(g.act({ type: 'set_specialization', branchId: 'soulbinder' }).error.code, 'SPEC_LOCKED');
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
    assert.strictEqual(g.act({ type: 'learn_node', nodeId: 'heart.rogue' }).error.code, 'WEB_UNAVAILABLE');
});
