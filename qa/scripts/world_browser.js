// World Zone 1 in a real browser (headless Chromium), driven by real key presses only.
// Checks the Zone 1 spec's player-facing acceptance criteria (docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md
// §3, §4, §7) that engine-level tests can't see: keys, collision, transitions, input focus, overlays.
// Routes are computed from the map data (BFS), but every step is a real keydown/keyup.
// Uses Playwright if it is installed anywhere on the machine; it is NOT a repo dependency.
//   node qa/scripts/world_browser.js            PLAYWRIGHT=/path/to/playwright node qa/scripts/world_browser.js
//   --legacy-battle   also run the old battle-menu checks (B9, B10, B12, B14) on world.html?combat=turn
//   --headed          show the browser
// Exploration checks (B1-B8, B11, B13) run against the default build. Exit code 1 on any FAIL.
// 2026-10-25 (Tally): routes are null-safe (the "(intermediate value) is not iterable" crash when a BFS found no
// route), the old battle-overlay checks are legacy-only, and B11 follows Chapter One's opened road (road -> tollway -> road).
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function loadPlaywright() {
    const tries = [process.env.PLAYWRIGHT, 'playwright', '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright'].filter(Boolean);
    for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
    return null;
}
const pw = loadPlaywright();
if (!pw) { console.log('SKIP: Playwright not found (set PLAYWRIGHT=/path/to/playwright). Not a repo dependency.'); process.exit(0); }

