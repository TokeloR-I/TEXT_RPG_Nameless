// Original art (Tokelo, 2026-10-26: Mana Seed removed, ENSO makes its own): the ENSO doll (assets/sprites/enso-player.js)
// and scene art (ui/scene-art.js). Both are drawn by code, so these check what the code promises.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { test, assert } = require('./helpers.js');
const SPRITES = require('../ui/sprites.js');
const ENSO_PLAYER = require('../assets/sprites/enso-player.js');
const SCENE = require('../ui/scene-art.js');
const ZONE1 = require('../src/world/zone1.js');

const nameAt = (m, x, y) => {
    if (y < 0 || y >= m.tiles.length || x < 0 || x >= m.tiles[0].length) return null;
    const ch = m.tiles[y][x], def = (m.legend && m.legend[ch]) || ZONE1.tileset[ch];
    return def ? def.name : null;
};

test('Original art: no Mana Seed file or reference is left in the game', () => {
    const root = path.join(__dirname, '..');
    for (const f of ['assets/sprites/manaseed.js', 'assets/src/tiles/manaseed.png', 'ui/tiles-manaseed.js']) assert.ok(!fs.existsSync(path.join(root, f)), f);
    for (const page of ['world.html', 'index.html']) assert.ok(!/manaseed/i.test(fs.readFileSync(path.join(root, page), 'utf8')), page);
    assert.ok(!SPRITES.manifest.manaseed);
});

test('ENSO doll: every frame of every shape choice is frame-sized with known colours, and left mirrors right', () => {
    const m = SPRITES.manifest.enso, o = m.options;
    const known = new Set(Object.keys(m.paletteFor()));
    const shapes = [{}, { hairStyle: 5, outfit: 3, hat: 1, weapon: 3, shield: 2 }, { hairStyle: 8, outfit: 2, hat: 4, weapon: 2, shield: 5 }, { hairStyle: 3, outfit: 4, hat: 3, weapon: -1 }];
    for (const c of shapes) {
        const sheet = SPRITES.getSheet(`enso.${m.sheetFields(c).shape}`);
        for (const f of ENSO_PLAYER.FACINGS) for (const p of ENSO_PLAYER.POSES) {
            const rows = sheet.frames[`${f}.${p}`];
            assert.strictEqual(rows.length, m.frame.h); rows.forEach((r) => assert.strictEqual(r.length, m.frame.w));
            for (const ch of new Set(rows.join('').replace(/\./g, ''))) assert.ok(known.has(ch), `role ${ch}`);
        }
        const r = sheet.frames['right.walk2'], l = sheet.frames['left.walk2'];
        assert.deepStrictEqual(l, r.map((s) => [...s].reverse().join('')));
    }
    assert.ok(o.hairStyles.length >= 8 && o.outfits.length >= 6 && o.hats.length >= 6 && o.weapons.length >= 16 && o.shields.length >= 10);
});

test('ENSO doll: the feet stand on the anchor row and each shape choice changes the picture', () => {
    const m = SPRITES.manifest.enso;
    const frame = (c, key = 'down.stand') => SPRITES.getSheet(`enso.${m.sheetFields(c).shape}`).frames[key];
    const lowest = (rows) => rows.reduce((y, r, i) => (/[^.]/.test(r) ? i : y), -1);
    assert.ok(Math.abs(lowest(frame({ weapon: -1 })) - m.anchor.y) <= 1, `feet at row ${lowest(frame({ weapon: -1 }))}`);
    const base = frame({}).join('');
    for (const k of ['hairStyle', 'outfit', 'hat', 'shield']) assert.notStrictEqual(frame({ [k]: 1 }).join(''), base, k);
    assert.notStrictEqual(frame({ weapon: 1 }, 'down.slash3').join(''), frame({}, 'down.slash3').join(''), 'weapon type');
    // Colour choices are palette roles, not new sheets.
    assert.strictEqual(m.sheetFields({ hairColor: 3, outfitColor: 4 }).shape, m.sheetFields({}).shape);
    assert.notDeepStrictEqual(m.paletteFor({ cosmetics: { outfitColor: 4 } }), m.paletteFor({}));
    // Saves made with the old doll (bigger indices) still resolve.
    assert.ok(SPRITES.getSheet(`enso.${m.sheetFields({ hairStyle: 27, outfit: 9, hat: 10, weapon: 14, shield: 15 }).shape}`));
});

