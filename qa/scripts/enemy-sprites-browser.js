// Optional Playwright regression; no game dependencies. Run against a local HTTP server.
// ENSO_BASE_URL=http://127.0.0.1:8877/enso-enemy-sprites node qa/scripts/enemy-sprites-browser.js [output]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.ENSO_BASE_URL || 'http://127.0.0.1:8877/enso-enemy-sprites';
const out = path.resolve(process.argv[2] || '/workspace/artifacts/enemy-sprites');
fs.mkdirSync(out, { recursive: true });
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const errors = [];
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base + '/world.html?seed=170');
        await page.waitForFunction(() => window.ensoDebug && ENSO.enemySprites);
        await page.evaluate(() => {
            window.enemyCalls = [];
            const art = ENSO.enemySprites, draw = art.draw;
            art.draw = (g, key, pose = {}) => {
                if (enemyCalls.length < 20000) enemyCalls.push({ key, ...art.frameFor(key, pose), progress: pose.attack?.progress });
                return draw(g, key, pose);
            };
            ensoDebug.start('warrior', 'Enemy Art QA');
            enso.player.hp = enso.player.maxHp = 10000;
            ensoDebug.goto('grounds', Object.keys(ensoDebug.world.maps.grounds.spawns)[0]);
            const sim = ensoDebug.sim(), actor = sim.actors[0];
            for (const [dx, dy] of [[24, 0], [-24, 0], [0, 24], [0, -24]]) {
                if (!sim.solidPx(actor.x + dx, actor.y + dy)) {
                    sim.player.x = actor.x + dx; sim.player.y = actor.y + dy; break;
                }
            }
        });
        await page.waitForFunction(() => ['windup', 'attack', 'recover'].every(state => enemyCalls.some(c => c.state === state)), { timeout: 20000 });
        const live = await page.evaluate(() => ({ states: [...new Set(enemyCalls.map(c => c.state))], directions: [...new Set(enemyCalls.map(c => c.facing))], progress: enemyCalls.filter(c => c.progress != null).map(c => c.progress), mode: enso.mode, screen: ensoDebug.state().screen }));
        assert.equal(live.mode, 'combat'); assert.equal(live.screen, 'explore');
        assert.ok(live.progress.every(p => p >= 0 && p <= 1));
        await page.screenshot({ path: path.join(out, 'in-game-combat.png') });
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            const c = document.createElement('canvas'); c.id = 'enemy-review'; c.width = 1360; c.height = ENSO.enemySprites.keys.length * 144 + 80;
            c.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#27252f'; document.body.append(c);
            const g = c.getContext('2d'); g.fillStyle = '#27252f'; g.fillRect(0, 0, c.width, c.height);
            g.fillStyle = '#eee7d6'; g.font = '18px monospace'; g.fillText('ENSO / ORIGINAL 64 × 64 ENEMIES / 8 DIRECTIONS', 16, 28);
            const art = ENSO.enemySprites;
            art.facings.forEach((f, i) => g.fillText(f, 250 + i * 140, 62));
            art.keys.forEach((key, row) => {
                g.fillStyle = '#c9c0b2'; g.font = '13px monospace'; g.fillText(key, 10, 145 + row * 144);
                art.facings.forEach((facing, i) => {
                    g.save(); g.translate(205 + i * 140, 76 + row * 144); g.scale(2, 2);
                    art.draw(g, key, { facing, state: 'idle', now: 0 }); g.restore();
                });
            });
        });
        await page.locator('#enemy-review').screenshot({ path: path.join(out, 'eight-directions.png') });
        await page.evaluate(() => document.querySelector('#enemy-review').remove());
        // Battle-card path also uses the new native-size art, including unknown-key fallback.
        const cards = await page.evaluate(() => {
            const results = [];
            for (const key of [...ENSO.enemySprites.keys, 'unknown-future-enemy']) {
                const c = document.createElement('canvas'); c.width = c.height = 64;
                ENSO.battleHD.drawFoe(c, key, 0);
                const pixels = c.getContext('2d').getImageData(0, 0, 64, 64).data;
                results.push({ key, opaque: pixels.filter((v, i) => i % 4 === 3 && v > 0).length });
            }
            return results;
        });
        assert.ok(cards.every(c => c.opaque > 0));
        // Exercise the self-contained build at phone size as well as the source page.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + '/dist/EnsosLastStand-World.html?seed=170');
        await page.waitForFunction(() => window.ensoDebug && ENSO.enemySprites);
        const mobile = await page.evaluate(() => {
            ensoDebug.start('warrior', 'Sprite QA');
            ensoDebug.goto('road', Object.keys(ensoDebug.world.maps.road.spawns)[0]);
            const sim = ensoDebug.sim(), a = sim.actors[0];
            sim.player.x = a.x + 24; sim.player.y = a.y;
            enso.player.hp = enso.player.maxHp = 10000;
            return { enemyCount: ENSO.enemySprites.keys.length, frame: ENSO.enemySprites.frame };
        });
        await page.waitForTimeout(600);
        assert.equal(mobile.enemyCount, 13); assert.deepEqual(mobile.frame, { w: 64, h: 64 });
        await page.screenshot({ path: path.join(out, 'phone-built-game.png') });
        assert.deepEqual(errors, []);
        const result = { live: { ...live, progress: { min: Math.min(...live.progress), max: Math.max(...live.progress) } }, cards, mobile, errors };
        fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
        console.log(JSON.stringify(result, null, 2));
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
