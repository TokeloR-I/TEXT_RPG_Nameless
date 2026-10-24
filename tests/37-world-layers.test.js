// GFX-3 (#106): depth order, foreground overhangs, ambient particles and light data (ui/world-render.js).
// The canvas drawing itself is checked in the browser; these are the pure rules it follows.
const { test, assert } = require('./helpers.js');
const R = require('../ui/world-render.js');
const ZONE1 = require('../src/world/zone1.js');

test('World layers: things lower on screen are drawn later (in front); the player goes after an object on its own row', () => {
    const objs = [{ id: 'a', y: 5 }, { id: 'b', y: 2 }, { id: 'c', y: 5 }, { id: 'd', y: 9 }];
    const order = (py) => R.drawOrder(objs, { y: py }).map((d) => (d.kind === 'player' ? '@' : d.o.id)).join('');
    assert.strictEqual(order(4), 'b@acd');
    assert.strictEqual(order(5), 'bac@d', 'same row: player in front of the objects there');
    assert.strictEqual(order(4.5), 'b@acd', 'mid-step between rows 4 and 5');
    assert.strictEqual(order(10), 'bacd@');
    assert.strictEqual(R.drawOrder(objs, null).length, 4);
});

test('World layers: every tile with a foreground overhang exists in the tileset and is solid (nobody can stand inside it)', () => {
    const CH1 = require('../src/world/chapter1-maps.js');
    const tiles = [...Object.values(ZONE1.tileset), ...Object.values(CH1.tileset || {}), ...Object.values(ZONE1.maps).flatMap((m) => Object.values(m.legend || {}))];
    for (const name of Object.keys(R.OVERHANGS)) {
        const defs = tiles.filter((t) => t.name === name);
        assert.ok(defs.length, `${name} is a real tile`);
        assert.ok(defs.every((t) => t.solid), `${name} is solid`);
    }
});

test('World layers: ambient particles are deterministic, stay on the map, and every map uses a known kind', () => {
    for (const kind of Object.keys(R.PARTICLES)) {
        const a = R.particlesAt({ kind, count: 20 }, 300, 200, 12345);
        assert.strictEqual(a.length, 20);
        assert.deepStrictEqual(a, R.particlesAt({ kind, count: 20 }, 300, 200, 12345), 'same time, same picture');
        assert.notDeepStrictEqual(a, R.particlesAt({ kind, count: 20 }, 300, 200, 15345), 'they move');
        for (const p of a) assert.ok(p.x >= 0 && p.x < 300 && p.y >= 0 && p.y < 200 && p.a > 0 && p.a <= 1);
    }
    assert.deepStrictEqual(R.particlesAt({ kind: 'nope' }, 10, 10, 0), []);
    assert.deepStrictEqual(R.particlesAt(undefined, 10, 10, 0), []);
    let used = 0;
    for (const [id, map] of Object.entries(ZONE1.maps)) {
        const p = map.ambient && map.ambient.particles;
        if (!p) continue;
        used++;
        assert.ok(R.PARTICLES[p.kind], `${id}: unknown particle kind '${p.kind}'`);
        assert.ok(Number.isInteger(p.count) && p.count > 0 && p.count <= 60, `${id}: particle count`);
    }
    assert.ok(used >= 5, 'several maps have ambience');
    for (const map of Object.values(ZONE1.maps)) for (const l of map.lights || []) assert.ok(l.radius > 0 && (l.color === undefined || /^rgba\(/.test(l.color)));
});