test('ENSO doll v2 (chibi): big eyes with iris and shine facing front and side, none from behind', () => {
    const m = SPRITES.manifest.enso, sheet = SPRITES.getSheet(`enso.${m.sheetFields({}).shape}`);
    const count = (key, ch) => sheet.frames[key].join('').split(ch).length - 1;
    assert.strictEqual(count('down.stand', 'r'), 2, 'two shines');
    assert.ok(count('down.stand', 'u') >= 4 && count('down.stand', 's') >= 2, 'two irises');
    assert.ok(count('right.stand', 'u') >= 2, 'one eye in profile');
    assert.strictEqual(count('up.stand', 'u'), 0);
    assert.strictEqual(count('down.hit', 'u'), 0, 'shut when hit');
    // The head is chibi-sized: at least 14 px across facing front.
    const rows = sheet.frames['down.stand'], top = rows.findIndex((r) => /[^.]/.test(r)), widest = Math.max(...rows.slice(top, top + 14).map((r) => r.replace(/^\.+|\.+$/g, '').length));
    assert.ok(widest >= 14, `head ${widest} px`);
});

test('ENSO doll v2: fluid animation set, every step a real pose, combat timings unchanged', () => {
    const m = SPRITES.manifest.enso, sheet = SPRITES.getSheet(`enso.${m.sheetFields({}).shape}`);
    const stepsOf = (a) => (Array.isArray(a) ? a : a.steps);
    for (const [name, a] of Object.entries(m.animations)) for (const s of stepsOf(a)) assert.ok(ENSO_PLAYER.POSES.includes(s.pose), `${name}: ${s.pose}`);
    const len = (n) => stepsOf(m.animations[n]).length, total = (n) => stepsOf(m.animations[n]).reduce((t, s) => t + s.ms, 0);
    assert.ok(len('idle') >= 4 && len('walk') >= 8 && len('swing') >= 6 && len('hurt') >= 2 && len('death') >= 5);
    assert.strictEqual(total('swing'), 350); assert.strictEqual(total('heavy'), 720); assert.strictEqual(total('hurt'), 250);
    // Breathing moves the figure; the in-betweens differ from both of their ends.
    assert.notDeepStrictEqual(sheet.frames['down.idle3'], sheet.frames['down.idle1']);
    for (const [p, a, b] of [['slash5', 'slash4', 'ready1'], ['hit2', 'hit', 'ready1']]) for (const f of ['down', 'right', 'up']) {
        const k = (x) => sheet.frames[`${f}.${x}`].join('');
        assert.ok(k(p) !== k(a) && k(p) !== k(b), `${f}.${p}`);
    }
});

