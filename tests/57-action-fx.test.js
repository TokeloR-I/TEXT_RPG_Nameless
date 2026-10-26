// Action combat VFX (ui/action-fx.js, combat v3, docs/ACTION_COMBAT.md): every effect and drawing function runs in
// Node against a recording fake canvas, effects expire after their lifetime, and telegraph progress clamps.
const { test, assert } = require('./helpers.js');
const FX = require('../ui/action-fx.js');
require('../ui/battle-hd.js');                      // the HD creature painters drawEnemy prefers
const SPRITES = require('../ui/sprites.js');
require('../assets/sprites/player-placeholder.js');
require('../assets/sprites/enso-player.js');

/** A 2D context that records every call and accepts any method or property the painters use. */
function fakeCtx() {
    const calls = [];
    const state = { fillStyle: '#000', globalAlpha: 1 };
    const grad = { addColorStop() {} };
    const ctx = new Proxy(state, {
        get(t, k) {
            if (k === 'calls') return calls;
            if (k in t) return t[k];
            return (...args) => { calls.push(k === 'fillRect' ? [k, ...args, t.fillStyle] : [k, ...args]); if (/Gradient|Pattern/.test(k)) return grad; if (k === 'measureText') return { width: 0 }; };
        },
        set(t, k, v) { t[k] = v; return true; }
    });
    return ctx;
}
const rects = (g) => g.calls.filter((c) => c[0] === 'fillRect');
const allWhole = (g) => rects(g).every((c) => c.slice(1, 3).every(Number.isInteger));

test('Action FX: every spawn type draws in map space with whole-pixel rects, and expires after its lifetime', () => {
    const fx = FX.createFx();
    const base = { x: 40, y: 30, amount: 17, damageType: 'fire', radius: 20, angle: 0.5, fromX: 20, fromY: 30, facing: 'right' };
    for (const type of FX.TYPES) assert.ok(fx.spawn(type, base, 1000), type);
    fx.spawn('damage', { x: 1, y: 1, amount: 99, crit: true }, 1000);
    fx.spawn('damage', { x: 1, y: 1, amount: 5, heal: true }, 1000);
    fx.spawn('damage', { x: 1, y: 1, amount: 5, taken: true }, 1000);
    fx.spawn('damage', { x: 1, y: 1, text: 'miss' }, 1000);
    let drew = 0;
    fx.spawn('dodge', { x: 5, y: 5, angle: 1, distance: 20, draw: () => drew++ }, 1000);
    assert.strictEqual(fx.spawn('no_such_fx', base, 1000), null);
    for (const t of [1000, 1050, 1200, 1400]) { const g = fakeCtx(); fx.draw(g, t); assert.ok(allWhole(g), `fractional rect at ${t}`); }
    assert.ok(drew > 0, 'the dodge afterimage used the caller\'s draw callback');
    const longest = Math.max(...Object.values(FX.LIFE));
    const g = fakeCtx(); fx.draw(g, 1000 + longest - 1); assert.ok(fx.size > 0);
    fx.draw(fakeCtx(), 1000 + longest);
    assert.strictEqual(fx.size, 0, 'all effects expired');
    fx.spawn('hit', base, 0); fx.clear(); assert.strictEqual(fx.size, 0);
});

test('Action FX: a hit expires exactly at its lifetime; shakeOffset is whole pixels and settles', () => {
    const fx = FX.createFx();
    fx.spawn('hit', { x: 0, y: 0, shake: 3 }, 0);
    fx.prune(FX.LIFE.hit - 1); assert.strictEqual(fx.size, 1);
    const o = fx.shakeOffset(10); assert.ok(Number.isInteger(o.x) && Number.isInteger(o.y));
    assert.deepStrictEqual(fx.shakeOffset(250), { x: 0, y: 0 });
    fx.prune(FX.LIFE.hit); assert.strictEqual(fx.size, 0);
});

test('Action FX: telegraphs cover their footprint, clamp progress and draw the boss variant', () => {
    const shapes = [
        { kind: 'arc', x: 50, y: 50, angle: 0, arc: Math.PI / 2, reach: 24 },
        { kind: 'cone', x: 50, y: 50, angle: 1, arc: 0.8, reach: 40 },
        { kind: 'circle', x: 50, y: 50, radius: 20 },
        { kind: 'line', x: 50, y: 50, angle: 2, length: 50, width: 10 }
    ];
    for (const s of shapes) {
        const draws = [-1, 0, 0.5, 1, 7, NaN].map((p) => { const g = fakeCtx(); FX.telegraph(g, s, p, 500); assert.ok(allWhole(g)); return JSON.stringify(rects(g)); });
        assert.strictEqual(draws[0], draws[1], `${s.kind}: progress below 0 clamps to 0`);
        assert.strictEqual(draws[3], draws[4], `${s.kind}: progress above 1 clamps to 1`);
        assert.strictEqual(draws[5], draws[1], `${s.kind}: NaN progress reads as 0`);
        assert.notStrictEqual(draws[1], draws[2], `${s.kind}: the fill grows`);
        const boss = fakeCtx(); FX.telegraph(boss, { ...s, boss: true }, 0.5, 500);
        assert.notStrictEqual(JSON.stringify(rects(boss)), draws[2], `${s.kind}: boss colours`);
    }
    // the footprint matches the damage shape: a point in the arc is inside, one behind the attacker is not
    assert.ok(FX.shapeDepth(shapes[0], 60, 50) >= 0);
    assert.ok(FX.shapeDepth(shapes[0], 40, 50) < 0);
    assert.ok(FX.shapeDepth(shapes[3], 50 + Math.cos(2) * 30, 50 + Math.sin(2) * 30) >= 0);
});

