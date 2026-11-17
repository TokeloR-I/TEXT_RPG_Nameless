// The Second, Third and Fourth Dominions (Tokelo, 2026-11-17: "listen you have freedom on the arenas, model them to how
// you see fit"). Once Lucifero is bound, three rifts in the First Dominion lead to Beelzebub (space), Slotos (toughness)
// and Plumede (agility), in any order; each Dominion is five waves and its ruler, and the contract is made with the
// grimoire in its binding circle. Whichever ruler is bound third sees Demonkore's mark.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const data = require('../src/data.js');
const { takeExit, contact, inspect } = require('./world-helpers.js');

const RULERS = [['beelzebub', 'Second', 'arena_rift_beelzebub'], ['slotos', 'Third', 'arena_rift_slotos'], ['plumede', 'Fourth', 'arena_rift_plumede']];

function run() {
    const g = new GameEngine({ seed: 109 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    g.story.flags.push('chapter_one_complete', 'james_recruited', 'james_settled', 'demonkore_heard', 'grimoire_obtained', 'underworld_opened');
    g.player.inventory.push('Binding Grimoire');
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('underworld_arena', 'from_homestead');
    return { g, s };
}
function say(g, re) {
    const a = g.getAvailableActions(), c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
function win(g) {
    for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        if (g.getAvailableActions().awaiting === 'continue') g.act({ type: 'continue' });
        else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id });
    }
    assert.strictEqual(g.world.lastResult, 'victory');
}
function settle(g) { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: g.getAvailableActions().actions[0].branchId }); }
const seen = (s, map, id) => s.visibleObjects(map).some((o) => o.id === id);
/** Is the rift there? (Exits are not placed objects: ask the map at the rift's tile.) */
const riftOpen = (s, id) => { const e = s.map.exits.find((x) => x.id === id); return !!s.exitAt(e.x, e.y, 'step'); };

/** Through the rift, five waves, the ruler, and the contract in the circle; back out to the First Dominion. */
function clearDominion(g, s, id, rift) {
    const map = `dominion_${id}`;
    const r = takeExit(s, rift);
    assert.strictEqual(r.type, 'transition', `${rift} leads somewhere`); assert.strictEqual(s.mapId, map);
    for (let n = 1; n <= 5; n++) {
        for (let k = n + 1; k <= 5; k++) assert.ok(!seen(s, map, `${id}_wave_${k}`), `${id}: wave ${k} waits for wave ${n}`);
        assert.ok(!seen(s, map, `${id}_ruler`), `${id}: the ruler waits for all five`);
        g.player.hp = g.player.maxHp;
        assert.strictEqual(contact(s, `${id}_wave_${n}`).type, 'encounter', `${id} wave ${n} starts a fight`);
        win(g); s.fightOver(`${id}_wave_${n}`, 'victory'); settle(g);
        assert.ok(g.hasStoryFlag(`${id}_wave_${n}`));
    }
    assert.ok(!seen(s, map, `${id}_bound_npc`), `${id}: no kneeling ruler before the fight`);
    g.player.hp = g.player.maxHp;
    assert.strictEqual(contact(s, `${id}_ruler`).type, 'encounter');
    win(g); s.fightOver(`${id}_ruler`, 'victory'); settle(g);
    assert.ok(g.hasStoryFlag(`${id}_ruler_beaten`));
    const drop = data.enemies[id].bossDrops[0].item;
    assert.ok(g.player.inventory.includes(drop) || Object.values(g.player.equipment || {}).includes(drop), `${id}: boss drop ${drop}`);
    assert.strictEqual(inspect(s, `${id}_bound_npc`).type, 'talk');
    say(g, /Open the grimoire/);
    assert.ok(g.hasStoryFlag(`contract:${id}`), `${id}: bound`);
}

test('Dominions: the three rifts open only once Lucifero is bound, each to its own Dominion, and lead back', () => {
    const { g, s } = run();
    for (const [, , rift] of RULERS) assert.ok(!riftOpen(s, rift), `${rift} shut before the first contract`);
    g.story.flags.push('devil_union_contract', 'contract:lucifero');
    for (const [id, ordinal, rift] of RULERS) {
        assert.ok(riftOpen(s, rift), `${rift} open`);
        takeExit(s, rift);
        assert.strictEqual(s.mapId, `dominion_${id}`);
        assert.strictEqual(s.map.name, `The ${ordinal} Dominion`);
        const back = takeExit(s, `${id}_rift_back`);
        assert.strictEqual(back.type, 'transition'); assert.strictEqual(s.mapId, 'underworld_arena');
        assert.ok(!s.exitAt(s.x, s.y, 'step'), 'you come back beside the rift, not on it');
    }
});