// Tokelo (2026-11-11): the main character rebuilt for fluid motion. One pose is written in the character's own space
// and projected for every facing; hair and cloth follow the body through a spring; a swing leaves the blade's trail.
test('ENSO rig v3: a taller figure, every motion with its frames, and the totals the fight depends on', () => {
    const m = SPRITES.manifest.enso, sheet = SPRITES.getSheet(`enso.${m.sheetFields({ weapon: -1 }).shape}`);
    const rows = sheet.frames['down.stand'], filled = rows.map((r, i) => (/[^.]/.test(r) ? i : -1)).filter((i) => i >= 0);
    const tall = filled[filled.length - 1] - filled[0] + 1;
    assert.ok(tall >= 38 && tall <= 44, `figure ${tall} px tall`);
    const stepsOf = (a) => (Array.isArray(a) ? a : a.steps), total = (n) => stepsOf(m.animations[n]).reduce((t, s) => t + s.ms, 0);
    for (const [n, min] of [['idle', 8], ['walk', 10], ['swing', 8], ['heavy', 10], ['thrust', 7], ['cast', 8], ['hurt', 4], ['dodge', 4], ['stop', 3]]) assert.ok(stepsOf(m.animations[n]).length >= min, n);
    assert.deepStrictEqual(['swing', 'heavy', 'thrust', 'hurt', 'dodge'].map(total), [350, 720, 350, 250, 250]);
    // No two neighbouring frames of a motion are the same picture, in any view.
    for (const n of ['walk', 'swing', 'heavy', 'thrust', 'cast']) for (const f of ['down', 'right', 'up', 'down-right']) {
        const poses = stepsOf(m.animations[n]).map((s) => sheet.frames[`${f}.${s.pose}`].join(''));
        for (let i = 1; i < poses.length; i++) assert.notStrictEqual(poses[i], poses[i - 1], `${f} ${n} frame ${i + 1}`);
    }
    // The four attacks are four different motions.
    const mid = ['slash5', 'heavy7', 'thrust5', 'cast5'].map((p) => sheet.frames[`right.${p}`].join(''));
    assert.strictEqual(new Set(mid).size, 4);
});

test('ENSO rig v3: the feet stay on the ground line through every frame, and nothing is cut off by the frame edge', () => {
    const m = SPRITES.manifest.enso;
    for (const c of [{ weapon: -1 }, { hairStyle: 5, outfit: 0, hat: 2, weapon: 3, shield: 2 }]) {
        const sheet = SPRITES.getSheet(`enso.${m.sheetFields(c).shape}`);
        for (const f of ['down', 'right', 'up', 'down-right', 'up-right']) for (const p of ENSO_PLAYER.POSES) {
            const rows = sheet.frames[`${f}.${p}`];
            assert.ok(!/[^.]/.test(rows[0]) && !/[^.]/.test(rows[rows.length - 1]) && rows.every((r) => r[0] === '.' && r[r.length - 1] === '.'), `${f}.${p} touches the frame edge`);
            if (c.weapon !== -1 || /^(down|dash|fall)/.test(p)) continue;
            const lowest = rows.reduce((y, r, i) => (/[^.]/.test(r) ? i : y), -1);
            assert.ok(Math.abs(lowest - m.anchor.y) <= 2, `${f}.${p}: lowest pixel at row ${lowest}`);
        }
    }
});

test('ENSO rig v3: hair and cloth trail the body, and a swing leaves the blade\'s trail', () => {
    const m = SPRITES.manifest.enso;
    const sk = (f, p) => ENSO_PLAYER.skeleton(f, p);
    // Standing: the cloth hangs near rest. Running to the right: it streams out behind (to the left).
    assert.ok(Math.abs(sk('right', 'stand').swC[0]) < 1.5);
    for (let i = 1; i <= 10; i++) assert.ok(sk('right', `walk${i}`).swC[0] < -1, `walk${i} cloth ${sk('right', `walk${i}`).swC[0]}`);
    // It moves through the stride, not a fixed offset, and the hair has its own timing.
    const xs = Array.from({ length: 10 }, (_, i) => sk('right', `walk${i + 1}`)), spread = (a) => Math.max(...a) - Math.min(...a);
    assert.ok(spread(xs.map((k) => k.swC[1])) > 0.5 && spread(xs.map((k) => k.swH[1])) > 0.5);
    // The tail of hair and the cape are drawn where the sway puts them.
    const frames = (c, f, p) => SPRITES.getSheet(`enso.${m.sheetFields(c).shape}`).frames[`${f}.${p}`].join('');
    const count = (s, chars) => [...s].filter((ch) => chars.includes(ch)).length;
    assert.notStrictEqual(count(frames({ hairStyle: 1, weapon: -1 }, 'right', 'walk3'), '5678'), count(frames({ hairStyle: 1, weapon: -1 }, 'right', 'stand'), '5678'));
    // The trail: bright pixels in the cutting frames of each attack, none standing still.
    for (const f of ['down', 'right', 'up']) {
        assert.ok(count(frames({}, f, 'slash5'), 'ZY') + count(frames({}, f, 'slash6'), 'ZY') > 8, `${f} swing trail`);
        assert.strictEqual(count(frames({}, f, 'stand'), 'ZY'), 0);
    }
    assert.ok(count(frames({}, 'right', 'heavy8'), 'ZY') > 8, 'heavy trail');
});