test('Action FX: swings, projectiles, markers and bars draw for every class and kind', () => {
    for (const cls of ['warrior', 'rogue', 'necromancer', 'mage', 'unknown']) for (const progress of [0, 0.2, 0.5, 0.9, 1]) {
        const g = fakeCtx(); FX.swing(g, { x: 30, y: 30, angle: 1, arc: 2, reach: 20, progress, cls }); assert.ok(allWhole(g));
        if (progress > 0.1 && progress < 0.8) assert.ok(rects(g).length > 0, `${cls} swing at ${progress}`);
    }
    for (const kind of [...FX.PROJECTILES, 'mystery']) { const g = fakeCtx(); FX.projectile(g, { x: 10.4, y: 7.7, angle: 0.7, kind, now: 123 }); assert.ok(rects(g).length > 0 && allWhole(g), kind); }
    for (const k of ['arcane', 'fire', 'bone', 'shadow', 'arrow', 'enemy_spit', 'feather']) assert.ok(FX.PROJECTILES.includes(k), k);
    const g = fakeCtx();
    FX.targetRing(g, 20, 20, 9, 400); FX.aimReticle(g, 30.5, 12.2, 400); FX.rangeCircle(g, 40, 40, 30);
    FX.enemyBar(g, 20, 10, 18, 7, 10, { chipHp: 9, statuses: ['stun', { name: 'burn' }, 'mystery'], stunned: true });
    FX.enemyBar(g, 20, 10, 18, 0, 0, { boss: true });
    assert.ok(allWhole(g));
});

test('Action FX: drawEnemy draws every enemy in every state, and a dead enemy fades out', () => {
    const keys = ['rust_rat', 'hungry_wolf', 'weak_goblin', 'crow_touched_warden', 'no_such_enemy'];
    for (const key of keys) for (const state of ['idle', 'move', 'windup', 'attack', 'recover', 'hurt', 'stagger', 'dead']) for (const facing of ['left', 'right']) {
        const g = fakeCtx();
        FX.drawEnemy(g, key, 40, 60, { facing, state, t: 100, now: 2000 });
        assert.ok(g.calls.length > 0, `${key} ${state}`);
    }
    const gone = fakeCtx(); FX.drawEnemy(gone, 'rust_rat', 40, 60, { state: 'dead', t: 5000, now: 0 });
    assert.strictEqual(gone.calls.length, 0, 'a long-dead enemy draws nothing');
});

test('Sprites: action one-shots exist in all four facings for every player character', () => {
    assert.deepStrictEqual(SPRITES.validateSheets(), []);
    for (const key of Object.keys(SPRITES.manifest)) {
        const ch = SPRITES.manifest[key];
        const anims = SPRITES.animationsOf(ch);
        for (const a of ['swing', 'heavy', 'dodge', 'guard', 'hurt']) assert.ok(anims[a], `${key}.${a}`);
        const ms = (a) => anims[a].steps.reduce((t, s) => t + s.ms, 0);
        assert.ok(ms('swing') >= 300 && ms('swing') <= 400, `${key} swing ≈ 350 ms (${ms('swing')})`);
        assert.ok(ms('heavy') > ms('swing'), `${key} heavy is slower`);
        assert.ok(ms('dodge') >= 200 && ms('dodge') <= 300, `${key} dodge ≈ 250 ms`);
        assert.ok(Array.isArray(anims.guard), `${key} guard loops`);
        assert.ok(!SPRITES.animationDone(ch, 'guard', 1e6) && SPRITES.animationDone(ch, 'hurt', 1e6));
        assert.ok(SPRITES.animationDone(ch, 'swing', ms('swing')) && !SPRITES.animationDone(ch, 'swing', ms('swing') - 1));
        const body = SPRITES.getSheet((ch.fallbacks && ch.fallbacks.body) || (typeof ch.layers.body === 'string' ? ch.layers.body.replace('{appearance}', 0) : ch.layers.body.sheet));
        for (const facing of SPRITES.FACINGS) for (const a of ['swing', 'heavy', 'dodge', 'guard', 'hurt']) for (const s of [].concat(anims[a].steps || anims[a]))
            assert.ok(SPRITES.frameKey(body, facing, s.pose), `${key} ${a} ${facing} ${s.pose}`);
    }
});
