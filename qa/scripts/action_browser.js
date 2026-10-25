// Combat v3 (seamless action RPG) in a real browser — Tally, QA & Balance Tester.
// Checks the Creative Director's §13 outcomes (docs/design/ENSO_SEAMLESS_ACTION_RPG_DIRECTION.md) against the
// TARGET behaviour, by real key presses / mouse clicks in headless Chromium, with a screenshot at every step.
// Contract: docs/ACTION_COMBAT.md. Debug setup (placement, HP buffer, story flag) goes through window.ensoDebug;
// every player action is a real key or mouse event.
//
//   node qa/scripts/action_browser.js                 all checks, headless, warrior
//   node qa/scripts/action_browser.js --class rogue --check a,c,e --headed --strict
//   --root /path/to/checkout   test another copy of the game (screenshots go to qa/results/action/<dirname>/)
//   --query combat=action   extra URL query for world.html (default: combat=action; pass --query '' for none)
//
// Checks: a sub-tile + diagonal movement · b no overlay, enemies approach · c attack lowers HP, move mid-fight · d dodge
//   e loot drop collected once · f no console errors · g Crow Warden challenged by dialogue and fought in the map
//   h save/load keeps the dead dead · i leash · j guard · k ranged acolytes · l death -> respawn · m save refused in a fight
//   n map exit mid-fight · o parry · p collision
// Results: PASS / FAIL / NOT YET. NOT YET = the feature's hook or mode isn't in the build yet (window.ensoDebug.action
// missing, or the game still uses grid steps / the battle overlay); the observed behaviour is still reported.
// Exit code 1 on any FAIL (and on NOT YET with --strict). Screenshots + results.json: qa/results/action/.
//
// Hooks: window.ensoDebug.sim() (the ActionSim) is used when present; window.ensoDebug.action, if Wren adds it, wins:
//   player()   -> { x, y } in map pixels (or { tx, ty } in tiles, or unit:'tile'), optional map
//   enemies()  -> [{ id, encounterId, key, x, y, hp, maxHp, state }]   (x, y in map pixels, same rule as player)
//   sim()      -> the ActionSim (only checked for presence)
//   toScreen(x, y) -> { x, y } CSS px relative to the canvas, for mouse aim (else the harness aims from canvas centre)
//   place(x, y) -> put the player at tile (x, y) of the current map (else ensoDebug.nextTo / goto are used)
const path = require('path');
const fs = require('fs');
const argv0 = process.argv.slice(2);
const rootIx = argv0.indexOf('--root');
const ROOT = rootIx >= 0 ? path.resolve(argv0[rootIx + 1]) : path.join(__dirname, '..', '..');   // --root: test another checkout (e.g. a git archive of HEAD)
const OUT = path.join(__dirname, '..', 'results', 'action', rootIx >= 0 ? path.basename(ROOT) : '');