const LEGACY = process.argv.includes('--legacy-battle');
const HEADED = process.argv.includes('--headed');
const out = [];
const rec = (id, what, ok, note) => out.push(`${ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${note}`);
const skip = (id, what) => out.push(`SKIP  [${id}] ${what}\n        legacy battle-menu check: run with --legacy-battle (world.html?combat=turn)`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const WASD = { up: 'w', down: 's', left: 'a', right: 'd' };

(async () => {
    const browser = await pw.chromium.launch(HEADED ? { headless: false } : undefined);
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1000, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.goto('file://' + path.join(ROOT, 'world.html') + (LEGACY ? '?combat=turn' : ''));
    await sleep(300);
    const ACTION = await page.evaluate(() => !!(ENSO.actionSim && !/combat=(turn|realtime)/.test(location.search)));   // free movement build

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
        if (ACTION) {   // free movement: first re-centre on the tile across the step, so the body doesn't snag a wall corner
            const off = await page.evaluate((dir) => { const sm = ensoDebug.sim(), T = sm.T; return dir === 'left' || dir === 'right' ? sm.player.y / T - 0.5 - ensoWorld.y : sm.player.x / T - 0.5 - ensoWorld.x; }, dir);
            if (Math.abs(off) > 0.12) {
                const k = dir === 'left' || dir === 'right' ? (off > 0 ? keys.up : keys.down) : (off > 0 ? keys.left : keys.right);
                await page.keyboard.down(k); await sleep(Math.min(200, Math.abs(off) * 210)); await page.keyboard.up(k); await sleep(30);
            }
        }
        const before = (await S()).pos;
        await page.keyboard.down(keys[dir]);
        const t0 = Date.now();
        while (Date.now() - t0 < 400) {
            const p = (await S()).pos;
            if (!p || p.x !== before.x || p.y !== before.y || p.map !== before.map || !ACTION && p.facing !== before.facing && Date.now() - t0 > 60) break;   // combat v3: WASD faces at once, so only a tile change ends a step
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
    /** Walk to (gx, gy) one real step at a time, re-routing after every step: a held key can slide two tiles on a
     *  slow machine (QA 2026-10-25: B5/B7/B8 overshot and then followed a stale route). Stops if the map changes. */
    const walkTo = async (gx, gy, max = 240) => {
        const m0 = (await S()).pos.map;
        for (let i = 0; i < max; i++) {
            const p = (await S()).pos;
            if (p.map !== m0) return true;
            if (p.x === gx && p.y === gy) return true;
            const r = await route(gx, gy);
            if (process.env.QA_DEBUG) console.log(`  walkTo ${gx},${gy}: at ${p.map} ${p.x},${p.y} route ${r ? r.length + ' ' + r[0] : 'none'}`, JSON.stringify(await page.evaluate(() => { const sm = window.ensoDebug.sim && ensoDebug.sim(); return [ensoDebug.state().screen, ensoDebug.state().modal, sm && +(sm.player.x / 16 - 0.5).toFixed(2), sm && +(sm.player.y / 16 - 0.5).toFixed(2), sm && sm.player.state]; })));
            if (!r) return false;
            if (!r.length) return true;
            await step(r[0]);
        }
        return false;
    };
    const walk = walkTo;
    /** Stand next to (x,y) and face it. */
    const faceAt = async (x, y) => {
        for (const [d, dx, dy] of [['down', 0, -1], ['up', 0, 1], ['right', -1, 0], ['left', 1, 0]]) {
            const r = await route(x + dx, y + dy);
            if (r && await walkTo(x + dx, y + dy)) { const p = (await S()).pos; if (p.facing !== d) await step(d); return true; }
        }
        return false;
    };
    const objAt = (mapId, id) => page.evaluate(([m, id]) => { const map = ensoDebug.world.maps[m]; return [...(map.interactables || []), ...(map.encounters || [])].find((o) => o.id === id); }, [mapId, id]);
    const exitOf = (mapId, id) => page.evaluate(([m, id]) => ensoDebug.world.maps[m].exits.find((e) => e.id === id), [mapId, id]);
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
            await walkTo(e.x, e.y);
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
        await walkTo(door.x, door.y);
        await idle(2500); await sleep(300);
        const inShed = (await S()).pos.map === 'shed';
        const o = await objAt('shed', 'shed_bandages');
        if (!inShed) console.log('  note B8: did not reach the shed (no route from the spawn?)');
        await faceAt(o.x, o.y);
        const inv0 = (await S()).inv.filter((i) => i === 'Bandages').length;
        await press('e', 300); let s = await S(), n = 0; while (s.dialog && n++ < 5) { await press('Enter', 200); s = await S(); }
        const inv1 = (await S()).inv.filter((i) => i === 'Bandages').length;
        const back = await exitOf('shed', 'shed_door');
        await walkTo(back.x, back.y);
        await idle(2500); await sleep(300);
        await walkTo(door.x, door.y);
        await idle(2500); await sleep(300);
        const visible = await page.evaluate(() => ensoWorld.visibleObjects().some((x) => x.id === 'shed_bandages'));
        await faceAt(o.x, o.y); await press('e', 300); s = await S(); n = 0; while (s.dialog && n++ < 5) { await press('Enter', 200); s = await S(); }
        const inv2 = (await S()).inv.filter((i) => i === 'Bandages').length;
        rec('B8', 'Shed: walk in, pick up the Bandages with E (+1); leave and re-enter: gone, E gives nothing more', inShed && inv1 === inv0 + 1 && !visible && inv2 === inv1, `in shed ${inShed}; Bandages ${inv0} -> ${inv1} -> after re-entry ${inv2}; still on the map: ${visible}`);
    }
    // ------------------------------------------------------------------ B9 encounter: overlay, input focus, flee, no instant re-fight
    if (!LEGACY) { skip('B9', 'Battle overlay: arrows never move you, Flee, no instant re-fight'); skip('B14', 'Level-3 branch menu after a world fight'); skip('B10', 'Re-engage and win with Attack + Enter'); }
    else {
        await goto('grounds', 'from_house');
        const enc = await page.evaluate(() => ensoDebug.world.maps.grounds.encounters[0]);
        await page.evaluate(() => { enso.player.hp = enso.player.maxHp = 9999; });
        // walk up to it and then into it
        let ok = false;
        for (const [d, dx, dy] of [['down', 0, -1], ['up', 0, 1], ['right', -1, 0], ['left', 1, 0]]) {
            const r = await route(enc.x + dx, enc.y + dy);
            if (r && await walkTo(enc.x + dx, enc.y + dy)) { await step(d); ok = true; break; }
        }
        await sleep(600);
        let s = await S();
        const inCombat = s.screen === 'combat' && s.combat && s.mode === 'combat';
        const pos0 = s.pos;
        for (const d of ['left', 'right', 'up', 'down']) { await page.keyboard.down(KEY[d]); await sleep(120); await page.keyboard.up(KEY[d]); }
        const pos1 = (await S()).pos;
        // choose Flee: it's the 4th root item
        const fleeIdx = await page.evaluate(() => [...document.querySelectorAll('#combat .menu li')].findIndex((li) => /Flee/.test(li.innerText)));
        const curIdx = await page.evaluate(() => [...document.querySelectorAll('#combat .menu li')].findIndex((li) => /selected|active|current/.test(li.className)));
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
            const targetMenu = await page.evaluate(() => [...document.querySelectorAll('#combat .menu li')].some((li) => /HP/.test(li.innerText)));
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
    // ------------------------------------------------------------------ B11 the road on: road -> tollway -> road
    {
        await goto('road', 'from_grounds');
        const b = await page.evaluate(() => ensoDebug.world.maps.road.boundaries && ensoDebug.world.maps.road.boundaries[0]);
        const ex = await page.evaluate(() => ensoDebug.world.maps.road.exits.find((e) => /^road_tollway$/.test(e.id)));
        let res = '', ok = false;
        if (ex) {   // Chapter One: the fog edge is now a way on (src/world/chapter1-maps.js homestead.roadExit)
            const r = await route(ex.x, ex.y);
            if (r) { await walkTo(ex.x, ex.y); await idle(2500); await sleep(400); }
            let s = await S(); let n = 0; while (s.dialog && n++ < 5) { await press('Enter', 200); s = await S(); }
            const there = s.pos.map === 'tollway';
            const back = await page.evaluate(() => ensoWorld.map.exits.find((e) => e.id === 'tollway_north'));
            const rb = back && (await route(back.x, back.y));
            if (rb) { await walkTo(back.x, back.y); await idle(2500); await sleep(400); }
            s = await S(); n = 0; while (s.dialog && n++ < 5) { await press('Enter', 200); s = await S(); }
            const returned = s.pos.map === 'road';
            ok = !!r && there && returned;
            res = `route to road_tollway ${!!r}; reached tollway ${there}; walked back to road ${returned} (at ${s.pos.map} ${s.pos.x},${s.pos.y})`;
        } else if (b) {
            res = 'road boundary present but no tollway exit: Chapter One maps not loaded?';
        } else res = 'neither a road boundary nor the tollway exit exists';
        rec('B11', 'The road south leads on: walking into the fog reaches the Broken Tollway, and its north exit walks you back', ok, res);
    }
    // ------------------------------------------------------------------ B12 defeat
    if (!LEGACY) skip('B12', 'At 1 HP the wolf wins on the battle screen: game over');
    else {
        await goto('road', 'from_grounds');
        await page.evaluate(() => { enso.player.hp = 1; enso.player.def = 0; });
        const w = await page.evaluate(() => ensoDebug.world.maps.road.encounters[0]);
        for (const [d, dx, dy] of [['down', 0, -1], ['up', 0, 1], ['right', -1, 0], ['left', 1, 0]]) {
            const r = await route(w.x + dx, w.y + dy);
            if (r && await walkTo(w.x + dx, w.y + dy)) { await step(d); break; }
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
    console.log(`World Zone 1 — browser checks (headless Chromium, real key presses)${LEGACY ? ' — with legacy battle checks, ?combat=turn' : ''}\n`);
    console.log(out.join('\n'));
    const fails = out.filter((l) => l.startsWith('FAIL')).length;
    console.log(`\n${out.filter((l) => l.startsWith('PASS')).length} pass · ${fails} fail · ${out.filter((l) => l.startsWith('SKIP')).length} skipped (legacy)`);
    process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(1); });
