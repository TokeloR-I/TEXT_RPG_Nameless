// The world map (menu Map tab, 2026-11-25) in a real browser: M opens it on the region you are in, places and the
// map agree, Black Flight from the map moves you, Shift+M still mutes, no page errors; screenshots desktop + phone.
// Tally, QA.   node qa/scripts/world_map_browser.js
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'results', 'world-map');
let pw; try { pw = require(process.env.PLAYWRIGHT || 'playwright'); } catch (e) { console.log('SKIP: Playwright not found'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(browser, label, opts) {
    const page = await browser.newPage(opts);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file://' + path.join(ROOT, 'world.html') + '?combat=action');
    await sleep(500);
    await page.evaluate(() => ensoDebug.start('warrior'));
    await sleep(600);
    for (let n = 0; n < 8; n++) { await page.keyboard.press('Escape'); await sleep(100); }
    await page.evaluate(() => {
        const g = window.ensoWorld.engine;
        const st = g.story;
        st.flags.push('aspect_nahemoth', 'anchor:homestead', 'anchor:shamefield', 'anchor:kloster', 'anchor:featherwatch', 'anchor:skeldvik', 'anchor:jarnmyr');
        for (const m of ['house', 'grounds', 'road', 'tollway', 'shamefield', 'briarwell_cloister_court', 'orchard', 'featherwatch', 'village_residential_lane',
            'frostspine_pass', 'skeldvik', 'hrafnholm', 'jarnmyr']) st.seen.push(`enter:${m}`);
    });
    await page.evaluate(() => { ensoDebug.goto('shamefield', 'flight_well'); window.ensoWorld.engine.act({ type: 'world_enter', mapId: 'shamefield' }); });
    await sleep(400);
    const results = [];
    await page.keyboard.press('KeyM'); await sleep(300);
    const open = await page.evaluate(() => ({ tab: document.querySelector('.mm-tabs li.active, .mm-tabs li.selected')?.dataset.id, svg: !!document.querySelector('.wm-svg'),
        here: document.querySelector('.wm-area.here')?.dataset.area, rows: [...document.querySelectorAll('.cx-map .cx-rows li')].map((li) => li.textContent.trim().split('\n')[0]) }));
    results.push([open.tab === 'map' && open.svg && open.here === 'shamefield', `M opens the map on Shamefield (${JSON.stringify(open)})`]);
    await page.screenshot({ path: path.join(OUT, `${label}_vale.png`) });
    // Hrimvald via its row
    await page.evaluate(() => { const li = [...document.querySelectorAll('.cx-map .cx-rows li')].find((x) => /Hrimvald/.test(x.textContent)); li && li.click(); });
    await sleep(200);
    await page.evaluate(() => { const li = [...document.querySelectorAll('.cx-map .cx-rows li')].find((x) => /Hrimvald/.test(x.textContent)); li && li.click(); });
    await sleep(300);
    const h = await page.evaluate(() => document.querySelector('.wm-svg')?.getAttribute('aria-label'));
    results.push([/Hrimvald/.test(h || ''), `Hrimvald region shows (${h})`]);
    await page.screenshot({ path: path.join(OUT, `${label}_hrimvald.png`) });
    // fly to Járnmyr: click its area twice (select, then act), then confirm
    // A tap on an area picks it; a tap on the picked area asks to fly there.
    for (let i = 0; i < 2 && !(await page.evaluate(() => /Fly to/.test(document.querySelector('.cx-map')?.textContent || ''))); i++) {
        await page.evaluate(() => document.querySelector('.wm-area[data-area="jarnmyr"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
        await sleep(200);
    }
    await page.screenshot({ path: path.join(OUT, `${label}_confirm.png`) });
    await page.keyboard.press('Enter');
    await sleep(2500);
    const map = await page.evaluate(() => window.ensoWorld.mapId);
    results.push([map === 'jarnmyr', `Black Flight from the map lands in Járnmyr (${map})`]);
    await page.screenshot({ path: path.join(OUT, `${label}_arrived.png`) });
    await page.keyboard.down('Shift'); await page.keyboard.press('KeyM'); await page.keyboard.up('Shift'); await sleep(200);
    const pause = await page.evaluate(() => !document.getElementById('pause') || document.getElementById('pause').hidden);
    results.push([pause, 'Shift+M does not open the map']);
    results.push([!errors.length, `page errors: ${errors.slice(0, 5).join(' | ') || 'none'}`]);
    for (const [ok, t] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  [${label}] ${t}`);
    await page.close();
    return results.filter((r) => !r[0]).length;
}
(async () => {
    const browser = await pw.chromium.launch();
    let fails = await run(browser, 'desktop', { viewport: { width: 1280, height: 800 } });
    fails += await run(browser, 'phone', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    await browser.close();
    process.exit(fails ? 1 : 0);
})();
