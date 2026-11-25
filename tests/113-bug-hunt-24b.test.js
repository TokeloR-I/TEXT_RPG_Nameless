// Bug hunt round 2, 2026-11-24 (Tokelo: "Do more bug hunting"). Each test is one bug found in play and fixed.
const { test, assert } = require('./helpers.js');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const WORLD_UI = fs.readFileSync(path.join(ROOT, 'ui/world-ui.js'), 'utf8');

test('Bug hunt 11-24b: every browser script parses (a stray quote in one menu line blanks the whole game)', () => {
    const files = [];
    const walk = (dir) => { for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, f.name);
        if (f.isDirectory()) walk(rel); else if (f.name.endsWith('.js')) files.push(rel);
    } };
    walk('ui'); walk('src');
    assert.ok(files.length > 20);
    for (const rel of files) assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { filename: rel }), rel);
});

test('Bug hunt 11-24b: the controls help no longer says running far enough makes enemies give up', () => {
    assert.ok(!/Run far enough and they give up/.test(WORLD_UI));
    assert.ok(/Running will not shake them/.test(WORLD_UI));
});

test('Bug hunt 11-24b: the Skill bar tab names the live-combat keys (2-6 and R, basic attack 1 or a click)', () => {
    const body = WORLD_UI.match(/    const slotKey = [^\n]*\n    const BASIC_HINT = [^\n]*\n/)[0];
    const run = (action) => { const c = { ACTION: action, ENSO: { actionHud: { SLOT_KEYS: ['2', '3', '4', '5', '6', 'R'], BASIC_KEY: '1' } } };
        vm.createContext(c); vm.runInContext(body.replace(/const /g, 'var '), c); return c; };
    const live = run(true);
    assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map(live.slotKey), ['2', '3', '4', '5', '6', 'R']);
    assert.ok(/<kbd>1<\/kbd> or a click/.test(live.BASIC_HINT));
    const old = run(false);
    assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map(old.slotKey), ['1', '2', '3', '4', '5', '6']);
    assert.ok(/<kbd>F<\/kbd>/.test(old.BASIC_HINT));
    assert.ok(!/'Keys 1-6'/.test(WORLD_UI), 'the tab header is no longer fixed to 1-6');
});

test('Bug hunt 11-24b: the map-name banner re-places itself below the HUD when it would cover it', () => {
    assert.ok(/function placeBanner\(\)/.test(WORLD_UI));
    const show = WORLD_UI.match(/function showBanner\([\s\S]*?\n    \}/)[0];
    assert.ok(/placeBanner\(\)/.test(show) && /requestAnimationFrame\(placeBanner\)/.test(show));
});