test('Scene art: the homestead grounds paint whole, the same every time, with a crown layer over people', () => {
    const map = ZONE1.maps.grounds;
    assert.ok(SCENE.has(map) && !SCENE.has(ZONE1.maps.house));
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base), 'deterministic');
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    // The crown layer is empty where people walk in the open (the middle of the yard).
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.strictEqual(at(15 * 32 + 16, 12 * 32 + 16), 0);
    assert.ok(a.water.length > 50, 'the river shimmers');
});

test('Scene art: Shamefield paints whole after the reference, the same every time, with its own moving parts', () => {
    require('../ui/scene-shamefield.js');
    const map = ZONE1.maps.shamefield;
    assert.ok(SCENE.has(map), 'shamefield opts in with scene: shamefield');
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base), 'deterministic');
    assert.strictEqual(sha(a.over), sha(b.over), 'deterministic crowns');
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.strictEqual(at(22 * 32 + 16, 10 * 32 + 16), 0, 'nothing hangs over the open square');
    assert.ok(at(17 * 32 + 16, 9 * 32 + 16) > 0, 'the raven tree\'s limbs reach over the cobbles behind it');
    assert.ok(a.water.length > 50 && typeof a.animate === 'function', 'the river shimmers; falls, flames and smoke move');
    // Every thing the map names is something the scene knows how to paint (no tile left as bare ground by accident).
    const painted = new Set(['grass', 'dirt_path', 'cobble', 'bridge', 'water', 'waterfall', 'cliff', 'ruin', 'stone_stairs', 'tree', 'dead_tree',
        'raven_tree', 'banner', 'lantern', 'notice_board', 'stall', 'well', 'fountain', 'memorial', 'cart', 'crate', 'barrel', 'fence', 'crops',
        'chickens', 'hen_hut', 'house', 'slate_house', 'watermill', 'mill_wheel', 'church']);
    for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) assert.ok(painted.has(nameAt(map, x, y)), `${x},${y}: ${nameAt(map, x, y)}`);
});

test('Scene art: the Overgrown Road paints whole after the reference, the same every time, with its own moving parts', () => {
    require('../ui/scene-road.js');
    const map = ZONE1.maps.road;
    assert.ok(SCENE.has(map), 'the road opts in with scene: overgrown_road');
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base), 'deterministic');
    assert.strictEqual(sha(a.over), sha(b.over), 'deterministic crowns');
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.strictEqual(at(15 * 32 + 16, 13 * 32 + 16), 0, 'nothing hangs over the open crossroads');
    assert.ok(at(28 * 32 + 16, 5 * 32 - 10) > 0, 'the stone arch spans over the way through it');
    assert.ok(a.water.length > 50 && typeof a.animate === 'function', 'the stream shimmers; falls, fire and lanterns move');
    // Every thing the map names is something the scene knows how to paint (no tile left as bare ground by accident).
    const painted = new Set(['grass', 'dirt_path', 'water', 'waterfall', 'bridge', 'bank_rocks', 'reeds', 'flowers', 'tree', 'red_tree', 'bush',
        'rock', 'stump', 'ruin', 'arch', 'tent', 'campfire', 'barrel', 'crate', 'log', 'banner', 'lantern', 'fence', 'wagon', 'signpost']);
    for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) assert.ok(painted.has(nameAt(map, x, y)), `${x},${y}: ${nameAt(map, x, y)}`);
});

