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