function loadPlaywright() {
    const tries = [process.env.PLAYWRIGHT, 'playwright', '/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright'].filter(Boolean);
    for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
    return null;
}
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const HEADED = flag('--headed'), STRICT = flag('--strict');
const CLS = opt('--class', 'warrior');
const QUERY = opt('--query', 'combat=action');
const ONLY = (opt('--check', 'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const pw = loadPlaywright();
if (!pw) { console.log('SKIP: Playwright not found (set PLAYWRIGHT=/path/to/playwright). Not a repo dependency.'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^\d+_.*\.png$/.test(f)) fs.unlinkSync(path.join(OUT, f));   // this run's screenshots only

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const rec = (id, what, status, reason, shots = []) => results.push({ id, what, status, reason, shots });
const tilesEq = (a, b) => a && b && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
const frac = (v) => Math.abs(v - Math.round(v)) > 0.01;
const fmt = (p) => p ? `${p.map || ''}(${(+p.x).toFixed(2)},${(+p.y).toFixed(2)})` : 'null';
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

(async () => {
    const browser = await pw.chromium.launch(HEADED ? { headless: false } : undefined);
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1000, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    fs.mkdirSync(OUT, { recursive: true });
    const url = 'file://' + path.join(ROOT, 'world.html') + (QUERY ? '?' + QUERY : '');
    let shotN = 0;
    let killed = null;
    const shot = async (name) => { const f = path.join(OUT, `${String(++shotN).padStart(2, '0')}_${name}.png`); try { await page.screenshot({ path: f }); } catch (e) { return null; } return path.relative(path.join(__dirname, '..', '..'), f); };
    /** Every check starts from a fresh page + new game, so one check's fight can't leak into the next. */
    const resetIfOverlay = async () => { killed = null; await page.reload(); await sleep(500); await page.evaluate((c) => ensoDebug.start(c), CLS); await sleep(600); await closeDialogs(); };

    // ---------------------------------------------------------------- in-page probes
    const S = () => page.evaluate(() => {
        const A = window.__qaHooks && window.__qaHooks();
        const call = (f) => { try { return A && typeof A[f] === 'function' ? A[f]() : undefined; } catch (e) { return { error: e.message }; } };
        const norm = (p, ts) => {
            if (!p || p.error) return null;
            if (p.tx != null) return { x: p.tx, y: p.ty };
            if (p.unit === 'tile') return { x: p.x, y: p.y };
            return { x: p.x / ts, y: p.y / ts };
        };
        const w = window.ensoWorld, ts = (w && w.map && w.map.tileSize) || 16;
        const grid = w ? w.getState() : null;
        const ap = call('player');
        const player = norm(ap, ts) ? { ...norm(ap, ts), map: (ap && ap.map) || (grid && grid.map), src: 'action' } : grid ? { x: grid.x, y: grid.y, map: grid.map, src: 'grid' } : null;
        const ae = call('enemies');
        const enemies = Array.isArray(ae) ? ae.map((e) => ({ ...e, ...(norm(e, ts) || {}) })) : null;
        const eng = window.enso;
        const hidden = (id) => { const el = document.getElementById(id); return !el || el.hidden || getComputedStyle(el).display === 'none'; };
        return {
            dbg: window.ensoDebug ? ensoDebug.state() : null,
            hooks: { action: !!A, fromSim: !!(A && A.fromSim), player: !!(A && A.player), enemies: !!(A && A.enemies), sim: !!(A && A.sim), toScreen: !!(A && A.toScreen), place: !!(A && A.place) },
            combatMode: eng && eng.combatMode, mode: eng && eng.mode,
            player, enemies,
            engineEnemies: eng && eng.combat && eng.combat.enemies ? eng.combat.enemies.map((e) => ({ id: e.id, key: e.key, name: e.name, hp: e.hp, maxHp: e.maxHp })) : [],
            gold: eng && eng.player ? eng.player.gold : null, hp: eng && eng.player ? eng.player.hp : null,
            defeated: eng && eng.world ? [...(eng.world.defeated || [])] : [],
            drops: eng && typeof eng.getWorldDrops === 'function' && w ? eng.getWorldDrops(w.mapId) : null,
            visible: w ? w.visibleObjects().map((o) => o.id) : [],
            engaged: A && A.engaged ? A.engaged() : (eng && eng.mode === 'combat'), projectiles: A && A.projectiles ? A.projectiles() : null,
            ap: ap && !ap.error ? { stamina: ap.stamina, guarding: ap.guarding, state: ap.state } : null,
            maxHp: eng && eng.player ? eng.player.maxHp : null,
            combatOverlay: !hidden('combat'), dialog: !hidden('dialog'), pause: !hidden('pause')
        };
    });
    const isAction = (s) => !!(s.hooks.action && s.hooks.player) || s.combatMode === 'action';
    const closeDialogs = async () => { for (let n = 0; n < 8; n++) { const s = await S(); if (!s.dialog) return; await page.keyboard.press('Escape'); await sleep(150); } };
    /** Hold keys for ms, sampling the player position every ~40 ms. */
    const hold = async (keys, ms) => {
        const samples = [(await S()).player];
        for (const k of keys) await page.keyboard.down(k);
        const t0 = Date.now();
        while (Date.now() - t0 < ms) { await sleep(40); samples.push((await S()).player); }
        for (const k of keys) await page.keyboard.up(k);
        await sleep(120); samples.push((await S()).player);
        return samples;
    };
    /** Steer toward tile (tx, ty) with WASD until within `near` tiles (or timeout). */
    const steer = async (tx, ty, near = 0.6, timeout = 6000, onTick) => {
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) {
            const s = await S(); if (!s.player) return false;
            if (onTick && (await onTick(s))) return 'stop';
            const dx = tx - s.player.x, dy = ty - s.player.y;
            if (Math.hypot(dx, dy) <= near) return true;
            const keys = [];
            if (Math.abs(dx) > 0.3) keys.push(dx > 0 ? 'd' : 'a');
            if (Math.abs(dy) > 0.3) keys.push(dy > 0 ? 's' : 'w');
            if (!isAction(s) && keys.length > 1) keys.splice(Math.abs(dx) > Math.abs(dy) ? 1 : 0, 1);   // grid: one axis at a time
            await hold(keys, isAction(s) ? Math.min(140, 40 + Math.hypot(dx, dy) * 60) : Math.hypot(dx, dy) > 3 ? 120 : 40);
        }
        return false;
    };
    /** BFS waypoints over the map's collision (ensoWorld.isBlocked) to tile (gx, gy); the goal itself may be solid (an enemy). */
    const pathTo = (gx, gy) => page.evaluate(([gx, gy]) => {
        const w = window.ensoWorld; if (!w) return null;
        let sx = Math.round(w.x), sy = Math.round(w.y);
        const A = window.__qaHooks && window.__qaHooks();
        if (A && A.player) { const p = A.player(); sx = Math.round(p.tx != null ? p.tx : p.x); sy = Math.round(p.ty != null ? p.ty : p.y); }
        gx = Math.round(gx); gy = Math.round(gy);
        const key = (x, y) => x + ',' + y, exits = new Set((w.map.exits || []).map((e) => key(e.x, e.y)));
        const prev = new Map([[key(sx, sy), null]]), q = [[sx, sy]];
        while (q.length) {
            const [x, y] = q.shift(); if (x === gx && y === gy) break;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k)) continue;
                const goal = nx === gx && ny === gy;
                if (!goal && (w.isBlocked(nx, ny) || exits.has(k))) continue;
                prev.set(k, [x, y]); q.push([nx, ny]);
            }
        }
        if (!prev.has(key(gx, gy))) return null;
        const pts = []; let c = [gx, gy];
        while (c) { pts.unshift(c); c = prev.get(key(c[0], c[1])); }
        return pts.filter((p, i) => i === pts.length - 1 || i === 0 || !((pts[i - 1][0] === p[0] && pts[i + 1][0] === p[0]) || (pts[i - 1][1] === p[1] && pts[i + 1][1] === p[1])));   // corners only
    }, [gx, gy]);
    /** Walk to tile (gx, gy) along a BFS path with real keys; stops early when onTick returns true. */
    const travel = async (gx, gy, near = 0.6, timeout = 15000, onTick) => {
        const pts = await pathTo(gx, gy);
        if (!pts) return steer(gx, gy, near, timeout, onTick);
        const t0 = Date.now();
        for (let i = 1; i < pts.length; i++) {
            const last = i === pts.length - 1;
            const r = await steer(pts[i][0], pts[i][1], last ? near : 0.35, Math.max(800, timeout - (Date.now() - t0)), onTick);
            if (onTick && r === 'stop') return true;
            if (Date.now() - t0 > timeout) return false;
        }
        return true;
    };
    const aimAt = async (s, target) => {
        const box = await page.locator('#world-canvas').boundingBox();
        if (!box) return null;
        let pt = null;
        if (s.hooks.toScreen && target.rawX != null) pt = await page.evaluate(([x, y]) => window.__qaHooks().toScreen(x, y), [target.rawX, target.rawY]);
        if (!pt) { const dx = target.x - s.player.x, dy = target.y - s.player.y, d = Math.hypot(dx, dy) || 1; pt = { x: box.width / 2 + dx / d * 60, y: box.height / 2 + dy / d * 60 }; }
        await page.mouse.move(box.x + pt.x, box.y + pt.y);
        return pt;
    };
    const encOf = (mapId, id) => page.evaluate(([m, id]) => (ensoDebug.world.maps[m].encounters || []).find((e) => e.id === id) || null, [mapId, id]);
    const goto = async (m, sp) => { await page.evaluate(([m, sp]) => ensoDebug.goto(m, sp), [m, sp]); await sleep(500); await closeDialogs(); };
    const buff = () => page.evaluate(() => { enso.player.maxHp = enso.player.hp = 9999; });   // setup: survive long enough to observe
    const ratsEnc = () => encOf('grounds', 'grounds_weed_rats');
    /** Stand ~`d` tiles east of the rats (open grass in the grounds). */
    const nearRats = async (d = 4) => {
        await goto('grounds', 'from_house');
        const e = await ratsEnc();
        const s = await S();
        if (s.hooks.place) await page.evaluate(([x, y]) => window.__qaHooks().place(x, y), [e.x + 1 + d, e.y]);
        else await travel(e.x + 1 + d, e.y, 0.6, 15000);
        return e;
    };
    const living = (s) => (s.enemies || []).filter((e) => e.hp == null || e.hp > 0);

    // ---------------------------------------------------------------- boot
    // Hooks: window.ensoDebug.action if Wren adds it; otherwise built here from ensoDebug.sim() (the ActionSim:
    // positions in map px, the body centre is (tile + 0.5) * T). __qaHooks() returns tile-unit helpers.
    await page.addInitScript(() => {
        window.__qaHooks = () => {
            const D = window.ensoDebug; if (!D) return null;
            if (D.action) return D.action;
            const sim = typeof D.sim === 'function' ? D.sim() : null;
            if (!sim || !sim.player) return null;
            const T = sim.T;
            return {
                fromSim: true,
                sim: () => sim,
                player: () => ({ tx: sim.player.x / T - 0.5, ty: sim.player.y / T - 0.5, map: sim.mapId, stamina: sim.player.stamina, guarding: sim.player.guarding, state: sim.player.state }),
                enemies: () => sim.view().actors.filter((a) => a.state !== 'dead').map((a) => ({ id: a.sid, encounterId: a.encounterId, key: a.key, tx: a.x / T - 0.5, ty: a.y / T - 0.5, rawX: a.x, rawY: a.y, hp: a.hp != null ? a.hp : ((window.enso && enso.combat && enso.combat.enemies || []).find((e) => e.id === a.engineId) || {}).hp, maxHp: a.maxHp, state: a.state, engaged: a.engaged })),
                projectiles: () => sim.view().projectiles.length,
                engaged: () => sim.engaged,
                place: (x, y) => { sim.player.x = (x + 0.5) * T; sim.player.y = (y + 0.5) * T; },
                toScreen: (px, py) => {   // mirrors camera() in ui/world-ui.js
                    const map = D.world.maps[sim.mapId], c = document.getElementById('world-canvas'), W = c.width, H = c.height;
                    const mw = map.tiles[0].length * T, mh = map.tiles.length * T;
                    const vx = sim.player.x / T - 0.5, vy = (sim.player.y - T / 2 + 2) / T;
                    const camX = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, vx * T + T / 2 - W / 2));
                    const camY = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, vy * T + T / 2 - H / 2));
                    const r = c.getBoundingClientRect();
                    return { x: (px - Math.round(camX)) * r.width / W, y: (py - Math.round(camY)) * r.height / H };
                }
            };
        };
    });
    await page.goto(url);
    await sleep(500);
    let bootErr = null;
    try { await page.evaluate((c) => ensoDebug.start(c), CLS); } catch (e) { bootErr = e.message.split('\n')[0]; }
    await sleep(600);
    if (bootErr) {
        const sh = await shot('boot_failed');
        for (const id of ONLY) rec(id, 'game boot', 'FAIL', `BLOCKED: ensoDebug.start('${CLS}') threw: ${bootErr}; errors: ${errors.slice(0, 2).join(' | ')}`, [sh]);
        console.log('| id | status  | check | evidence |'); for (const r of results) console.log(`| ${r.id}  | FAIL    | ${r.what} | ${r.reason} [${r.shots.join(', ')}] |`);
        await browser.close(); process.exit(1);
    }
    await closeDialogs();
    let s0 = await S();
    const bootShot = await shot('boot');
    const hookLine = `hooks: ${Object.entries(s0.hooks).map(([k, v]) => `${k}=${v ? 'yes' : 'no'}`).join(' ')}; engine combatMode=${s0.combatMode}; screen=${s0.dbg && s0.dbg.screen}`;

    // kill-the-rats shared step for (e) and (h)
    const killRats = async () => {
        if (killed) return killed;
        const e = await nearRats(3); await buff();
        const t0 = Date.now(); let hits = 0, s = await S(); const g0 = s.gold;
        const shots = [await shot('kill_start')];
        if (!isAction(s)) { killed = { ok: false, why: 'no action mode: rats can only be fought on the battle overlay', shots, g0 }; return killed; }
        while (Date.now() - t0 < 30000) {
            s = await S();
            if (s.defeated.includes(e.id) && !living(s).length) break;
            const tgt = living(s)[0] || { x: e.x + 1, y: e.y + 1 };
            if (dist(s.player, tgt) > 1.2) await steer(tgt.x, tgt.y, 1.1, 1500);
            await aimAt(s, tgt);
            await page.keyboard.press('1'); await sleep(250);
            await page.mouse.down(); await page.mouse.up(); await sleep(250); hits++;
        }
        s = await S();
        shots.push(await shot('kill_end'));
        killed = { ok: s.defeated.includes(e.id), why: `defeated list has rats: ${s.defeated.includes(e.id)}; living enemies ${living(s).length}; ${hits} attack cycles in ${((Date.now() - t0) / 1000).toFixed(1)} s`, shots, g0, enc: e };
        return killed;
    };

    // ---------------------------------------------------------------- (a) sub-tile + diagonal movement
    if (ONLY.includes('a')) {
        await goto('grounds', 'from_house');
        await hold(['s'], 500);                       // step off the doorway spawn into the yard
        const s = await S(); const p0 = s.player;
        const right = await hold(['d'], 1000);
        const p1 = right[right.length - 1];
        const anyFrac = right.some((p) => p && (frac(p.x) || frac(p.y)));
        const dx = p1.x - p0.x;
        const sh1 = await shot('a_hold_d_1s');
        const diag = await hold(['w', 'a'], 600);
        const q0 = diag[0], q1 = diag[diag.length - 1];
        const both = q1.x < q0.x - 0.05 && q1.y < q0.y - 0.05;
        const sh2 = await shot('a_diag_wa');
        const ok = dx > 0 && (frac(dx) || anyFrac) && both;
        const why = `hold D 1 s: ${fmt(p0)} -> ${fmt(p1)} (dx ${dx.toFixed(3)} tiles, fractional samples ${anyFrac}); hold W+A 0.6 s: ${fmt(q0)} -> ${fmt(q1)} (both axes ${both}); source ${s.player.src}`;
        rec('a', 'Sub-tile movement (hold D 1 s -> non-integer tiles) and diagonal WASD', ok ? 'PASS' : isAction(s) ? 'FAIL' : 'NOT YET', why + (isAction(s) ? '' : ' — grid steps today'), [sh1, sh2]);
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (b) no battle overlay; enemies approach
    if (ONLY.includes('b')) {
        const e = await nearRats(5);
        let s = await S();
        const shA = await shot('b_near_rats');
        const enemies0 = living(s).map((x) => ({ id: x.id, d: dist(s.player, x) }));
        // walk toward them for 2 s (real keys); the overlay must never open
        let overlay = false, engaged = false;
        await travel(e.x + 1, e.y, 0.5, 8000, async (t) => { if (t.combatOverlay) overlay = true; if (t.mode === 'combat') engaged = true; return overlay; });
        await sleep(1200);
        s = await S(); overlay = overlay || s.combatOverlay; engaged = engaged || s.mode === 'combat';
        const shB = await shot('b_after_approach');
        let approach = null;
        if (enemies0.length && s.enemies) {
            const moved = enemies0.map((x0) => { const x1 = s.enemies.find((q) => q.id === x0.id); return x1 ? x0.d - dist(s.player, x1) : 0; });
            approach = moved.some((m) => m > 0.3);
        }
        // let them come: stand still 1.5 s and see whether the gap closes
        let closes = null;
        if (s.enemies && living(s).length) {
            const d0 = Math.min(...living(s).map((x) => dist(s.player, x)));
            await sleep(1500); const t = await S();
            const d1 = t.enemies && living(t).length ? Math.min(...living(t).map((x) => dist(t.player, x))) : d0;
            closes = d1 < d0 - 0.2 || d1 < 1.5; overlay = overlay || t.combatOverlay;
        }
        await shot('b_standing');
        const why = `battle overlay opened: ${overlay}; engine engaged: ${engaged} (screen ${s.dbg && s.dbg.screen}); enemies via hook: ${s.enemies ? s.enemies.length : 'no hook'}; approached while walking: ${approach}; closed the gap while player stood: ${closes}`;
        const ok = !overlay && closes === true;
        rec('b', 'Near the grounds rats: no battle overlay (#combat hidden), enemies move toward the player', ok ? 'PASS' : isAction(s) ? 'FAIL' : 'NOT YET', why, [shA, shB]);
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (c) attack damages, can move during fight
    if (ONLY.includes('c')) {
        const e = await nearRats(2); await buff();
        let s = await S();
        if (!isAction(s)) {
            rec('c', '1 / LMB near an enemy lowers its HP; the player can still move mid-fight', 'NOT YET', `no action mode (${hookLine}); attacks exist only on the battle overlay today`, [await shot('c_no_action')]);
        } else {
            await travel(e.x + 2, e.y, 1.0, 4000);
            s = await S();
            const tgt = living(s)[0];
            const hp0 = tgt ? tgt.hp : null;
            let t = s, t1 = null, hp1 = hp0, swings = 0;
            for (; tgt && swings < 4 && hp1 >= hp0; swings++) {   // up to 4 swings (a swing can whiff if the rat steps out of the arc)
                if (dist(t.player, tgt) > 1.2) await steer(tgt.x, tgt.y, 1.0, 800);
                t = await S(); await aimAt(t, (t.enemies || []).find((x) => x.id === tgt.id) || tgt);
                if (swings % 2) await page.keyboard.press('1'); else { await page.mouse.down(); await page.mouse.up(); }
                await sleep(600);
                t = await S(); t1 = (t.enemies || []).find((x) => x.id === tgt.id); hp1 = t1 ? t1.hp : 0;
            }
            const shA = await shot('c_after_attack');
            const inFight = t.mode === 'combat';
            const mv = await hold(['a'], 400);
            const moved = dist(mv[0], mv[mv.length - 1]) > 0.2;
            t = await S();
            const shB = await shot('c_move_in_fight');
            const ok = tgt && hp1 < hp0 && inFight && moved && !t.combatOverlay;
            rec('c', '1 / LMB near an enemy lowers its HP; the player can still move mid-fight', ok ? 'PASS' : 'FAIL',
                `target ${tgt ? tgt.id : 'none found'} HP ${hp0} -> ${hp1} after ${swings} swing(s) (LMB, 1, LMB, 1); engine mode ${t.mode}; moved during fight ${moved} (${fmt(mv[0])} -> ${fmt(mv[mv.length - 1])}); overlay ${t.combatOverlay}`, [shA, shB]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (d) dodge
    if (ONLY.includes('d')) {
        await goto('grounds', 'from_house'); await hold(['s'], 500);
        const s = await S();
        const walk = await hold(['d'], 250); const wd = dist(walk[0], walk[walk.length - 1]);
        await sleep(300);
        const p0 = (await S()).player;
        await page.keyboard.down('d'); await page.keyboard.press(' '); await sleep(250); await page.keyboard.up('d'); await sleep(150);
        const t = await S(); const dd = dist(p0, t.player);
        const sh = await shot('d_dodge');
        await closeDialogs();
        const ok = dd > wd * 1.3 && dd > 0.3;
        rec('d', 'Space dodges (moves further than a walk over the same 250 ms)', ok ? 'PASS' : isAction(s) ? 'FAIL' : 'NOT YET',
            `walk 250 ms: ${wd.toFixed(2)} tiles; Space + D 250 ms: ${dd.toFixed(2)} tiles (${fmt(p0)} -> ${fmt(t.player)}); dialog opened by Space: ${t.dialog}`, [sh]);
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (e) loot drop, collected once
    if (ONLY.includes('e')) {
        const k = await killRats();
        let s = await S();
        if (!k.ok) rec('e', 'After the enemies die a loot drop appears; walking over it collects it once (gold rises once)', isAction(s) ? 'FAIL' : 'NOT YET', `rats not killed in the world: ${k.why}`, k.shots);
        else {
            const drops = s.drops || [];
            const d = drops[0];
            if (!d) rec('e', 'After the enemies die a loot drop appears; walking over it collects it once (gold rises once)', s.drops === null ? 'NOT YET' : 'FAIL', `no drop on the map (getWorldDrops ${s.drops === null ? 'missing' : 'returned []'})`, k.shots);
            else {
                const T = await page.evaluate(() => ensoWorld.map.tileSize || 16);
                const dx = d.x / T - 0.5, dy = d.y / T - 0.5;   // drops are in map px (sim coordinates)
                const reward = () => page.evaluate(() => ({ gold: enso.player.gold, items: enso.player.inventory.length, eq: JSON.stringify(enso.player.equipment) }));
                const r0 = await reward(), shA = await shot('e_drop_visible');
                await travel(Math.round(dx), Math.round(dy), 0.3, 8000);
                await steer(dx, dy, 0.25, 2000);
                await sleep(500); s = await S();
                const r1 = await reward(), gone = !(s.drops || []).some((x) => x.id === d.id);
                const shB = await shot('e_after_collect');
                await hold(['d'], 500); await steer(dx, dy, 0.25, 3000); await sleep(500);
                const r2 = await reward();
                const rose = r1.gold > r0.gold || r1.items > r0.items || r1.eq !== r0.eq, again = r2.gold !== r1.gold || r2.items !== r1.items;
                const ok = gone && rose && !again;
                const g0 = r0.gold, g1 = r1.gold, g2 = r2.gold, usedE = false;
                rec('e', 'After the enemies die a loot drop appears; walking over it collects it once (gold rises once)', ok ? 'PASS' : 'FAIL',
                    `drop ${d.id} at px (${d.x},${d.y}) = tile (${dx.toFixed(1)},${dy.toFixed(1)}), gold ${d.gold}, items ${JSON.stringify(d.items || [])}; gold ${g0} -> ${g1} -> ${g2}, inventory ${r0.items} -> ${r1.items} -> ${r2.items} (walk over, then walk back over); drop gone ${gone}`, [...k.shots, shA, shB]);
            }
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (g) Crow Warden fight in the map
    if (ONLY.includes('g')) {
        await goto('sanctuary', 'from_featherwatch'); await buff();
        await page.evaluate(() => { if (enso.story && enso.story.quests.Q06) enso.story.quests.Q06.state = 'complete'; });   // setup: Q06 done, so the Warden offers the challenge
        const npc = await page.evaluate(() => (ensoDebug.world.maps.sanctuary.interactables || []).find((o) => o.id === 'sanctuary_warden_npc'));
        const w = await encOf('sanctuary', 'sanctuary_warden');
        const shA = await shot('g_sanctuary');
        // Real dialogue: stand below the Warden, face him, E, then pick "Stand aside..." and "(Draw your weapon.)" by keys.
        await travel(npc.x, npc.y + 2, 0.45, 10000); await page.evaluate(([x, y]) => window.__qaHooks().place(x, y), [npc.x, npc.y + 2]); await sleep(100); await hold(['w'], 700); if (process.env.QA_DEBUG) console.log('g before E', JSON.stringify((await S()).player), JSON.stringify(await page.evaluate(() => [ensoDebug.state(), ensoDebug.sim().player.facing])));   // placement snaps to the tile under the Warden (the walk can snag a corner, see report) await page.keyboard.press('e'); await sleep(400);
        if (!(await S()).dialog && !(await page.evaluate(() => ensoDebug.state().modal))) { await sleep(500); await page.keyboard.press('e'); await sleep(400); }
        if (process.env.QA_DEBUG) console.log('g after E', JSON.stringify(await page.evaluate(() => [ensoDebug.state().modal, document.getElementById('dialog').hidden, document.getElementById('dialog').innerText.slice(0, 60), document.activeElement && document.activeElement.tagName])));
        let talked = false, challenged = false;
        for (let n = 0; n < 20; n++) {
            const st = await page.evaluate(() => ({ modal: ensoDebug.state().modal, items: [...document.querySelectorAll('.talk-choices li')].map((li) => li.innerText) }));
            if (!st.modal && !(await S()).dialog) break;
            talked = true;
            const i = st.items.findIndex((t) => /Stand aside/.test(t));
            if (i >= 0) { challenged = true; for (let k = 0; k < i; k++) await page.keyboard.press('ArrowDown'); }
            await page.keyboard.press('Enter'); await sleep(300);
        }
        await sleep(500);
        let s = await S();
        const flag = await page.evaluate(() => enso.hasStoryFlag('warden_challenged'));
        const inSimAfterTalk = (s.enemies || []).some((x) => x.encounterId === 'sanctuary_warden');
        const shB = await shot('g_after_challenge');
        let note = '';
        if (flag && !inSimAfterTalk) {   // the encounter is visible but the sim built its groups on map entry: re-enter to test the fight itself
            note = ' DEFECT: after the challenge the Warden encounter is visible but the sim has no actor for it (sim.enterMap only runs on map entry); re-entered the map to test the fight.';
            await goto('sanctuary', 'from_featherwatch'); await buff();
        }
        let overlay = false, engaged = false;
        await travel(w.x, w.y + 3, 0.6, 10000, async (t) => { overlay = overlay || t.combatOverlay; engaged = engaged || t.mode === 'combat'; return overlay || engaged; });
        await sleep(1500); s = await S(); overlay = overlay || s.combatOverlay; engaged = engaged || s.mode === 'combat';
        const warden = (s.enemies || []).find((x) => /warden/i.test(x.key || x.id || ''));
        const shC = await shot('g_warden_fight');
        const ok = flag && inSimAfterTalk && engaged && !overlay && !!warden;
        rec('g', 'The Crow Warden (sanctuary_warden) is challenged by dialogue and fought in the map (no battle overlay)', ok ? 'PASS' : isAction(s) ? 'FAIL' : 'NOT YET',
            `talked ${talked}, chose challenge ${challenged}, flag ${flag}; Warden actor right after the talk ${inSimAfterTalk}; engaged ${engaged}; overlay ${overlay}; Warden actor ${warden ? `${warden.state} HP ${warden.hp}/${warden.maxHp}` : 'none'}.${note}`, [shA, shB, shC]);
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (h) save/load keeps defeated enemies gone
    if (ONLY.includes('h')) {
        const k = await killRats();
        let s = await S();
        if (!k.ok) rec('h', 'Save/load keeps defeated (world-combat) enemies gone', isAction(s) ? 'FAIL' : 'NOT YET', `prerequisite: rats not killed in the world (${k.why})`, k.shots);
        else {
            if (s.mode === 'combat') await sleep(2000);
            await page.keyboard.press('Escape'); await sleep(300);
            const tab = page.locator('#pause .mm-tabs li', { hasText: 'Save game' });
            let saved = false;
            if (await tab.count()) { await tab.first().click(); await sleep(300); saved = /Saved/.test(await page.locator('#pause').innerText()); }
            const shA = await shot('h_saved');
            await page.reload(); await sleep(700);
            await page.keyboard.press('Enter'); await sleep(400);   // title -> start menu (Continue is first)
            let t = await S(); for (let n = 0; n < 3 && t.dbg.screen === 'title'; n++) { await page.keyboard.press('Enter'); await sleep(400); t = await S(); }
            await closeDialogs();
            await goto('grounds', 'from_house'); t = await S();
            const shB = await shot('h_after_load');
            const back = t.visible.includes('grounds_weed_rats') || (t.enemies || []).some((x) => x.encounterId === 'grounds_weed_rats');
            const ok = saved && t.defeated.includes('grounds_weed_rats') && !back;
            rec('h', 'Save/load keeps defeated (world-combat) enemies gone', ok ? 'PASS' : 'FAIL', `saved ${saved}; after Continue: defeated has rats ${t.defeated.includes('grounds_weed_rats')}; rats back on map ${back}; screen ${t.dbg.screen}`, [shA, shB]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (i) leash: run away, the group gives up and resets
    if (ONLY.includes('i')) {
        const e = await nearRats(3); await buff();
        let s = await S();
        if (!isAction(s)) rec('i', 'Leash: outrun an engaged group; it disengages, goes home, combat ends', 'NOT YET', 'no action mode', []);
        else {
            await sleep(1500); s = await S(); const eng0 = s.engaged;
            await page.keyboard.down('Shift'); await travel(28, 10, 0.8, 15000); await page.keyboard.up('Shift');
            const t0 = Date.now(); while (Date.now() - t0 < 12000) { s = await S(); if (!s.engaged && s.mode !== 'combat') break; await sleep(300); }
            await sleep(2500); s = await S();
            const home = (s.enemies || []).filter((x) => x.encounterId === e.id).map((x) => Math.hypot(x.x - (e.x + 0.5), x.y - (e.y + 0.5)).toFixed(1));
            const sh = await shot('i_leash');
            const ok = eng0 && !s.engaged && s.mode !== 'combat' && home.every((d) => d < 3);
            rec('i', 'Leash: outrun an engaged group; it disengages, goes home, combat ends', ok ? 'PASS' : 'FAIL', `engaged at start ${eng0}; after running to the house: engaged ${s.engaged}, engine ${s.mode}; rats' distance from home (tiles) ${home.join(', ') || 'none'}`, [sh]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (j) guard and parry
    if (ONLY.includes('j')) {
        await goto('road', 'from_grounds'); await buff();
        const wolf = await encOf('road', 'road_wolf');
        let s = await S();
        if (!isAction(s)) rec('j', 'Guard (RMB held) takes less damage than standing open', 'NOT YET', 'no action mode', []);
        else {
            await travel(wolf.x, wolf.y + 2, 0.6, 10000, async (t) => t.engaged);
            const loss = async (guard, ms) => {
                const s0 = await S(); const tgt = living(s0)[0];
                if (tgt) await aimAt(s0, tgt);
                if (guard) await page.mouse.down({ button: 'right' });
                let g = false, hits = 0, prev = s0.hp; const t0 = Date.now();
                while (Date.now() - t0 < ms) { await sleep(100); const t = await S(); if (t.ap && t.ap.guarding) g = true; if (t.hp < prev) hits++; prev = t.hp; if (tgt) await aimAt(t, living(t)[0] || tgt); }
                if (guard) await page.mouse.up({ button: 'right' });
                return { lost: s0.hp - (await S()).hp, g, hits, ms: Date.now() - t0 };
            };
            await sleep(1500);
            const add = (a, b) => ({ lost: a.lost + b.lost, hits: a.hits + b.hits, g: a.g || b.g, ms: a.ms + b.ms });
            let open = await loss(false, 10000), guarded = await loss(true, 10000);
            if (open.lost < 6) { open = add(open, await loss(false, 10000)); guarded = add(guarded, await loss(true, 10000)); }   // too few samples: one more round
            s = await S();
            const sh = await shot('j_guard');
            // HP lost per second: a fully blocked hit costs no HP, so "per hit" would only count the hits that got through.
            const perOpen = open.lost / (open.ms / 1000), perGuard = guarded.lost / (guarded.ms / 1000);
            const ok = guarded.g && open.lost > 0 && perGuard <= perOpen * 0.6;   // warrior guard damageTaken 0.25 (actionRules)
            rec('j', 'Guard (RMB held, facing the wolf) loses <= 60% of the HP per second of standing open', ok ? 'PASS' : open.lost ? 'FAIL' : 'NOT YET',
                `open ${(open.ms / 1000).toFixed(0)} s: ${open.lost} HP in ${open.hits} damaging hits (${perOpen.toFixed(2)} HP/s); guarding ${(guarded.ms / 1000).toFixed(0)} s (sim guarding=${guarded.g}): ${guarded.lost} HP in ${guarded.hits} damaging hits (${perGuard.toFixed(2)} HP/s)${!open.lost ? ' — the wolf landed nothing while open (inconclusive)' : ''}`, [sh]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (o) parry: tap guard just before the strike lands
    if (ONLY.includes('o')) {
        await goto('road', 'from_grounds'); await buff();
        const wolf = await encOf('road', 'road_wolf');
        let s = await S();
        if (!isAction(s)) rec('o', 'Parry: guard tapped just before a strike staggers the attacker and blocks the damage', 'NOT YET', 'no action mode', []);
        else {
            await travel(wolf.x, wolf.y + 2, 0.6, 10000, async (t) => t.engaged);
            let tries = 0, parried = 0, log = [];
            for (let i = 0; i < 6 && parried === 0; i++) {
                const t = await S(); const tgt = living(t)[0]; if (tgt) await aimAt(t, tgt);
                // wait in the page for a wind-up with < 120 ms left (Playwright polling is too coarse for a 200 ms window), then press RMB
                const sid = await page.evaluate(() => new Promise((res) => { const t0 = performance.now(); const f = () => { const sm = ensoDebug.sim(); const a = sm.actors.find((x) => !x.dead && x.state === 'windup' && x.windup); if (a && a.windup.end - sm.now < 120) return res(a.sid); if (performance.now() - t0 > 5000) return res(null); requestAnimationFrame(f); }; f(); }));
                if (!sid) { log.push('no wind-up'); continue; }
                tries++;
                const hp0 = (await S()).hp;
                await page.mouse.down({ button: 'right' }); await sleep(250);
                const st = await page.evaluate((sid) => { const a = ensoDebug.sim().actors.find((x) => x.sid === sid); return a ? a.state : null; }, sid);
                await page.mouse.up({ button: 'right' });
                const hp1 = (await S()).hp;
                log.push(`${st}/-${hp0 - hp1}`);
                if (st === 'stagger' && hp1 === hp0) parried++;
            }
            const sh = await shot('o_parry');
            rec('o', 'Parry: guard tapped just before a strike staggers the attacker and blocks the damage', parried ? 'PASS' : tries ? 'FAIL' : 'NOT YET',
                `${tries} timed attempts (RMB pressed with < 120 ms of wind-up left), ${parried} parried; attacker state / HP lost per attempt: ${log.join(', ')}`, [sh]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (p) collision: walls and trees stop the body
    if (ONLY.includes('p')) {
        await goto('grounds', 'from_house');
        let s = await S();
        const runs = [];
        let inSolid = 0, samples = 0;
        for (const k of ['a', 'w', 'd', 's']) {
            const sm = await hold([k], 2500);
            const solid = await page.evaluate((pts) => pts.map((p) => ensoWorld.solidForAction ? ensoWorld.solidForAction(Math.floor(p.x + 0.5), Math.floor(p.y + 0.5)) : ensoWorld.isBlocked(Math.floor(p.x + 0.5), Math.floor(p.y + 0.5))), sm.filter(Boolean));
            inSolid += solid.filter(Boolean).length; samples += solid.length;
            const last = sm.slice(-8); const still = dist(last[0], last[last.length - 1]) < 0.05;
            runs.push(`${k}: ${fmt(sm[0])} -> ${fmt(sm[sm.length - 1])}${still ? ' (stopped)' : ''}`);
        }
        const sh = await shot('p_collision');
        const stopped = runs.filter((r) => /stopped/.test(r)).length;
        rec('p', 'Collision: holding each direction for 2.5 s ends against a wall/tree, never inside a solid tile', inSolid === 0 && stopped >= 2 ? 'PASS' : isAction(s) ? 'FAIL' : 'NOT YET',
            `${inSolid}/${samples} position samples inside a solid tile; ${runs.join(' · ')}`, [sh]);
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (k) ranged acolytes (a gate encounter in the orchard wall)
    if (ONLY.includes('k')) {
        let s = await S();
        if (!isAction(s)) rec('k', 'Orchard acolytes: detect a player 3 tiles away in plain view, then fight at range (projectiles, damage from > 2 tiles)', 'NOT YET', 'no action mode', []);
        else {
            const trials = [], shots = [];
            for (let i = 0; i < 3; i++) {
                if (i) await resetIfOverlay();
                await goto('orchard', 'from_village'); await buff();
                const enc = await encOf('orchard', 'orchard_cultists');
                await page.evaluate(([x, y]) => window.__qaHooks().place(x, y), [enc.x, enc.y + 3]);   // on the path, 3 tiles south of the gateway, clear line of sight
                let engagedAt = null; const t0 = Date.now();
                while (Date.now() - t0 < 4000) { await sleep(100); if ((await S()).engaged) { engagedAt = Date.now() - t0; break; } }
                await hold(['s'], 600);   // back off to range
                const hp0 = (await S()).hp; let proj = 0, farHits = 0, prev = hp0; const t1 = Date.now();
                while (Date.now() - t1 < 6000) {
                    await sleep(100); const t = await S(); proj = Math.max(proj, t.projectiles || 0);
                    const d = living(t).length ? Math.min(...living(t).map((x) => dist(t.player, x))) : 99;
                    if (t.hp < prev && d > 2) farHits++; prev = t.hp;
                }
                const t = await S();
                const where = (t.enemies || []).map((x) => `(${x.x.toFixed(1)},${x.y.toFixed(1)} ${x.state})`).join(' ');
                trials.push({ engagedAt, proj, farHits, lost: hp0 - t.hp, where });
                shots.push(await shot(`k_acolytes_trial${i + 1}`));
            }
            const ok = trials.every((t) => t.engagedAt != null) && trials.some((t) => t.proj > 0 && t.farHits > 0);
            rec('k', 'Orchard acolytes: detect a player 3 tiles away in plain view, then fight at range (projectiles, damage from > 2 tiles)', ok ? 'PASS' : 'FAIL',
                trials.map((t, i) => `trial ${i + 1}: engaged ${t.engagedAt != null ? `after ${t.engagedAt} ms` : 'NO (4 s)'}, projectiles ${t.proj}, ranged hits ${t.farHits}, HP lost ${t.lost}, acolytes ${t.where}`).join(' · '), shots);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (m) save refused mid-fight
    if (ONLY.includes('m')) {
        await nearRats(2); await buff();
        let s = await S();
        const t0 = Date.now(); while (Date.now() - t0 < 4000 && !s.engaged) { await sleep(200); s = await S(); }
        if (!isAction(s)) rec('m', 'Saving is refused while a group is engaged', 'NOT YET', 'no action mode', []);
        else {
            const before = await page.evaluate(() => localStorage.getItem('enso.world.save.v1'));
            await page.keyboard.press('Escape'); await sleep(300);
            const tab = page.locator('#pause .mm-tabs li', { hasText: 'Save game' });
            let note = '', opened = (await S()).pause;
            if (await tab.count()) { await tab.first().click(); await sleep(300); note = (await page.locator('#pause').innerText()).replace(/\s+/g, ' '); }
            const after = await page.evaluate(() => localStorage.getItem('enso.world.save.v1'));
            const sh = await shot('m_save_in_fight');
            await page.keyboard.press('Escape'); await sleep(300);
            const refused = before === after && /fight|combat/i.test(note) && !/Saved\./.test(note);
            rec('m', 'Saving is refused while a group is engaged', s.engaged && refused ? 'PASS' : 'FAIL', `engaged ${s.engaged}; menu opened ${opened}; save slot changed ${before !== after}; menu note: "${(note.match(/[^.]*(fight|combat|Saved)[^.]*\./i) || [''])[0].trim().slice(0, 100)}"`, [sh]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (n) map exit while engaged
    if (ONLY.includes('n')) {
        const e = await nearRats(2); await buff();
        let s = await S();
        const t0 = Date.now(); while (Date.now() - t0 < 4000 && !s.engaged) { await sleep(200); s = await S(); }
        if (!isAction(s)) rec('n', 'Leaving the map mid-fight leaves no broken state', 'NOT YET', 'no action mode', []);
        else {
            const eng0 = s.engaged;
            const door = await page.evaluate(() => ensoDebug.world.maps.grounds.exits.find((x) => x.id === 'grounds_shed_door'));
            await page.keyboard.down('Shift'); await travel(door.x, door.y, 0.4, 12000, async (t) => t.player && t.player.map !== 'grounds'); await page.keyboard.up('Shift');
            await hold(['w'], 300); await sleep(1200); await closeDialogs();
            s = await S();
            const left = s.player.map !== 'grounds';
            const sh1 = await shot('n_after_exit');
            let back = null;
            if (left) {   // walk back out: the rats must be fightable (not stuck engaged, not gone)
                const ex = await page.evaluate(() => ensoWorld.map.exits[0]);
                await travel(ex.x, ex.y, 0.4, 8000, async (t) => t.player && t.player.map === 'grounds'); await hold(['s'], 300); await sleep(1200); await closeDialogs();
                const t = await S(); back = { map: t.player.map, rats: (t.enemies || []).filter((x) => x.encounterId === e.id).length, mode: t.mode, engaged: t.engaged };
            }
            const sh2 = await shot('n_back');
            const consistent = left ? (s.mode !== 'combat' && !s.engaged && back && back.rats === 2 && back.mode !== 'combat') : (s.engaged || s.mode === 'combat');
            rec('n', 'Leaving the map mid-fight leaves no broken state (fight ends cleanly, rats reset and are still there)', consistent ? 'PASS' : 'FAIL',
                `engaged before ${eng0}; went through the shed door ${left} (now ${s.player.map}, engine ${s.mode}, sim engaged ${s.engaged}); back outside: ${back ? JSON.stringify(back) : 'n/a'}${left ? '' : ' (exit refused while engaged: acceptable if intended)'}`, [sh1, sh2]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (l) death and respawn
    if (ONLY.includes('l')) {
        await goto('road', 'from_grounds');
        const wolf = await encOf('road', 'road_wolf');
        let s = await S();
        if (!isAction(s)) rec('l', 'Death in the world respawns the player (half HP, enemies reset), no game over', 'NOT YET', 'no action mode', []);
        else {
            await page.evaluate(() => { enso.player.hp = 1; });
            await travel(wolf.x, wolf.y + 1, 0.6, 10000, async (t) => t.hp <= 0 || t.dbg.mode === 'game_over' || t.dialog);
            const t0 = Date.now(); while (Date.now() - t0 < 10000) { s = await S(); if (s.dialog || s.dbg.mode === 'game_over' || s.dbg.screen === 'over') break; await sleep(200); }
            const sh1 = await shot('l_death');
            const text = await page.evaluate(() => document.getElementById('dialog').innerText);
            await closeDialogs(); await sleep(500); s = await S();
            const wolfBack = (s.enemies || []).some((x) => x.encounterId === 'road_wolf');
            const sh2 = await shot('l_respawn');
            const ok = s.mode !== 'game_over' && s.dbg.screen === 'explore' && s.hp >= Math.floor(s.maxHp * 0.5) - 1 && s.hp > 1 && !s.engaged && wolfBack;
            rec('l', 'Death in the world respawns the player (half HP, enemies reset), no game over', ok ? 'PASS' : 'FAIL',
                `engine ${s.mode}, screen ${s.dbg.screen}; HP ${s.hp}/${s.maxHp}; engaged ${s.engaged}; wolf back ${wolfBack}; at ${fmt(s.player)}; message "${text.replace(/\s+/g, ' ').slice(0, 80)}"`, [sh1, sh2]);
        }
    }

    await resetIfOverlay();
    // ---------------------------------------------------------------- (f) no console errors (last: covers the whole run)
    if (ONLY.includes('f')) rec('f', 'No console / page errors during the run', errors.length ? 'FAIL' : 'PASS', errors.length ? errors.slice(0, 4).join(' | ') : 'none', []);

    await browser.close();
    results.sort((a, b) => a.id.localeCompare(b.id));
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ when: new Date().toISOString(), url, cls: CLS, hooks: s0.hooks, combatMode: s0.combatMode, bootShot, results, errors }, null, 2));
    console.log(`Combat v3 action checks — headless Chromium, class ${CLS}, ${url.replace(ROOT, '.')}`);
    console.log(hookLine + '\n');
    console.log('| id | status  | check | evidence |');
    console.log('|----|---------|-------|----------|');
    for (const r of results) console.log(`| ${r.id}  | ${r.status.padEnd(7)} | ${r.what} | ${r.reason.replace(/\|/g, '/')}${r.shots.filter(Boolean).length ? ` [${r.shots.filter(Boolean).join(', ')}]` : ''} |`);
    const n = (st) => results.filter((r) => r.status === st).length;
    console.log(`\n${n('PASS')} pass · ${n('FAIL')} fail · ${n('NOT YET')} not yet${STRICT ? ' (strict)' : ''}`);
    process.exit(n('FAIL') || (STRICT && n('NOT YET')) ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