test('Scene art: the Kloster paints whole after the reference, the same every time, with its own moving parts', () => {
    require('../ui/scene-kloster.js');
    const map = ZONE1.maps.briarwell_cloister_court;
    assert.ok(SCENE.has(map), 'the Kloster opts in with scene: kloster');
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base), 'deterministic');
    assert.strictEqual(sha(a.over), sha(b.over), 'deterministic crowns');
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.strictEqual(at(15 * 32 + 16, 9 * 32 + 16), 0, 'nothing hangs over the open cloister walk');
    assert.ok(at(15 * 32 + 16, 16 * 32 + 4) > 0, 'the arcade roof hangs over the way into the garth');
    assert.ok(at(16 * 32 + 16, 21 * 32 - 6) > 0, 'the gatehouse hangs over the gate');
    assert.ok(a.water.length > 5 && typeof a.animate === 'function', 'the fountain shimmers; torches, the brewing fire and smoke move');
    // Every thing the map names is something the scene knows how to paint (no tile left as bare ground by accident).
    const painted = new Set(['grass', 'dirt_path', 'flagstones', 'gate', 'kloster_wall', 'wall_tower', 'gatehouse', 'abbey_church', 'bell_tower',
        'monks_cells', 'refectory', 'abbots_house', 'brewery', 'storehouse', 'arcade', 'hedge_bed', 'cypress', 'cloister_fountain', 'herb_bed',
        'hop_trellis', 'grave', 'grave_cross', 'low_wall', 'tree', 'dead_tree', 'barrel', 'crate', 'cart', 'woodpile', 'lantern', 'crops',
        'scarecrow', 'fence', 'bench']);
    for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) assert.ok(painted.has(nameAt(map, x, y)), `${x},${y}: ${nameAt(map, x, y)}`);
});

test("Scene art: Baker's Lane paints whole after the reference, the same every time, with its own moving parts", () => {
    require('../ui/scene-bakers-lane.js');
    const map = ZONE1.maps.village_residential_lane;
    assert.ok(SCENE.has(map), 'the lane opts in with scene: bakers_lane');
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base), 'deterministic');
    assert.strictEqual(sha(a.over), sha(b.over), 'deterministic over layer');
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.strictEqual(at(15 * 32 + 16, 9 * 32 + 16), 0, 'nothing hangs over the drain in the middle of the road');
    assert.ok(at(9 * 32 + 16, 10 * 32 + 16) > 0, 'the bare tree by the road reaches over the cobbles behind it');
    assert.ok(a.windows.length >= 15 && typeof a.animate === 'function', 'lit windows; the oven fire, lanterns and smoke move');
    // The oven mouth glows: warm, bright pixels low on the oven block.
    const px = (x, y) => [0, 1, 2].map((k) => a.base[(y * a.w + x) * 4 + k]);
    const [r, g, bl] = px(16 * 32 + 16, 6 * 32 - 30);
    assert.ok(r > 200 && r > g && g > bl, `the fire in the oven mouth (${r},${g},${bl})`);
    // Every thing the map names is something the scene knows how to paint (no tile left as bare ground by accident).
    const painted = new Set(['grass', 'dirt_path', 'cobble', 'drain', 'town_wall', 'wall_banner', 'house', 'bakery', 'smokehouse', 'oven', 'woodshed',
        'bread_table', 'sacks', 'laundry', 'cabbages', 'fence', 'coop', 'chickens', 'hay', 'pig_mud', 'pig_shed', 'well', 'lantern', 'mounting_stone',
        'tree', 'dead_tree', 'bush', 'rose_bed', 'stump', 'barrel', 'crate']);
    for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) assert.ok(painted.has(nameAt(map, x, y)), `${x},${y}: ${nameAt(map, x, y)}`);
});

