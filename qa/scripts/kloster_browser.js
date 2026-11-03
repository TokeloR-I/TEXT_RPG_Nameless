// The Kloster (rebuilt after Tokelo's reference, 2026-11-03) in a real browser: enter from each spawn, walk a loop with real keys, no page errors,
// never inside a solid tile; a screenshot per spawn. Tally, QA.   node qa/scripts/kloster_browser.js
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'results', 'kloster');
let pw; try { pw = require(process.env.PLAYWRIGHT || 'playwright'); } catch (e) { console.log('SKIP: Playwright not found'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
    const browser = await pw.chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file://' + path.join(ROOT, 'world.html') + '?combat=action');
    await sleep(500);
    await page.evaluate(() => ensoDebug.start('warrior'));
    await sleep(600);
    for (let n = 0; n < 8; n++) { await page.keyboard.press('Escape'); await sleep(100); }
    const spawns = await page.evaluate(() => Object.keys(ensoDebug.world.maps.briarwell_cloister_court.spawns));
    let fails = 0, samples = 0, inside = 0;
    const probe = () => page.evaluate(() => {
        const sim = ensoDebug.sim(), s = window.ensoWorld, T = 16;
        const x = Math.floor(sim.player.x / T), y = Math.floor(sim.player.y / T);
        return { map: s.mapId, x: sim.player.x / T, y: sim.player.y / T, solid: s.solidForAction(x, y) };
    });
    for (const sp of spawns) {
        await page.evaluate((id) => ensoDebug.goto('briarwell_cloister_court', id), sp);
        await sleep(400);
        const start = await probe();
        let moved = 0;
        for (const k of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
            await page.keyboard.down(k);
            for (let i = 0; i < 12; i++) { await sleep(50); const p = await probe(); samples++; if (p.map === 'briarwell_cloister_court' && p.solid) inside++; }
            await page.keyboard.up(k);
            const p = await probe(); if (p.map !== 'briarwell_cloister_court') { await page.evaluate((id) => ensoDebug.goto('briarwell_cloister_court', id), sp); await sleep(300); }
            moved += Math.hypot(p.x - start.x, p.y - start.y) > 0.5 ? 1 : 0;
        }
        await page.screenshot({ path: path.join(OUT, `kloster_${sp}.png`) });
        const ok = moved > 0;
        if (!ok) fails++;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${sp}: start (${start.x.toFixed(1)},${start.y.toFixed(1)}) solid=${start.solid}; moved in ${moved}/4 directions`);
    }
    console.log(`${inside ? 'FAIL' : 'PASS'}  collision: ${inside}/${samples} samples inside a solid tile`);
    console.log(`${errors.length ? 'FAIL' : 'PASS'}  page errors: ${errors.length ? errors.slice(0, 5).join(' | ') : 'none'}`);
    await browser.close();
    process.exit(fails || inside || errors.length ? 1 : 0);
})();
