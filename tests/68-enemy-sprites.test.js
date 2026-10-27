const { test, assert } = require('./helpers.js');
const { ActionSim } = require('../src/action/sim.js');
const art = require('../assets/sprites/enso-enemies.js');
const data = require('../src/data.js');
const { createHash } = require('crypto');
const FX = require('../ui/action-fx.js');
const digest = (pixels) => createHash('sha256').update(pixels).digest('hex');

test('enemy health-bar anchors follow opaque art rather than transparent64px frame margins', () => {
    const g = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true) });
    for (const key of art.keys) for (const facing of ['N', 'SE']) {
        const options = { facing, state: 'idle', now: 0 };
        const pixels = art.raster(key, options);
        let top = 64;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) top = Math.min(top, Math.floor((i - 3) / 4 / 64));
        const bounds = art.bounds(key, options);
        assert.strictEqual(bounds.y, top, `${key}: exact opaque top`);
        assert.strictEqual(art.bounds(key, options), bounds, 'bounds reuse the cached frame');
        assert.strictEqual(FX.drawEnemy(g, key, 100, 200, options).y, 200 - art.anchor.y + top);
    }
    assert.ok(art.bounds('rust_rat', { facing: 'S' }).y > 30, 'small rat has substantial transparent upper margin');
    assert.ok(art.bounds('crow_touched_warden', { facing: 'S' }).y < 15, 'tall boss has a different head height');
    assert.strictEqual(art.bounds('missing_enemy'), null);
});

test('every authoritative enemy has native64 art and eight distinct authored views and gait frames', () => {
    assert.deepStrictEqual([...art.keys].sort(), Object.keys(data.enemies).sort());
    assert.deepStrictEqual(art.frame, { w: 64, h: 64 });
    assert.deepStrictEqual(art.facings, ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
    for (const key of art.keys) {
        const directions = new Set();
        for (const facing of art.facings) {
            const gait = new Set();
            for (let i = 0; i < 8; i++) {
                const pixels = art.raster(key, { facing, state: 'move', now: i * 85 });
                assert.strictEqual(pixels.length, 64 * 64 * 4);
                assert.ok(pixels.some((v, j) => j % 4 === 3 && v === 255));
                for (let j = 3; j < pixels.length; j += 4) assert.ok(pixels[j] === 0 || pixels[j] === 255);
                gait.add(digest(pixels));
                if (!i) directions.add(digest(pixels));
            }
            assert.strictEqual(gait.size, 8, `${key} ${facing}: eight real gait frames`);
        }
        assert.strictEqual(directions.size, 8, `${key}: eight real facing views`);
    }
});

test('combat frames follow authoritative progress and hold their last pose without looping', () => {
    for (const state of ['windup', 'attack', 'recover']) {
        const a = art.frameFor('crow_touched_warden', { state, t: 0, attack: { progress: .5 } });
        const b = art.frameFor('crow_touched_warden', { state, t: 9000, attack: { progress: .5 } });
        assert.deepStrictEqual(a, b);
        assert.strictEqual(art.frameFor('crow_touched_warden', { state, attack: { progress: 1 } }).index, art.states[state] - 1);
        assert.deepStrictEqual(art.frameFor('crow_touched_warden', { state, t: 20000 }), art.frameFor('crow_touched_warden', { state, t: 30000 }));
    }
    const variants = ['Halberd Sweep', 'Summon Crows', 'Chain Lock'].map(skill => digest(art.raster('crow_touched_warden', { state: 'windup', facing: 'SE', attack: { skill, progress: .8 } })));
    assert.strictEqual(new Set(variants).size, 3, 'boss attack tells differ in the body art');
    assert.strictEqual(art.raster('missing_enemy'), null);
});

test('attack equipment and death poses stay inside their64px cell in every direction', () => {
    for (const key of art.keys) for (const facing of art.facings) {
        for (const state of ['windup', 'attack', 'recover', 'dead']) for (let n = 0; n < 4; n++) {
            const skills = key === 'crow_touched_warden' ? ['Halberd Sweep', 'Summon Crows', 'Chain Lock'] : [''];
            for (const skill of skills) {
                const pixels = art.raster(key, { facing, state, t: n * 130, attack: { skill, progress: n / 3 } });
                for (let p = 0; p < 64; p++) {
                    for (const i of [p, 63 * 64 + p, p * 64, p * 64 + 63])
                        assert.strictEqual(pixels[i * 4 + 3], 0, `${key} ${facing} ${state}: cell margin`);
                }
            }
        }
    }
});

test('enemy view exposes authoritative phase timing without changing four-way interaction facing', () => {
    const a = { sid: 'foe', encounterId: 'enc', key: 'weak_goblin', angle: Math.PI / 4,
        state: 'windup', stateEnd: 1600, visualStateStart: 1000, hurtUntil: 0,
        windup: { skill: 'Goblin Slash', atk: { name: 'slash', shape: 'arc' }, base: {}, start: 1000, end: 1600 },
        prof: {}, phaseIdx: 0 };
    const sim = { now: 1300, player: {}, actors: [a], projectiles: [], rules: {}, groups: { enc: {} },
        bossOf: () => null, enemyShape: () => ({ kind: 'arc' }) };
    const view = () => ActionSim.prototype.view.call(sim).actors[0];
    assert.strictEqual(view().angle, Math.PI / 4);
    assert.strictEqual(view().facing, 'down');
    assert.strictEqual(view().t, 300);
    assert.strictEqual(view().attack.duration, 600);
    assert.strictEqual(view().attack.progress, .5);
    for (const state of ['active', 'recover']) {
        a.state = state; a.visualStateStart = 1200; a.stateEnd = 1400;
        assert.strictEqual(view().attack.phase, state);
        assert.strictEqual(view().attack.progress, .5);
        assert.strictEqual(view().t, 100);
    }
    sim.now = 1800;
    assert.strictEqual(view().attack.progress, 1);
    a.state = 'chase';
    assert.strictEqual(view().attack, null);
    a.hurtUntil = 1900;
    assert.strictEqual(view().state, 'hurt');
    assert.strictEqual(view().t, 60);
});