// Tokelo (2026-11-04): every area still on tile art brought up to the painted scenes. The maps keep their tiles,
// so exits, NPCs, quests and fights stand where they did; each scene paints every tile its map names.
test('Scene art: the last tile-art areas (homestead rooms, the wilds, the Warden\'s roost) paint whole, the same every time', () => {
    require('../ui/scene-homestead-rooms.js');
    require('../ui/scene-ch1-wilds.js');
    require('../ui/scene-featherwatch-roost.js');
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    const expect = { cellar: 'cellar', house: 'farmhouse', shed: 'old_shed', well: 'well_bottom', tollway: 'tollway', allotment: 'allotment',
        orchard: 'orchard', featherwatch: 'featherwatch', sanctuary: 'warden_sanctuary', seal_chamber: 'seal_chamber' };
    const painted = {
        cellar: ['stone_wall', 'stone_floor', 'barrel', 'crate', 'rubble', 'shelf', 'stairs_up', 'bedroll'],
        farmhouse: ['wood_wall', 'wood_floor', 'doorway', 'counter', 'shelf', 'table', 'chair', 'armchair', 'bed', 'fireplace', 'rug', 'crate', 'stairs_down'],
        old_shed: ['wood_wall', 'wood_floor', 'doorway', 'shelf', 'crate', 'workbench', 'barrel'],
        well_bottom: ['stone_wall', 'stone_floor', 'rubble', 'rope', 'water', 'rock'],
        tollway: ['tree', 'grass', 'dirt_path', 'shed_roof', 'shed_wall', 'shed_door_shut', 'rock', 'signpost', 'crate', 'dead_tree', 'water', 'bridge', 'cart'],
        allotment: ['tree', 'grass', 'tall_weeds', 'shed_roof', 'shed_wall', 'shed_door_shut', 'rock', 'dirt_path', 'wagon', 'scarecrow'],
        orchard: ['tree', 'stone_floor', 'stone_wall', 'rubble', 'grass', 'dirt_path', 'fruit_tree', 'rock', 'dead_tree'],
        featherwatch: ['tree', 'dirt_path', 'grass', 'cage', 'rock', 'dead_tree'],
        warden_sanctuary: ['stone_wall', 'seal_door', 'stone_floor', 'cage', 'table', 'barrel', 'shelf', 'rug'],
        seal_chamber: ['stone_wall', 'stone_floor', 'rubble', 'seal_door']
    };
    for (const [mapId, scene] of Object.entries(expect)) {
        const map = ZONE1.maps[mapId];
        assert.strictEqual(map.scene, scene, `${mapId} opts in with scene: ${scene}`);
        assert.ok(SCENE.has(map), `${mapId}: the '${scene}' scene is registered`);
        const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
        assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
        assert.strictEqual(sha(a.base), sha(b.base), `${mapId}: deterministic`);
        assert.strictEqual(sha(a.over), sha(b.over), `${mapId}: deterministic over layer`);
        for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`${mapId}: base pixel ${(i - 3) / 4} is not opaque`);
        const known = new Set(painted[scene]);
        for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) assert.ok(known.has(nameAt(map, x, y)), `${mapId} ${x},${y}: ${nameAt(map, x, y)}`);
        // Nothing solid hangs over a spawn point (a faint shaft of light may), so the player is never hidden where they arrive.
        for (const [id, s] of Object.entries(map.spawns)) assert.ok(a.over[((s.y * 32 + 16) * a.w + s.x * 32 + 16) * 4 + 3] < 60, `${mapId}: open over spawn ${id}`);
    }
    // No map on the way through Chapter One is left on tile art.
    for (const f of ['shamefield', 'road', 'bakers-lane', 'kloster', 'kloster-inner', 'hrimvald']) require(`../ui/scene-${f}.js`);   // hrimvald: Chapter Two (tests/98)
    for (const [id, map] of Object.entries(ZONE1.maps)) assert.ok(SCENE.has(map), `${id} has a painted scene`);
});
