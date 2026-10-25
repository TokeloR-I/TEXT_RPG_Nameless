// Local Playwright regression check. Serve the repo over HTTP; no game runtime dependency.
// ENSO_BASE_URL=http://127.0.0.1:8876/enso-movement-hud node qa/scripts/movement-hud-browser.js [output] [--baseline]
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs'), path = require('path');
const base = process.env.ENSO_BASE_URL || 'http://127.0.0.1:8876/enso-movement-hud';
const baseline = process.argv.includes('--baseline');
const output = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'qa/results/movement-hud');
fs.mkdirSync(output, { recursive: true });
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const results = [];
    try {
        for (const [device, width, height] of [['desktop',1280,900], ['phone',390,844]]) {
            const page = await browser.newPage({ viewport: { width, height } });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(`${base}/world.html?seed=170`);
            await page.waitForFunction(() => window.ensoDebug);
            await page.evaluate(() => {
                ensoDebug.start('warrior');
                window.walkSamples = [];
                const draw = ENSO.sprites.drawCharacter;
                ENSO.sprites.drawCharacter = function (g, x, y, options, time) {
                    if (options.className === 'warrior' && walkSamples.length < 500) {
                        const step = ENSO.sprites.animationStep(ENSO.sprites.characterFor(options.className), options.anim, time);
                        walkSamples.push({ anim: options.anim, pose: step.pose, facing: options.facing });
                    }
                    return draw.apply(this, arguments);
                };
            });
            await page.waitForTimeout(200);
            const canvas = await page.locator('#world-canvas').boundingBox();
            await page.mouse.move(canvas.x + 4, canvas.y + canvas.height * .5);
            const facings = [];
            for (const [key, expected] of [['d','right'],['w','up'],['a','left'],['s','down']]) {
                await page.keyboard.down(key);
                await page.waitForTimeout(260);
                const during = await page.evaluate(() => ensoDebug.sim().view().player);
                await page.keyboard.up(key);
                await page.waitForTimeout(100);
                const after = await page.evaluate(() => ensoDebug.sim().view().player);
                facings.push({key, expected, moving: during.moving, during: during.facing, stopped: after.facing});
                if (!baseline) { assert.equal(during.facing, expected, `${device}: ${key} facing`); assert.equal(after.facing, expected, `${device}: retain facing when released`); }
            }
            const facingBeforeMouse = await page.evaluate(() => ensoDebug.sim().view().player.facing);
            await page.mouse.move(canvas.x + canvas.width - 4, canvas.y + 4);
            await page.waitForTimeout(150);
            const facingAfterMouse = await page.evaluate(() => ensoDebug.sim().view().player.facing);
            const animations = await page.evaluate(() => ({
                walkFrames: walkSamples.filter(s => s.anim === 'walk').length,
                walkPoses: [...new Set(walkSamples.filter(s => s.anim === 'walk').map(s => s.pose))],
                idleFrames: walkSamples.filter(s => s.anim === 'idle').length
            }));
            const layout = await page.evaluate(() => {
                const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const b = e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; };
                const portrait = document.querySelector('.ahud canvas');
                const pixels = portrait && portrait.getContext('2d').getImageData(0, 0, portrait.width, portrait.height).data;
                const opaque = pixels ? Array.from(pixels).filter((n, i) => i % 4 === 3 && n > 0).length : 0;
                return {stage:rect('#world-stage'),vitals:rect('.ahud-vitals'),portrait:portrait ? {w:portrait.width,h:portrait.height,visible:portrait.getBoundingClientRect().width>0,opaque} : null};
            });
            if (!baseline) {
                assert.equal(facingAfterMouse, facingBeforeMouse, `${device}: passive mouse must not turn player`);
                assert.ok(animations.walkFrames > 0 && animations.walkPoses.length >= 2, `${device}: animated walk poses`);
                assert.ok(animations.idleFrames > 0, `${device}: standing idle pose`);
                assert.ok(layout.vitals.y < layout.stage.y + layout.stage.h * .15, `${device}: vitals at top`);
                assert.ok(layout.vitals.x < layout.stage.x + layout.stage.w * .1, `${device}: vitals at left`);
                assert.ok(layout.portrait?.visible && layout.portrait.opaque > 0, `${device}: rendered player portrait pixels`);
                assert.ok(layout.vitals.w < layout.stage.w * .65 && layout.vitals.h < layout.stage.h * .3, `${device}: compact vitals`);
                assert.deepStrictEqual(errors, []);
            }
            await page.screenshot({path:path.join(output, `${baseline?'before':'after'}-${device}.png`)});
            // Keyboard attacks must not snap back to the passive cursor; a deliberate click may aim.
            await page.keyboard.press('1');
            await page.waitForFunction(() => ensoDebug.sim().view().player.state === 'attack');
            const keyboardAttack = await page.evaluate(() => ensoDebug.sim().view().player.facing);
            if (!baseline) assert.equal(keyboardAttack, facingBeforeMouse, `${device}: keyboard attack faces forward`);
            await page.waitForFunction(() => ensoDebug.sim().view().player.state === 'idle');
            await page.waitForTimeout(700);
            await page.mouse.click(canvas.x + canvas.width * .8, canvas.y + canvas.height * .5);
            await page.waitForFunction(() => ensoDebug.sim().view().player.state === 'attack');
            const pointerAttack = await page.evaluate(() => ensoDebug.sim().view().player.facing);
            if (!baseline) assert.equal(pointerAttack, 'right', `${device}: deliberate mouse click aims attack`);

            // Isolated combat-layout fixture: real boss title, long player name and quest together.
            const combatLayout = !baseline ? await page.evaluate(() => {
                document.querySelector('.ahud').style.display = 'none';
                const hud = ENSO.actionHud.create(document.getElementById('world-stage'), { className: 'qa-layout' });
                const model = ENSO.actionHud.viewModel(enso, ensoDebug.sim().view());
                model.inCombat = true;
                model.player.name = 'The Wandering Adventurer';
                model.boss = { name: 'The Crow-Touched Warden', hp: 150, maxHp: 150, phase: 2, phases: 3 };
                model.quest = { title: "The Keeper's Warning", text: 'Speak with the Warden at the sanctuary on the far side of the orchard.', kind: 'main' };
                hud.update(model, 0);
                const rect = selector => { const r = hud.el.querySelector(selector).getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; };
                return { vitals:rect('.ahud-vitals'), boss:rect('.ahud-boss'), quest:rect('.ahud-quest') };
            }) : null;
            if (combatLayout) {
                const overlap = (a,b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
                for (const [a,b] of [['vitals','boss'],['vitals','quest'],['boss','quest']])
                    assert.ok(!overlap(combatLayout[a],combatLayout[b]), `${device}: ${a}/${b} must not overlap`);
                await page.screenshot({path:path.join(output, `after-${device}-boss-layout.png`)});
            }
            results.push({device,keyboardAttack,pointerAttack,facings,facingBeforeMouse,facingAfterMouse,animations,layout,combatLayout,errors});
            await page.close();
        }
        fs.writeFileSync(path.join(output, `${baseline?'before':'after'}-results.json`), JSON.stringify(results,null,2)+'\n');
        console.log(JSON.stringify(results,null,2));
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
