const { test, assert } = require('./helpers.js');
const fs = require('fs');
const vm = require('vm');
const { ActionSim } = require('../src/action/sim.js');
const ui = fs.readFileSync(require.resolve('../ui/world-ui.js'), 'utf8');

function body() {
    const sim = Object.create(ActionSim.prototype);
    Object.assign(sim, { now: 100, rules: {}, engine: { player: { className: 'warrior' } }, input: { move: { x: 0, y: 0 } },
        player: { x: 100, y: 100, angle: 0, facing: 'right', state: 'idle', stamina: 100, staminaAt: 0 },
        moveBody(p, x, y) { p.x += x; p.y += y; }, playerTile() {} });
    return sim;
}

test('Movement facing follows all keyboard directions and stays put when released', () => {
    for (const [x, y, face] of [[1,0,'right'],[-1,0,'left'],[0,-1,'up'],[0,1,'down'],[1,1,'down'],[-1,-1,'up']]) {
        const s = body(); s.input.move = { x, y }; s.stepPlayer();
        assert.strictEqual(s.player.facing, face);
        assert.ok(s.player.moving);
        s.input.move = { x: 0, y: 0 }; s.stepPlayer();
        assert.strictEqual(s.player.facing, face); assert.strictEqual(s.player.moving, false);
    }
});

test('Explicit aim overrides travel; walking cannot rotate an attack already in flight', () => {
    const s = body(); s.input.move = { x: -1, y: 0 }; s.input.aim = { x: 100, y: 0 }; s.stepPlayer();
    assert.strictEqual(s.player.facing, 'up');
    s.player.state = 'attack'; s.stepAttack = () => {}; s.input.aim = { x: 200, y: 100 }; s.stepPlayer();
    assert.strictEqual(s.player.facing, 'up');
});

function inputContext(extra = {}) {
    const context = { held: ['left'], DIRS: { left: [-1,0] }, lockId: null, sim: { actors: [] },
        aim: { screenX: 500, screenY: 0, movedAt: 0 }, camera: () => ({ ox: 0, oy: 0 }),
        press: { attack: false, dodge: false, interact: false, slot: null }, down: new Set(), guardHeld: false, ...extra };
    const source = ui.slice(ui.indexOf('    function actionInput()'), ui.indexOf('    function notice('));
    vm.runInNewContext(source + '\nresult = actionInput();', context);
    return context.result;
}

test('Idle cursor cannot hijack keyboard travel or Q guard; explicit attacks and lock keep targeting', () => {
    assert.strictEqual(inputContext().aim, null);
    assert.strictEqual(inputContext({ held: [] }).aim, null);
    assert.strictEqual(inputContext({ down: new Set(['q']) }).aim, null);
    assert.strictEqual(inputContext({ press: { attack: true } }).aim, null);
    assert.strictEqual(inputContext({ press: { slot: 1 } }).aim, null);
    assert.strictEqual(inputContext({ press: { attack: true, pointerAttack: true } }).aim.x, 500);
    assert.strictEqual(inputContext({ guardHeld: true }).aim.x, 500);
    assert.strictEqual(inputContext({ lockId: 'rat', sim: { actors: [{ sid: 'rat', x: 30, y: 40 }] } }).aim.x, 30);
});

test('Action movement survives actual frame handoff and renderer selects walk with action pose priority', () => {
    const source = ui.slice(ui.indexOf('        if (ACTION) actionFrame(now);'), ui.indexOf("        if (screen !== 'title' && !ACTION) updatePrompt();"));
    const context = { ACTION: true, now: 100, anim: null, view: {}, actionFrame() { context.view.moving = true; } };
    vm.runInNewContext(source, context);
    const renderer = fs.readFileSync(require.resolve('../ui/world-render.js'), 'utf8');
    const start = renderer.indexOf('            ENSO.sprites.drawCharacter(g, cx, base, {', renderer.indexOf('function drawPlayer('));
    const draw = renderer.slice(start, renderer.indexOf(';', start) + 1);
    const rendered = [];
    Object.assign(context, { g: {}, cx: 0, base: 0, time: 100, ENSO: { sprites: { drawCharacter(g,x,y,opts,t) { rendered.push({ ...opts, t }); } } } });
    vm.runInNewContext(draw, context);
    assert.strictEqual(rendered.pop().anim, 'walk');
    context.view.anim = 'swing'; context.view.animT = 25;
    vm.runInNewContext(draw, context);
    assert.deepStrictEqual(rendered.pop().anim, 'swing');
    context.ACTION = false; context.screen = 'paused';
    vm.runInNewContext(source, context);
    assert.strictEqual(context.view.moving, false, 'legacy tile animation still stops');
});

test('Keyboard attack commits current movement direction before cast startup', () => {
    const s = body(); s.input.move = { x: -1, y: 0 }; s.input.attack = true;
    let angle;
    s.startAttack = () => { angle = s.player.angle; s.player.state = 'attack'; };
    s.stepAttack = () => {}; s.stepPlayer();
    assert.strictEqual(angle, Math.PI);
    assert.strictEqual(s.player.facing, 'left');
});

test('Pointer attack aim is consumed once and never leaks into later keyboard attacks', () => {
    const context = { held: [], DIRS: {}, lockId: null, sim: { actors: [] },
        aim: { screenX: 500, screenY: 0 }, camera: () => ({ ox: 0, oy: 0 }),
        press: { attack: true, pointerAttack: true, slot: null }, down: new Set(), guardHeld: false };
    const source = ui.slice(ui.indexOf('    function actionInput()'), ui.indexOf('    function notice('));
    vm.runInNewContext(source + '\nfirst = actionInput(); press.attack = true; second = actionInput();', context);
    assert.strictEqual(context.first.aim.x, 500);
    assert.strictEqual(context.second.aim, null);
    assert.strictEqual(context.press.pointerAttack, false);
});

