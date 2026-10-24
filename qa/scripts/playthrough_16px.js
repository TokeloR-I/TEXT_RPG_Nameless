// Key-driven Chapter One playthrough of world.html (16 px world as shipped). Every move and talk is a real key press.
const { chromium } = require('playwright');
const R = process.env.ROOT || require('path').join(__dirname, '..', '..');
const OUT = require('path').join(__dirname, '..', 'results', '2026-10-24_playthrough') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const BYPASS = process.env.BYPASS === '1';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + R + '/world.html'); await sleep(800);
  await p.evaluate(() => ensoDebug.start('warrior', 'Tally')); await sleep(200);
  const S = () => p.evaluate(() => ({ ...ensoDebug.state(), pos: ensoWorld.getState(), dialog: !document.getElementById('dialog').hidden, text: document.getElementById('dialog').innerText, prompt: document.getElementById('prompt').hidden ? '' : document.getElementById('prompt').innerText, hud: document.getElementById('hud').innerText }));
  const clear = async () => { for (let i = 0; i < 20; i++) { const s = await S(); if (s.screen === 'explore' && !s.modal) return; await p.keyboard.press(s.modal === 'dialog' ? 'Enter' : 'Escape'); await sleep(150); } };
  await clear();
  const log = (...a) => console.log(...a);
  const step = async (d) => { const b4 = (await S()).pos; await p.keyboard.down(KEY[d]); const t0 = Date.now(); while (Date.now() - t0 < 300) { const q = (await S()).pos; if (q.x !== b4.x || q.y !== b4.y || q.map !== b4.map) break; await sleep(10); } await p.keyboard.up(KEY[d]); await sleep(130); return S(); };
  const route = (gx, gy, avoidObjBlock) => p.evaluate(([gx, gy]) => { const s = ensoWorld, D = ENSO.worldModel.DIRS, key = (x, y) => x + ',' + y;
      const exits = new Set((s.map.exits || []).map((e) => key(e.x, e.y))); const prev = new Map([[key(s.x, s.y), null]]); const q = [[s.x, s.y]];
      while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) break; for (const [d, [dx, dy]] of Object.entries(D)) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k)) continue; const goal = nx === gx && ny === gy;
        if (s.isBlocked(nx, ny) && !(goal && s.objectAt(nx, ny))) continue; if (!goal && exits.has(k)) continue; prev.set(k, [key(x, y), d]); q.push([nx, ny]); } }
      if (!prev.has(key(gx, gy))) return null; const dirs = []; let k = key(gx, gy); while (prev.get(k)) { const [pk, d] = prev.get(k); dirs.unshift(d); k = pk; } return dirs; }, [gx, gy]);
  const walk = async (gx, gy) => { const r = await route(gx, gy); if (!r) throw new Error(`no route to ${gx},${gy}`); for (const d of r) { const s = await step(d); if (s.screen === 'combat') return s; if (s.modal) await clear(); } return S(); };
  const obj = (id) => p.evaluate((id) => { const m = ensoWorld.map; return [...(m.interactables || []), ...(m.encounters || [])].find((o) => o.id === id); }, id);
  const exitOf = (id) => p.evaluate((id) => ensoWorld.map.exits.find((e) => e.id === id), id);
  const face = async (x, y) => { for (const [d, dx, dy] of [['up', 0, 1], ['down', 0, -1], ['right', -1, 0], ['left', 1, 0]]) { const r = await route(x + dx, y + dy); if (!r) continue; await walk(x + dx, y + dy); await step(d); return true; } throw new Error('cannot face ' + x + ',' + y); };
  const talk = async (id, picks = []) => { const o = await obj(id); await face(o.x, o.y); const pr = (await S()).prompt; await p.keyboard.press('e'); await sleep(300);
      let s = await S(); const said = [s.text.split('\n').slice(0, 3).join(' | ')];
      for (const re of picks) { const items = await p.evaluate(() => [...document.querySelectorAll('#dialog .talk-choices li, #dialog [data-i]')].map((e) => e.innerText.trim())); const i = items.findIndex((t) => re.test(t)); if (i < 0) { log('   no choice', re, items); break; } for (let k = 0; k < i; k++) { await p.keyboard.press('ArrowDown'); await sleep(80); } await p.keyboard.press('Enter'); await sleep(250); said.push((await S()).text.split('\n').slice(0, 3).join(' | ')); }
      if ((await S()).modal === 'talk') { await p.keyboard.press('Escape'); await sleep(250); } await clear(); log(`TALK ${id} [prompt: ${pr}]`, said.join(' // ').slice(0, 300)); };
  const inspect = async (id) => { const o = await obj(id); await face(o.x, o.y); await p.keyboard.press('e'); await sleep(300); const t = (await S()).text; await clear(); log(`INSPECT ${id}:`, t.replace(/\n/g, ' ').slice(0, 160)); };
  const fightOrSkip = async (id) => { const o = await obj(id); if (BYPASS) { log('BYPASS', id); return; } await face(o.x, o.y); await sleep(200); if (!(await p.evaluate(() => enso.mode === 'combat'))) { const d = (await S()).pos.facing; await p.keyboard.press(KEY[d]); } for (let i = 0; i < 30 && !(await p.evaluate(() => enso.mode === 'combat')); i++) await sleep(100); log('  in combat:', await p.evaluate(() => enso.mode));
      for (let i = 0; i < 200; i++) { const s = await S(); if (s.screen === 'explore' && !s.modal && s.mode !== 'combat') break; await p.evaluate(() => { if (enso.combat) { for (const e of enso.combat.enemies) if (e.hp > 1) e.hp = 1; enso.player.hp = enso.player.maxHp; } }); await p.keyboard.press('Enter'); await sleep(120); }
      log('FIGHT', id, 'defeated:', await p.evaluate((id) => enso.isDefeated(id), id)); };
  const exit = async (id) => { const e = await exitOf(id); await walk(e.x, e.y); await sleep(700); await clear(); const s = await S(); log('EXIT', id, '->', s.pos.map); };
  const quest = () => p.evaluate(() => Object.fromEntries(['Q01','Q02','Q03','Q04','Q05','Q06','B01'].map((q) => [q, enso.questState(q)])));
  try {
    await inspect('cellar_inscription'); await exit('cellar_up' ).catch(async () => { const ex = await p.evaluate(() => ensoWorld.map.exits.map((e) => e.id)); log('cellar exits', ex); throw new Error('x'); });
  } catch (e) { log('ERR', e.message); }
  const goTo = async (map) => { for (let i = 0; i < 6; i++) { const s = await S(); if (s.pos.map === map) return; const ex = await p.evaluate((m) => { const all = ensoWorld.map.exits; const e = all.find((e) => e.toMap === m) ; return e ? e.id : null; }, map); if (!ex) throw new Error('no exit to ' + map + ' from ' + s.pos.map); await exit(ex); } };
  const steps = [
    () => goTo('house'), () => goTo('grounds'), () => inspect('grounds_foundation'), () => goTo('road'), () => goTo('tollway'),
    () => talk('tollway_elian', [/going on to the village/]), () => fightOrSkip('tollway_ragpickers'), () => fightOrSkip('tollway_root_chewers'),
    () => goTo('shamefield'), () => talk('village_tamsin'), () => talk('village_mara'), async () => log('quests', JSON.stringify(await quest())),
    async () => { await p.screenshot({ path: OUT + 'play_village.png' }); },
    () => talk('village_captain'), () => goTo('tollway'), () => inspect('tollway_register'), () => goTo('shamefield'),
    () => talk('village_captain', [/Here it is/]), async () => log('quests', JSON.stringify(await quest()), 'hud:', (await S()).hud.replace(/\n/g, ' ')),
    () => goTo('orchard'), () => fightOrSkip('orchard_cultists'), () => goTo('featherwatch'), () => fightOrSkip('featherwatch_ghoul'), () => goTo('sanctuary'),
    () => inspect('sanctuary_journal'), () => talk('sanctuary_warden_npc'), async () => log('quests', JSON.stringify(await quest())),
  ];
  for (const f of steps) { try { await f(); } catch (e) { log('ERR', e.message); await p.screenshot({ path: OUT + 'play_err.png' }); break; } }
  log('errors', errs);
  await b.close();
})();