test('Dominions: every one played through in a different order binds its ruler; the third contract shows the mark, once', () => {
    const { g, s } = run();
    g.story.flags.push('devil_union_contract', 'contract:lucifero');
    // Plumede first, then Beelzebub: two more contracts, three in all. The third shows Demonkore's mark.
    clearDominion(g, s, 'plumede', 'arena_rift_plumede');
    say(g, /Goodbye/);
    takeExit(s, 'plumede_rift_back');
    clearDominion(g, s, 'beelzebub', 'arena_rift_beelzebub');
    assert.ok(!g.hasStoryFlag('demonkore_mark_recognized'));
    say(g, /Close the grimoire/); say(g, /What about it/); say(g, /From a merchant/); say(g, /Explain yourself/); say(g, /Demonkore\?/);
    assert.ok(g.hasStoryFlag('demonkore_mark_recognized'));
    assert.strictEqual(g.questState('CB3'), 'active');
    say(g, /Goodbye/);
    // The fourth contract: no second mark scene.
    takeExit(s, 'beelzebub_rift_back');
    clearDominion(g, s, 'slotos', 'arena_rift_slotos');
    assert.ok(!(g.getAvailableActions().actions || []).some((a) => a.type === 'dialogue_choice' && /Close the grimoire/.test(a.text)));
    say(g, /Goodbye/);
    assert.strictEqual(inspect(s, 'slotos_bound_npc').type, 'talk');
    assert.ok((g.getAvailableActions().actions || []).some((a) => a.type === 'dialogue_choice' && /Goodbye/.test(a.text)), 'bound: his parting line');
    say(g, /Goodbye/);
    for (const [id] of RULERS) assert.ok(g.hasStoryFlag(`contract:${id}`));
    assert.strictEqual(g.errors.length, 0);
});

test('Dominions: each floor connects, and every wave, ruler and the circle stand on open floor', () => {
    for (const [id] of RULERS) {
        const map = ZONE1.maps[`dominion_${id}`];
        const walk = (x, y) => { const d = map.legend[map.tiles[y][x]]; return d && !d.solid; };
        map.tiles.forEach((row) => assert.strictEqual(row.length, 28));
        const start = map.spawns.from_first_dominion, seenAt = new Set([`${start.x},${start.y}`]), q = [[start.x, start.y]];
        while (q.length) {
            const [x, y] = q.shift();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${x + dx},${y + dy}`;
                if (!seenAt.has(k) && walk(x + dx, y + dy)) { seenAt.add(k); q.push([x + dx, y + dy]); }
            }
        }
        for (const o of [...map.encounters, ...map.interactables.filter((i) => i.kind === 'npc')]) assert.ok(seenAt.has(`${o.x},${o.y}`), `${id}: ${o.id} reachable`);
    }
});

test('Dominions: each ruler and new mob has turn stats, a live-fight kit, loot and enemy art', () => {
    const art = require('../assets/sprites/enso-enemies.js');
    for (const key of ['rift_stalker', 'beelzebub', 'iron_carapace', 'slotos', 'feather_shrike', 'plumede']) {
        assert.ok(data.enemies[key], `${key} stats`);
        assert.ok(data.actionRules.enemies[key], `${key} kit`);
        for (const a of data.actionRules.enemies[key].attacks) assert.ok(data.enemies[key].skills.some((s) => s.name === a.skill), `${key} ${a.name} uses its own skill`);
        assert.ok(data.enemies[key].lootLevel && data.enemies[key].lootProfile === 'demon', `${key} loot`);
        assert.ok(art.keys.includes(key), `${key} art`);
    }
    for (const [id, ordinal] of RULERS) {
        const u = data.skillWeb.legendaryWebs.devil_union.unions.list[id];
        assert.strictEqual(u.title, `Ruler of the ${ordinal} Dominion`);
        assert.ok(data.itemDefinitions[`Signet of the ${ordinal} Dominion`], `${id}'s signet exists`);
    }
});

test('Dominions: each ruler fights live (rage included) without errors, and lands its signature condition kit', () => {
    const { ActionSim } = require('../src/action/sim.js');
    const { doubleWorld } = require('../src/world/scale16.js');
    const WORLD = doubleWorld(ZONE1);
    const STEP = 1000 / 60;
    for (const [id] of RULERS) {
        const g = new GameEngine({ seed: 109, combatMode: 'action' });
        g.start(); g.input('warrior'); g.enterWorld();
        g.story.flags.push('contract:lucifero', ...[1, 2, 3, 4, 5].map((n) => `${id}_wave_${n}`));
        const s = new WorldSession(WORLD, { engine: g });
        s.place(`dominion_${id}`, 'from_first_dominion');
        const enc = WORLD.maps[`dominion_${id}`].encounters.find((e) => e.id === `${id}_ruler`);
        s.x = enc.x; s.y = enc.y + 6;
        const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 109 });
        for (let i = 0; i < 20; i++) sim.update(STEP, {});
        g.player.hp = g.player.maxHp = 99999;
        sim.engageGroup(sim.groups[`${id}_ruler`]);
        const b = sim.actors.find((a) => a.key === id);
        assert.ok(b, `${id} is on the floor`);
        const used = new Set();
        for (let f = 0; f < 60 * 60; f++) {
            const out = sim.update(STEP, {});
            if (b.windup && b.windup.base) used.add(b.windup.base.name);
            if (f === 60 * 25) { const e = g.combat.enemies.find((x) => x.id === b.engineId); e.hp = Math.floor(e.maxHp * 0.5); }   // into its rage
            g.player.hp = g.player.maxHp;
            if (!g.combat) break;
        }
        assert.ok(used.size >= 3, `${id} used several moves (${[...used].join(', ')})`);
        assert.strictEqual(g.errors.length, 0, `${id}: ${g.errors.join('; ')}`);
    }
});