test('8-way movement: diagonals move at normal speed and the sprite faces all eight directions', () => {
    const dirs = [[1,0,'right'],[1,1,'down-right'],[0,1,'down'],[-1,1,'down-left'],[-1,0,'left'],[-1,-1,'up-left'],[0,-1,'up'],[1,-1,'up-right']];
    for (const [x, y, face] of dirs) {
        const len = Math.hypot(x, y);
        const s = body(); s.input.move = { x: x / len, y: y / len }; s.stepPlayer();
        assert.strictEqual(s.player.facing8, face);
        assert.ok(['up', 'down', 'left', 'right'].includes(s.player.facing), 'world facing stays 4-way');
    }
    // Same distance per step on a diagonal as straight ahead.
    const straight = body(); straight.input.move = { x: 1, y: 0 }; straight.stepPlayer();
    const diag = body(); diag.input.move = { x: Math.SQRT1_2, y: Math.SQRT1_2 }; diag.stepPlayer();
    assert.ok(Math.abs(Math.hypot(diag.player.x - 100, diag.player.y - 100) - (straight.player.x - 100)) < 1e-9);
    // Keyboard: two held keys make one normalised diagonal.
    const context = { held: ['down', 'right'], DIRS: { down: [0, 1], right: [1, 0] }, lockId: null, sim: { actors: [] }, aim: {}, camera: () => ({ ox: 0, oy: 0 }),
        press: { attack: false, dodge: false, interact: false, slot: null }, down: new Set(), guardHeld: false };
    vm.runInNewContext(ui.slice(ui.indexOf('    function actionInput()'), ui.indexOf('    function notice(')) + '\nresult = actionInput();', context);
    assert.ok(Math.abs(Math.hypot(context.result.move.x, context.result.move.y) - 1) < 1e-9 && context.result.move.x > 0 && context.result.move.y > 0);
});

test('8-way attacks: a keyboard swing on a diagonal aims along that diagonal', () => {
    const s = body(); s.input.move = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }; s.input.attack = true;
    let angle;
    s.startAttack = () => { angle = s.player.angle; s.player.state = 'attack'; };
    s.stepAttack = () => {}; s.stepPlayer();
    assert.ok(Math.abs(angle - (-3 * Math.PI / 4)) < 1e-9);
    assert.strictEqual(s.player.facing8, 'up-left');
});

test('8-way sprite: the ENSO doll has its own 3/4 views, the -left ones mirror, older characters turn sideways', () => {
    const SPRITES = require('../ui/sprites.js');
    const EP = require('../assets/sprites/enso-player.js');
    const m = SPRITES.manifest.enso;
    const sheet = SPRITES.getSheet(`enso.${m.sheetFields({ hat: 4, shield: 2 }).shape}`);
    const f = (k) => sheet.frames[k].join('');
    for (const d of ['down-right', 'up-right']) {
        for (const p of ['stand', 'walk3', 'slash2', 'hit']) for (const other of ['down', 'up', 'right']) assert.notStrictEqual(f(`${d}.${p}`), f(`${other}.${p}`), `${d}.${p} vs ${other}`);
        const mir = d.replace('right', 'left');
        assert.deepStrictEqual(sheet.frames[`${mir}.walk2`], sheet.frames[`${d}.walk2`].map((r) => [...r].reverse().join('')));
    }
    const eyes = (k) => sheet.frames[k].join('').split('r').length - 1;
    assert.strictEqual(eyes('down-right.stand'), 2, 'two eyes turned 3/4 toward the camera');
    assert.strictEqual(eyes('up-right.stand'), 0, 'no face from behind');
    for (const d of ['down-right', 'down-left', 'up-right', 'up-left']) assert.strictEqual(SPRITES.characterLayers({ character: m, facing: d }).layers[0].frame, `${d}.idle1`);
    assert.ok(EP.FACINGS.length === 8);
    SPRITES.sheets['test.fourway'] = { frames: { 'down.stand': ['.'], 'up.stand': ['.'], 'left.stand': ['.'], 'right.stand': ['.'] } };
    const fourWay = { frame: { w: 1, h: 1 }, anchor: { x: 0, y: 0 }, animations: { idle: [{ pose: 'stand', ms: 100, oy: 0 }] },
        layerOrder: { down: ['body'], up: ['body'], left: ['body'], right: ['body'] }, layers: { body: 'test.fourway' }, fallbacks: {} };
    assert.strictEqual(SPRITES.characterLayers({ character: fourWay, facing: 'up-left' }).layers[0].frame, 'left.stand', 'a 4-way character turns to its side');
});

test('8-way release: letting go of a diagonal a few frames apart keeps the diagonal facing; a held cardinal still turns', () => {
    const s = body(); const step = (x, y, ms) => { s.input.move = { x, y }; s.stepPlayer(); s.now += ms; };
    step(Math.SQRT1_2, Math.SQRT1_2, 17);        // walking down-right
    step(0, 1, 17); step(0, 1, 17);              // 'right' lifted two frames before 'down'
    step(0, 0, 17);
    assert.strictEqual(s.player.facing8, 'down-right', 'the stray frames of the last key held did not snap the sprite');
    step(1, 1, 17);
    for (let i = 0; i < 12; i++) step(1, 0, 17);  // then really walk right
    assert.strictEqual(s.player.facing8, 'right');
});
