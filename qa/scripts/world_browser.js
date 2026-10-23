// World Zone 1 in a real browser (headless Chromium), driven by real key presses only.
// Checks the Zone 1 spec's player-facing acceptance criteria (docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md
// §3, §4, §7) that engine-level tests can't see: keys, collision, transitions, input focus, overlays.
// Routes are computed from the map data (BFS), but every step is a real keydown/keyup.
// Uses Playwright if it is installed anywhere on the machine; it is NOT a repo dependency.
//   node qa/scripts/world_browser.js            PLAYWRIGHT=/path/to/playwright node qa/scripts/world_browser.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function loadPlaywright() {
    const tries = [process.env.PLAYWRIGHT, 'playwright', '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright'].filter(Boolean);
    for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
    return null;
}
const pw = loadPlaywright();
if (!pw) { console.log('SKIP: Playwright not found (set PLAYWRIGHT=/path/to/playwright). Not a repo dependency.'); process.exit(0); }

const out = [];
const rec = (id, what, ok, note) => out.push(`${ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${note}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const WASD = { up: 'w', down: 's', left: 'a', right: 'd' };

(async () => {
    const browser = await pw.chromium.launch();
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1000, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.goto('file://' + path.join(ROOT, 'world.html'));
    await sleep(300);

    const S = () => page.evaluate(() => ({ ...ensoDebug.state(), pos: window.ensoWorld ? ensoWorld.getState() : null,
        inv: window.enso && enso.player ? [...enso.player.inventory] : [], hp: window.enso && enso.player ? enso.player.hp : null,
        dialog: !document.getElementById('dialog').hidden, pause: !document.getElementById('pause').hidden, combat: !document.getElementById('combat').hidden,
        dialogText: document.getElementById('dialog').innerText, toast: document.getElementById('toast').innerText }));
    const idle = async (ms = 2000) => { // wait until no animation/fade (position stable) and explore
        const t0 = Date.now(); let last = JSON.stringify((await S()).pos);
        while (Date.now() - t0 < ms) { await sleep(90); const now = JSON.stringify((await S()).pos); if (now === last) return; last = now; }
    };
    /** One tile step in `dir` with real keys. Returns the new state. */
    const step = async (dir, keys = KEY) => {
        const before = (await S()).pos;
        await page.keyboard.down(keys[dir]);
        const t0 = Date.now();
        while (Date.now() - t0 < 400) {
            const p = (await S()).pos;
            if (!p || p.x !== before.x || p.y !== before.y || p.map !== before.map || p.facing !== before.facing && Date.now() - t0 > 60) break;
            await sleep(15);
        }
        await page.keyboard.up(keys[dir]);
        await sleep(200);
        return S();
    };
    /** BFS route (list of dirs) on the current map to stand on `goal`, avoiding exits/objects unless the goal itself. */
    const route = (gx, gy) => page.evaluate(([gx, gy]) => {
        const s = ensoWorld, D = ENSO.worldModel.DIRS, start = [s.x, s.y], key = (x, y) => x + ',' + y;
        const exits = new Set((s.map.exits || []).map((e) => key(e.x, e.y)));
        const prev = new Map([[key(...start), null]]); const q = [start];
        while (q.length) {
            const [x, y] = q.shift();
            if (x === gx && y === gy) break;
            for (const [d, [dx, dy]] of Object.entries(D)) {
                const nx = x + dx, ny = y + dy, k = key(nx, ny);
                if (prev.has(k)) continue;
                const goal = nx === gx && ny === gy;
                if (!goal && (s.isBlocked(nx, ny) || exits.has(k) || s.boundaryAt(nx, ny))) continue;
                if (goal && s.isBlocked(nx, ny) && !(s.objectAt(nx, ny))) continue;
                prev.set(k, [key(x, y), d]); q.push([nx, ny]);
            }
        }
        if (!prev.has(key(gx, gy))) return null;
        const dirs = []; let k = key(gx, gy);
        while (prev.get(k)) { const [pk, d] = prev.get(k); dirs.unshift(d); k = pk; }
        return dirs;
    }, [gx, gy]);
    const walk = async (gx, gy) => { const r = await route(gx, gy); if (!r) return false; for (const d of r) await step(d); return true; };
    /** Stand next to (x,y) and face it. */
    const faceAt = async (x, y) => {
        for (const [d, dx, dy] of [['down', 0, -1], ['up', 0, 1], ['right', -1, 0], ['left', 1, 0]]) {
            const r = await route(x + dx, y + dy);
            if (r) { for (const s of r) await step(s); const p = (await S()).pos; if (p.facing !== d) await step(d); return true; }
        }
        return false;
    };
    const objAt = (mapId, id) => page.evaluate(([m, id]) => { const map = ENSO.world.zone1.maps[m]; return [...(map.interactables || []), ...(map.encounters || [])].find((o) => o.id === id); }, [mapId, id]);
    const exitOf = (mapId, id) => page.evaluate(([m, id]) => ENSO.world.zone1.maps[m].exits.find((e) => e.id === id), [mapId, id]);
    const press = async (k, wait = 150) => { await page.keyboard.press(k); await sleep(wait); };

    // ------------------------------------------------------------------ B1 load
    {
        const probs = await page.evaluate(() => !document.getElementById('problems').hidden ? document.getElementById('problems').innerText : '');
        const s = await S();
        rec('B1', 'world.html loads with no script errors and no map-validation problems; title screen shown', !errors.length && !probs && s.screen === 'title', `screen ${s.screen}; errors ${errors.length}; problems "${probs}"`);
    }
    // ------------------------------------------------------------------ B2 start by keyboard
    {
        await press('Enter', 300);
        let s = await S(); let n = 0;
        while ((s.dialog || s.modal) && n++ < 10) { await press('Enter', 200); s = await S(); }
        await idle();
        s = await S();
        rec('B2', 'Enter on the title starts the first class; intro closes with Enter; you stand in the cellar, exploring', s.screen === 'explore' && s.pos.map === 'cellar' && s.mode === 'explore', `screen ${s.screen}, map ${s.pos.map} (${s.pos.x},${s.pos.y}), engine mode ${s.mode}`);
    }
    // ------------------------------------------------------------------ B3 arrows + WASD
    {
        const p0 = (await S()).pos; const moved = {};
        for (const [d, back] of [['right', 'left'], ['left', 'right'], ['down', 'up'], ['up', 'down']]) {
            const a = await step(d, KEY); const okA = a.pos.x !== p0.x || a.pos.y !== p0.y;
            if (okA) { await step(back, KEY); const w = await step(d, WASD); moved[d] = `arrow ok, ${WASD[d]} ${w.pos.x !== p0.x || w.pos.y !== p0.y ? 'ok' : 'NO'}`; await step(back, WASD); }
            else moved[d] = 'blocked here';
        }
        const anyBoth = Object.values(moved).some((v) => /arrow ok, \w ok/.test(v));
        const noneBroken = !Object.values(moved).some((v) => /NO/.test(v));
        rec('B3', 'Arrow keys and WASD both move one tile', anyBoth && noneBroken, JSON.stringify(moved));
    }
    // ------------------------------------------------------------------ B4 collision + no combat time
    {
        const before = await page.evaluate(() => ({ round: enso.stats.rounds, res: enso.player.resource.current, st: enso.player.statusEffects.length, combat: !!enso.combat }));
        let blocked = null;
        for (const d of ['up', 'left', 'down', 'right']) {
            let last = (await S()).pos, stuck = 0;
            for (let i = 0; i < 16 && stuck < 3; i++) { const s = await step(d); if (s.pos.x === last.x && s.pos.y === last.y && s.pos.map === last.map) stuck++; last = s.pos; }
            if (stuck >= 3) { blocked = { d, at: last }; break; }
        }
        const after = await page.evaluate(() => ({ round: enso.stats.rounds, res: enso.player.resource.current, st: enso.player.statusEffects.length, combat: !!enso.combat }));
        rec('B4', 'Walls stop you (pressing on stays put); walking adds no rounds, statuses or resource', !!blocked && JSON.stringify(before) === JSON.stringify(after),
            `stopped by a wall going ${blocked && blocked.d} at (${blocked && blocked.at.x},${blocked && blocked.at.y}); engine before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
    }
    // ------------------------------------------------------------------ B5 inspect + dialog close doesn't step
    {
        const o = await objAt('cellar', 'cellar_tallies');
        await faceAt(o.x, o.y);
        await press('e', 250);
        const opened = (await S()).dialog;
        const p0 = (await S()).pos;
        let s = await S(), n = 0; while (s.dialog && n++ < 8) { await press('Enter', 200); s = await S(); }
        await sleep(300); const p1 = (await S()).pos;
        rec('B5', 'E opens the inspect text; closing it with Enter does not also move you', opened && !s.dialog && p0.x === p1.x && p0.y === p1.y, `dialog opened ${opened}; position ${p0.x},${p0.y} -> ${p1.x},${p1.y}`);
    }
    // ------------------------------------------------------------------ B6 pause blocks movement
    {
        await press('Escape', 250); const opened = (await S()).pause;
        const p0 = (await S()).pos;
        for (const d of ['left', 'right', 'up', 'down']) { await page.keyboard.down(KEY[d]); await sleep(200); await page.keyboard.up(KEY[d]); }
        const p1 = (await S()).pos;
        await press('Escape', 250); const closed = !(await S()).pause;
        await sleep(200); const p2 = (await S()).pos;
        rec('B6', 'Esc opens the menu; arrows while it is open move nothing (and leak no step on close)', opened && closed && p0.x === p1.x && p0.y === p1.y && p1.x === p2.x && p1.y === p2.y, `menu opened ${opened}, closed ${closed}; pos ${p0.x},${p0.y} -> ${p1.x},${p1.y} -> ${p2.x},${p2.y}`);
    }
    // ------------------------------------------------------------------ B7 transitions both ways, no bounce-back
    {
        const legs = [['cellar', 'cellar_stairs', 'house'], ['house', 'house_front_door', 'grounds'], ['grounds', 'grounds_house_door', 'house'], ['house', 'house_cellar_stairs', 'cellar']];
        const res = [];
        for (const [m, ex, to] of legs) {
            const e = await exitOf(m, ex);
            const r = await route(e.x, e.y);
            if (!r) { res.push(`${ex}: no route`); continue; }
            for (const d of r) await step(d);
            await idle(2500); await sleep(400);
            const s1 = await S(); await sleep(900); const s2 = await S();
            const onExit = await page.evaluate(() => !!ensoWorld.exitAt(ensoWorld.x, ensoWorld.y));
            res.push(`${m}->${s2.pos.map}${s2.pos.map === to && s1.pos.map === to && !onExit ? '' : ' (BAD' + (onExit ? ', spawned on an exit' : '') + ')'}`);
        }
        rec('B7', 'Cellar -> house -> grounds -> house -> cellar by walking; you stay put after each transition (no bounce-back)', res.every((x) => !/BAD|no route/.test(x)), res.join(' · '));
    }
    // jump straight to the outdoor tests (placement only; every action below is still real keys)
    const goto = async (m, sp) => { await page.evaluate(([m, sp]) => ensoDebug.goto(m, sp), [m, sp]); await idle(); let s = await S(), n = 0; while (s.dialog && n++ < 5) { await press('Escape', 150); s = await S(); } };
    // ------------------------------------------------------------------ B8 pickup once, not farmable by re-entry
    {
        await goto('grounds', 'from_house');
        const door = await exitOf('grounds', 'grounds_shed_door');
        for (const d of await route(door.x, door.y)) await step(d);
        await idle(2500); await sleep(300);
        const inShed = (await S()).pos.map === 'shed';
        const o = await objAt('shed', 'shed_bandages');
        await faceAt(o.x, o.y);
        const inv0 = (await S()).inv.filter((i) => i === 'Bandages').length;
        await press('e', 300); let s = await S(), n = 0; while (s.dialog && n++ < 5) { await press('Enter', 200); s = await S(); }
        const inv1 = (await S()).inv.filter((i) => i === 'Bandages').length;
        const back = await exitOf('shed', 'shed_door');
        for (const d of await route(back.x, back.y)) await step(d);
        await idle(2500); await sleep(300);
        for (const d of await route(door.x, door.y)) await step(d);
        await idle(2500); await sleep(300);
        const visible = await page.evaluate(() => ensoWorld.visibleObjects().some((x) => x.id === 'shed_bandages'));
        await faceAt(o.x, o.y); await press('e', 300); s = await S(); n = 0; while (s.dialog && n++ < 5) { await press('Enter', 200); s = await S(); }
        const inv2 = (await S()).inv.filter((i) => i === 'Bandages').length;
        rec('B8', 'Shed: walk in, pick up the Bandages with E (+1); leave and re-enter: gone, E gives nothing more', inShed && inv1 === inv0 + 1 && !visible && inv2 === inv1, `in shed ${inShed}; Bandages ${inv0} -> ${inv1} -> after re-entry ${inv2}; still on the map: ${visible}`);
    }
    // ------------------------------------------------------------------ B9 encounter: overlay, input focus, flee, no instant re-fight
    {
        await goto('grounds', 'from_house');
        const enc = await page.evaluate(() => ENSO.world.zone1.maps.grounds.encounters[0]);
        await page.evaluate(() => { enso.player.hp = enso.player.maxHp = 9999; });
        // walk up to it and then into it
        let ok = false;
        for (const [d, dx, dy] of [['down', 0, -1], ['up', 0, 1], ['right', -1, 0], ['left', 1, 0]]) {
            const r = await route(enc.x + dx, enc.y + dy);
            if (r) { for (const s of r) await step(s); await step(d); ok = true; break; }
        }
        await sleep(600);
        let s = await S();
        const inCombat = s.screen === 'combat' && s.combat && s.mode === 'combat';
        const pos0 = s.pos;
        for (const d of ['left', 'right', 'up', 'down']) { await page.keyboard.down(KEY[d]); await sleep(120); await page.keyboard.up(KEY[d]); }
        const pos1 = (await S()).pos;
        // choose Flee: it's the 4th root item
        const fleeIdx = await page.evaluate(() => [...document.querySelectorAll('#combat .battle-menu li')].findIndex((li) => /Flee/.test(li.innerText)));
        const curIdx = await page.evaluate(() => [...document.querySelectorAll('#combat .battle-menu li')].findIndex((li) => /selected|active|current/.test(li.className)));
        for (let i = Math.max(0, curIdx); i < fleeIdx; i++) await press('ArrowDown', 80);
        await press('Enter', 500);
        s = await S();
        const fled = s.screen === 'explore' && !s.combat;
        await sleep(800); const stillOut = (await S()).screen === 'explore';
        // walk straight back into it: must be blocked by the cooldown (no fight)
        const facing = (await S()).pos.facing;
        await step(facing); await sleep(500);
        const reFight = (await S()).screen === 'combat';
        rec('B9', 'Walking into the rats opens the battle; arrows during battle never move you; Flee returns to the map; walking straight back in does NOT restart the fight',
            ok && inCombat && pos0.x === pos1.x && pos0.y === pos1.y && fled && stillOut && !reFight,
            `battle opened ${inCombat}; map position during battle ${pos0.x},${pos0.y} -> ${pos1.x},${pos1.y}; fled ${fled}; still exploring after 0.8 s ${stillOut}; immediate re-contact started a fight: ${reFight}`);
        // B10: step away, come back, fight to victory with keys only
        const away = { up: 'down', down: 'up', left: 'right', right: 'left' }[facing];
        await page.evaluate(() => { enso.player.level = 2; enso.player.xpToNext = 150; enso.player.xp = 149; }); // this win reaches level 3
        await step(away); await step(away);                       // 2 tiles away clears the flee cooldown
        for (let i = 0; i < 3 && (await S()).screen !== 'combat'; i++) { await step(facing); await sleep(150); } // back, then into it
        await sleep(600);
        const reOpened = (await S()).screen === 'combat';
        let rounds = 0;
        while ((await S()).screen === 'combat' && rounds++ < 80) {
            // root menu: Attack is first; Enter, then Enter again on a target menu if one opens
            await press('Home', 30); await press('Enter', 120);
            const targetMenu = await page.evaluate(() => [...document.querySelectorAll('#combat .battle-menu li')].some((li) => /HP/.test(li.innerText)));
            if (targetMenu) await press('Enter', 150);
            const st = await page.evaluate(() => ({ ended: !!document.querySelector('#combat') && /Victory|Defeat/.test(document.querySelector('#combat .battle-head') ? document.querySelector('#combat .battle-head').innerText : ''), mode: enso.mode }));
            if (st.mode !== 'combat') { await press('Enter', 300); }
        }
        await sleep(400); s = await S();
        // B14: the level-3 branch choice opens as a menu after the win; Enter picks the first branch
        const branchMenu = s.modal === 'branch';
        if (branchMenu) { await press('Enter', 300); let t = await S(), n = 0; while ((t.dialog || t.modal) && n++ < 6) { await press('Enter', 200); t = await S(); } }
        const prog = await page.evaluate(() => ({ level: enso.player.level, branch: enso.progression.branch, mode: enso.mode }));
        s = await S();
        rec('B14', 'Reaching level 3 in a world fight opens the branch menu; Enter chooses; you are back exploring', branchMenu && !!prog.branch && prog.mode === 'explore' && s.screen === 'explore',
            `branch menu shown ${branchMenu}; level ${prog.level}, branch ${prog.branch}, engine ${prog.mode}, screen ${s.screen}`);
        const gone = !(await page.evaluate((id) => ensoWorld.visibleObjects().some((x) => x.id === id), enc.id));
        const near = Math.max(Math.abs(s.pos.x - enc.x), Math.abs(s.pos.y - enc.y)) <= 2 && s.pos.map === 'grounds';
        rec('B10', 'After stepping away it can be fought again; Attack + Enter wins; you return next to where it stood; it is gone from the map',
            reOpened && s.screen === 'explore' && gone && near, `re-engaged ${reOpened}; after ${rounds} key rounds: screen ${s.screen}, engine ${s.mode}; encounter gone ${gone}; at ${s.pos.x},${s.pos.y} (enemy stood at ${enc.x},${enc.y})`);
    }
    // ------------------------------------------------------------------ B11 road boundary notice, can turn back
    {
        await goto('road', 'from_grounds');
        const b = await page.evaluate(() => ENSO.world.zone1.maps.road.boundaries && ENSO.world.zone1.maps.road.boundaries[0]);
        let txt = '', turned = false;
        if (b) {
            // walk to the nearest tile of the boundary rectangle
            let target = null;
            for (let y = b.y; y < b.y + (b.h || 1) && !target; y++) for (let x = b.x; x < b.x + (b.w || 1) && !target; x++) if (await route(x, y)) target = [x, y];
            if (target) {
                const r = await route(...target);
                // the boundary tile itself is excluded by route(); step the last move manually
                for (const d of r) await step(d);
                await sleep(500); const s = await S(); txt = s.dialogText;
                let n = 0; let st = s; while (st.dialog && n++ < 5) { await press('Enter', 200); st = await S(); }
                const back = await exitOf('road', 'road_back'); const rb = await route(back.x, back.y);
                if (rb) { for (const d of rb) await step(d); await idle(2500); await sleep(300); turned = (await S()).pos.map === 'grounds'; }
            }
        }
        rec('B11', 'The road edge shows a "beyond the homestead / coming later" notice and you can walk back to the grounds', !!b && /later|beyond|coming/i.test(txt) && turned, `notice: "${(txt || '').replace(/\s+/g, ' ').slice(0, 90)}"; walked back to grounds ${turned}`);
    }
    // ------------------------------------------------------------------ B12 defeat
    {
        await goto('road', 'from_grounds');
        await page.evaluate(() => { enso.player.hp = 1; enso.player.def = 0; });
        const w = await page.evaluate(() => ENSO.world.zone1.maps.road.encounters[0]);
        for (const [d, dx, dy] of [['down', 0, -1], ['up', 0, 1], ['right', -1, 0], ['left', 1, 0]]) {
            const r = await route(w.x + dx, w.y + dy);
            if (r) { for (const s of r) await step(s); await step(d); break; }
        }
        await sleep(700);
        let rounds = 0;
        while ((await S()).screen === 'combat' && (await page.evaluate(() => enso.mode)) === 'combat' && rounds++ < 30) { await press('Home', 30); await press('Enter', 150); await press('Enter', 150); }
        await sleep(400); const s = await S();
        rec('B12', 'At 1 HP the wolf wins: game over (no return to the map)', s.mode === 'game_over' && s.screen !== 'explore', `engine ${s.mode}, screen ${s.screen}`);
    }
    // ------------------------------------------------------------------ B13 errors over the whole session
    rec('B13', 'No script errors during the whole session', !errors.length, errors.length ? errors.slice(0, 3).join(' | ') : 'none');

    await browser.close();
    console.log('World Zone 1 — browser checks (headless Chromium, real key presses)\n');
    console.log(out.join('\n'));
    console.log(`\n${out.filter((l) => l.startsWith('PASS')).length}/${out.length} pass`);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