// Tokelo (2026-11-17): "can we take a page out of Black Clover's devil union? ... dark looking armor or shadowy design".
test('Merge look: each demon dresses the hero in its own dark armor, bursts in and fades out', () => {
    const fx = require('../ui/union-fx.js');
    const player = require('../assets/sprites/enso-player.js');
    const P = (global.ENSO || globalThis.ENSO).ensoPlayer || player;
    const roles = Object.keys(P.paletteFor({}));
    for (const id of ['lucifero', 'beelzebub', 'slotos', 'plumede']) {
        const pal = fx.palette(id);
        assert.ok(pal && pal.cloth && pal.metal && pal.eye, `${id} has an armor palette`);
        const plain = P.paletteFor({}), armored = P.paletteFor({ palette: pal });
        assert.ok(roles.some((r) => plain[r] !== armored[r]), `${id}'s armor recolours the sprite`);
        assert.ok(data.skillWeb.legendaryWebs.devil_union.unions.list[id], `${id} is a union`);
    }
    fx.reset();
    const start = fx.state('slotos', 1000);
    assert.ok(start.burst > 0.9 && start.k === 0, 'a burst as the merge begins');
    assert.strictEqual(fx.state('slotos', 2000).k, 1);
    const fading = fx.state(null, 2100);
    assert.ok(fading && fading.fading && fading.k > 0 && fading.id === 'slotos', 'the armor smokes away');
    assert.strictEqual(fx.state(null, 4000), null);
    // Every piece draws without throwing, facing either way, still, walking, dashing and hit.
    let px = 0;
    const g = new Proxy({}, { get: (t, k) => (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'fillRect' ? () => { px++; } : () => {}), set: () => true });
    for (const id of ['lucifero', 'beelzebub', 'slotos', 'plumede']) for (const view of [{ facing: 'down' }, { facing: 'up', moving: true }, { facing: 'left', anim: 'dodge' }, { facing: 'right', anim: 'hurt', animT: 50 }]) {
        fx.reset(); const st = fx.state(id, 0);
        fx.behind(g, 50, 90, st, view, 120); fx.front(g, 50, 90, st, view, 120);
    }
    assert.ok(px > 0);
    // Tokelo (16:00): the owl and boar helms come on only with a union skill (Fleet Form, Iron Hide).
    assert.ok(!fx.helmOn('plumede', { statuses: [] }) && fx.helmOn('plumede', { statuses: ['Fleet Form'] }));
    assert.ok(!fx.helmOn('slotos', { statuses: ['Fleet Form'] }) && fx.helmOn('slotos', { statuses: ['Iron Hide'] }));
    for (const id of ['plumede', 'slotos']) assert.ok(data.skillDefinitions[fx.HELMS[id].skill].union === id, `${id}'s helm skill is its own`);
    // Second pass (Tokelo: "an owl or wild bore or fox ... extra arms ... spider legs"): animal helms, symmetrical grids.
    assert.deepStrictEqual(Object.keys(fx.HELMS).sort(), ['plumede', 'slotos']);   // Beelzebub keeps his first look (Tokelo)
    // "the player legs are spider legs" ... "give it to beelzebub": merged with him the sprite is cut at the hips.
    fx.reset(); fx.state('beelzebub', 0);
    assert.ok(fx.lowerBody(fx.state('beelzebub', 1000)) > 0, 'Beelzebub replaces the legs');
    for (const id of ['lucifero', 'slotos', 'plumede']) { fx.reset(); fx.state(id, 0); assert.strictEqual(fx.lowerBody(fx.state(id, 1000)), 0, `${id} keeps your legs`); }
    for (const [id, h] of Object.entries(fx.HELMS)) for (const row of h.rows) {
        assert.strictEqual(row.length, h.rows[0].length, `${id}: every row the same width`);
        assert.strictEqual(row, [...row].reverse().join(''), `${id}: the helm is symmetrical`);
        for (const ch of row) assert.ok(ch === '.' || h.colours[ch], `${id}: colour '${ch}' is defined`);
    }
});
