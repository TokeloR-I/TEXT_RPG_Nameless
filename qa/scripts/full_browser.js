// Full Chapter One pass in world.html (the 16 px world as shipped), driven by real key presses only:
// title + creator by keys, every map, every NPC and inspectable, every optional fight and quest, the shops' dialogue,
// the Warden fought for real through the battle UI, the seal, Black Flight, Orin and Q07, save -> reload -> Continue.
// Regular fights are won with enemy HP forced to 1 (this pass is about flow, not balance: see ch1_survival.js).
//   node qa/scripts/full_browser.js [class=warrior]      screenshots -> qa/results/2026-10-24_full/
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const R = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'results', '2026-10-24_full'); fs.mkdirSync(OUT, { recursive: true });
const CLS = process.argv[2] || 'warrior';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const findings = []; const note = (sev, what) => { findings.push(`${sev}: ${what}`); console.log(`  >> ${sev}: ${what}`); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + R + '/world.html'); await sleep(900);
  const S = () => p.evaluate(() => ({ ...ensoDebug.state(), pos: window.ensoWorld ? ensoWorld.getState() : null, text: document.getElementById('dialog').hidden ? '' : document.getElementById('dialog').innerText,
    prompt: document.getElementById('prompt').hidden ? '' : document.getElementById('prompt').innerText, hud: document.getElementById('hud').innerText, title: document.getElementById('title').hidden ? '' : document.getElementById('title').innerText,
    pause: document.getElementById('pause').hidden ? '' : document.getElementById('pause').innerText, combat: document.getElementById('combat').hidden ? '' : document.getElementById('combat').innerText }));
  const log = (...a) => console.log(...a);
  const shot = async (name) => { await sleep(250); await p.screenshot({ path: path.join(OUT, name + '.png') }); };
  // ---- title and creator, by keys
  let s = await S(); log('TITLE:', s.title.replace(/\s+/g, ' ').slice(0, 200));
  for (let i = 0; i < 25; i++) {
    s = await S(); if (s.screen === 'explore') break;
    const step = await p.evaluate(() => (typeof creator !== 'undefined' ? null : null));
    if (/name/i.test(s.title) && i < 3) { await p.keyboard.type('Tally'); }
    if (/Fighter|Warrior/.test(s.title) && CLS !== 'warrior' && !p._picked) { const order = ['warrior', 'mage', 'rogue', 'necromancer']; for (let k = 0; k < order.indexOf(CLS); k++) { await p.keyboard.press('ArrowDown'); await sleep(80); } p._picked = true; }
    await p.keyboard.press('Enter'); await sleep(250);
  }
  s = await S(); log('after creator:', s.screen, s.mode, s.pos && s.pos.map, 'class', await p.evaluate(() => enso.player.className), 'name', await p.evaluate(() => enso.player.name));
  const clear = async () => { for (let i = 0; i < 25; i++) { const q = await S(); if (q.screen === 'explore' && !q.modal) return true; if (q.mode === 'branch_select' || /path|branch/i.test(q.text) && q.modal === 'branch') { await p.keyboard.press('Enter'); await sleep(250); continue; } await p.keyboard.press(q.modal === 'dialog' || q.modal === 'branch' ? 'Enter' : 'Escape'); await sleep(160); } return false; };
  await clear(); await shot('00_cellar');
  const step = async (d) => { const b4 = (await S()).pos; await p.keyboard.down(KEY[d]); const t0 = Date.now(); while (Date.now() - t0 < 300) { const q = (await S()).pos; if (q.x !== b4.x || q.y !== b4.y || q.map !== b4.map) break; await sleep(10); } await p.keyboard.up(KEY[d]); await sleep(110); return S(); };
  const route = (gx, gy) => p.evaluate(([gx, gy]) => { const s = ensoWorld, D = ENSO.worldModel.DIRS, key = (x, y) => x + ',' + y;
      const exits = new Set((s.map.exits || []).map((e) => key(e.x, e.y))); const prev = new Map([[key(s.x, s.y), null]]); const q = [[s.x, s.y]];
      while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) break; for (const [d, [dx, dy]] of Object.entries(D)) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k)) continue; const goal = nx === gx && ny === gy;
        if (s.isBlocked(nx, ny)) continue; if (!goal && (exits.has(k) || s.boundaryAt(nx, ny) && !s.boundaryAt(x, y))) continue; prev.set(k, [key(x, y), d]); q.push([nx, ny]); } }
      if (!prev.has(key(gx, gy))) return null; const dirs = []; let k = key(gx, gy); while (prev.get(k)) { const [pk, d] = prev.get(k); dirs.unshift(d); k = pk; } return dirs; }, [gx, gy]);
  const walk = async (gx, gy) => { const r = await route(gx, gy); if (!r) throw new Error(`no route to ${gx},${gy} on ${(await S()).pos.map}`); for (const d of r) { const q = await step(d); if (q.screen === 'combat') return q; if (q.modal) await clear(); } return S(); };
  const cellsOf = (o) => { const out = []; for (let y = o.y; y < o.y + (o.h || 1); y++) for (let x = o.x; x < o.x + (o.w || 1); x++) out.push([x, y]); return out; };
  const obj = (id) => p.evaluate((id) => { const m = ensoWorld.map; return [...(m.interactables || []), ...(m.encounters || [])].find((o) => o.id === id); }, id);
  const face = async (o) => { for (const [x, y] of cellsOf(o)) for (const [d, dx, dy] of [['up', 0, 1], ['down', 0, -1], ['right', -1, 0], ['left', 1, 0]]) { const tx = x + dx, ty = y + dy; if (cellsOf(o).some(([a, c]) => a === tx && c === ty)) continue; const r = await route(tx, ty); if (!r) continue; await walk(tx, ty); const q = await S(); if (q.screen === 'combat') return true; await step(d); return true; } throw new Error('cannot face ' + o.id); };
  const choices = () => p.evaluate(() => [...document.querySelectorAll('#dialog .talk-choices li, #dialog [data-i]')].map((e) => e.innerText.trim()));
  const say = async (re) => { const items = await choices(); const i = items.findIndex((t) => re.test(t)); if (i < 0) { log('   (no choice', re, '| have:', items.join(' | '), ')'); return null; } for (let k = 0; k < i; k++) { await p.keyboard.press('ArrowDown'); await sleep(70); } await p.keyboard.press('Enter'); await sleep(260); return (await S()).text; };
  const talk = async (id, picks = []) => { const o = await obj(id); if (!o) { log('TALK', id, 'not on this map'); return ''; } await face(o); const pr = (await S()).prompt; await p.keyboard.press('e'); await sleep(320);
      const said = [(await S()).text.replace(/\s+/g, ' ').slice(0, 200)]; for (const re of picks) { const t = await say(re); if (t != null) said.push(t.replace(/\s+/g, ' ').slice(0, 220)); }
      if ((await S()).modal === 'talk') { await p.keyboard.press('Escape'); await sleep(250); } await clear(); log(`TALK ${id} [${pr.replace(/\s+/g, ' ')}]`, said.join(' // ').slice(0, 420)); return said.join(' // '); };
  const inspect = async (id) => { const o = await obj(id); if (!o) { log('INSPECT', id, 'not on this map'); return ''; } await face(o); const pr = (await S()).prompt; await p.keyboard.press('e'); await sleep(320); const t = (await S()).text; await clear(); log(`INSPECT ${id} [${pr.replace(/\s+/g, ' ')}]:`, t.replace(/\s+/g, ' ').slice(0, 200)); return t; };
  const battle = async (id, real) => { const o = await obj(id); if (!o) { log('FIGHT', id, 'not here'); return; } await face(o); await sleep(250);
      if (!(await p.evaluate(() => enso.mode === 'combat'))) { const d = (await S()).pos.facing; await p.keyboard.press(KEY[d]); }
      for (let i = 0; i < 30 && !(await p.evaluate(() => enso.mode === 'combat')); i++) await sleep(100);
      if (!(await p.evaluate(() => enso.mode === 'combat'))) { note('BUG', `walking into ${id} did not start a fight`); return; }
      await sleep(600); if (real) await shot('battle_' + id);
      let n = 0; for (; n < 600; n++) { const q = await S(); if (q.screen === 'explore' && !q.modal && q.mode !== 'combat') break; if (q.screen === 'over') break;
        if (!real) await p.evaluate(() => { if (enso.combat) for (const e of enso.combat.enemies) if (e.hp > 1) e.hp = 1; });
        if (q.mode === 'branch_select' || q.modal) { await p.keyboard.press('Enter'); await sleep(160); continue; }
        await p.keyboard.press('Enter'); await sleep(real ? 140 : 90); }
      const q = await S(); log('FIGHT', id, real ? '(real)' : '(forced)', 'result:', await p.evaluate(() => enso.world && enso.world.lastResult), 'mode', q.mode, 'screen', q.screen, 'HP', await p.evaluate(() => `${enso.player.hp}/${enso.player.maxHp}`), 'L', await p.evaluate(() => enso.player.level), 'Gold', await p.evaluate(() => enso.player.gold), 'presses', n);
      await clear(); };
  const graphPath = (to) => p.evaluate((to) => { const W = ensoDebug.world, from = ensoWorld.mapId; const prev = new Map([[from, null]]); const q = [from]; while (q.length) { const m = q.shift(); if (m === to) break; for (const e of W.maps[m].exits || []) if (!prev.has(e.toMap)) { prev.set(e.toMap, [m, e.id]); q.push(e.toMap); } } if (!prev.has(to)) return null; const ids = []; let k = to; while (prev.get(k)) { const [pm, id] = prev.get(k); ids.unshift(id); k = pm; } return ids; }, to);
  const exit = async (id) => { const e = await p.evaluate((id) => ensoWorld.map.exits.find((x) => x.id === id), id); if (e.trigger === 'step') await walk(e.x, e.y); else { await face({ x: e.x, y: e.y }); await p.keyboard.press('e'); } await sleep(750); const ok = await clear(); const q = await S(); return q; };
  const seenMaps = new Set();
  const goTo = async (map) => { for (let tries = 0; tries < 3; tries++) { const ids = await graphPath(map); if (!ids) throw new Error('no map route to ' + map); for (const id of ids) { const before = (await S()).pos.map; const q = await exit(id); if (q.pos.map === before) { log('   exit', id, 'did not take us anywhere; text:', q.text.replace(/\s+/g, ' ').slice(0, 160)); break; } if (!seenMaps.has(q.pos.map)) { seenMaps.add(q.pos.map); await shot('map_' + q.pos.map); } } if ((await S()).pos.map === map) return; } throw new Error('could not reach ' + map); };
  const Q = () => p.evaluate(() => Object.fromEntries(['Q01','Q02','Q03','Q04','Q05','Q06','B01','Q07','S01','J01','J02'].map((q) => [q, enso.questState(q)])));
  const allHere = async (skip = []) => { const list = await p.evaluate(() => ensoWorld.visibleObjects().filter((o) => o.kind !== 'encounter').map((o) => ({ id: o.id, kind: o.kind }))); for (const o of list) if (!skip.includes(o.id)) { try { if (o.kind === 'npc') await talk(o.id); else await inspect(o.id); } catch (e) { note('BUG', `${o.id} on ${(await S()).pos.map}: ${e.message}`); } } };
  const steps = [
    ['cellar: everything', () => allHere()],
    ['house', async () => { await goTo('house'); await allHere(); }],
    ['grounds + rats', async () => { await goTo('grounds'); await allHere(['grounds_orin', 'grounds_shane']); await battle('grounds_weed_rats'); }],
    ['shed', async () => { await goTo('shed'); await allHere(); }],
    ['well', async () => { await goTo('well'); await allHere(); }],
    ['road + wolf', async () => { await goTo('road'); await allHere(); await battle('road_wolf'); }],
    ['tollway', async () => { await goTo('tollway'); await talk('tollway_elian', [/heroes/, /lord/, /road go/, /going on to the village/]); await allHere(['tollway_elian', 'tollway_register']); await battle('tollway_ragpickers'); await battle('tollway_root_chewers'); }],
    ['shamefield', async () => { await goTo('shamefield'); log('quests', JSON.stringify(await Q())); await talk('village_tamsin'); await talk('village_mara', [/What have you got/]); await talk('village_bragg', [/What have you got|buy|sale/i]); await talk('village_iona', [/What have you got|herbs/i]); await allHere(['village_shane', 'village_tamsin', 'village_mara', 'village_bragg', 'village_iona']); }],
    ['buy in the browser?', async () => { const before = await p.evaluate(() => ({ g: enso.player.gold, inv: enso.player.inventory.length })); await talk('village_mara', [/What have you got/, /Bandages|buy/i]); const after = await p.evaluate(() => ({ g: enso.player.gold, inv: enso.player.inventory.length })); log('   gold/items before', JSON.stringify(before), 'after', JSON.stringify(after)); if (after.g === before.g) note('BLOCKER?', 'no way to buy anything in world.html: the merchant only lists stock and says to type a command'); await shot('shop_mara'); }],
    ['Shane S01', async () => { await talk('village_crowd', [/What did he do/]); await talk('village_shane', [/watch after you/, /What do you need/, /get your ledger/]); await goTo('allotment'); await allHere(['allotment_wagon']); await battle('allotment_watch'); await inspect('allotment_wagon'); await goTo('shamefield'); await talk('village_shane', [/ledger/]); }],
    ['notice board jobs + cloister + lane', async () => { await inspect('village_notice_board'); await goTo('briarwell_cloister_court'); await allHere(); await goTo('shamefield'); await goTo('village_residential_lane'); await allHere(); await goTo('shamefield'); }],
    ['Q05', async () => { await talk('village_captain'); await goTo('tollway'); await inspect('tollway_register'); await goTo('shamefield'); await talk('village_captain', [/Here it is/]); log('quests', JSON.stringify(await Q())); }],
    ['orchard', async () => { await goTo('orchard'); await allHere(); await battle('orchard_cultists'); }],
    ['featherwatch', async () => { await goTo('featherwatch'); await battle('featherwatch_ghoul'); await allHere(); }],
    ['sanctuary', async () => { await goTo('sanctuary'); await allHere(['sanctuary_warden_npc']); await talk('sanctuary_warden_npc', [/What is behind it/, /I'll go/]); await clear(); log('quests', JSON.stringify(await Q()), 'mode', (await S()).mode); }],
    ['save, reload, continue', async () => { await p.keyboard.press('Escape'); await sleep(300); const tabs = await p.evaluate(() => [...document.querySelectorAll('#pause .mm-tabs li')].map((l) => l.innerText.trim())); log('   menu tabs', tabs.join(' | ')); await shot('menu');
        const i = tabs.findIndex((t) => /Save/.test(t)); for (let k = 0; k < i; k++) { await p.keyboard.press('ArrowDown'); await sleep(80); } await p.keyboard.press('Enter'); await sleep(300); log('   save note:', (await S()).pause.replace(/\s+/g, ' ').slice(-160)); await p.keyboard.press('Escape'); await sleep(200); await clear();
        const before = await p.evaluate(() => ({ pos: ensoWorld.getState(), xp: enso.player.xp, lvl: enso.player.level, gold: enso.player.gold, inv: [...enso.player.inventory].sort(), q: enso.questState('B01') }));
        await p.reload(); await sleep(900); for (let k = 0; k < 4; k++) { const q = await S(); if (q.screen === 'explore') break; await p.keyboard.press('Enter'); await sleep(300); } await clear();
        const after = await p.evaluate(() => ({ pos: ensoWorld.getState(), xp: enso.player.xp, lvl: enso.player.level, gold: enso.player.gold, inv: [...enso.player.inventory].sort(), q: enso.questState('B01') }));
        log('   before', JSON.stringify(before)); log('   after ', JSON.stringify(after)); const same = JSON.stringify({ ...before, pos: { ...before.pos, steps: 0 } }) === JSON.stringify({ ...after, pos: { ...after.pos, steps: 0 } }); if (!same) note('BUG', `save -> reload -> Continue changed state: ${JSON.stringify(before)} vs ${JSON.stringify(after)}`); }],
    ['Warden (real fight)', async () => { await talk('sanctuary_warden_npc', [/Stand aside/, /Draw your weapon/]); await battle('sanctuary_warden', true); log('quests', JSON.stringify(await Q())); }],
    ['seal', async () => { if ((await S()).screen === 'over') { note('INFO', 'lost the Warden; rest of the run skipped'); throw new Error('defeated'); } await goTo('seal_chamber'); await allHere(); await shot('seal'); log('quests', JSON.stringify(await Q())); }],
    ['crow + Black Flight', async () => { await p.keyboard.press('Escape'); await sleep(300); const tabs = await p.evaluate(() => [...document.querySelectorAll('#pause .mm-tabs li')].map((l) => l.innerText.trim())); log('   menu tabs now', tabs.join(' | ')); const i = tabs.findIndex((t) => /Crow/.test(t)); if (i < 0) { note('BUG', 'no Crow tab after the seal'); await p.keyboard.press('Escape'); return; }
        for (let k = 0; k < i; k++) { await p.keyboard.press('ArrowDown'); await sleep(80); } await p.keyboard.press('Enter'); await sleep(300); await shot('crow_tab'); log('   crow page:', (await S()).pause.replace(/\s+/g, ' ').slice(0, 300));
        await p.keyboard.press('Enter'); await sleep(300); await p.keyboard.press('Enter'); await sleep(2200); await clear(); log('   after Black Flight: map', (await S()).pos.map); }],
    ['home: Orin, Q07', async () => { await goTo('grounds'); await talk('grounds_orin', [/rebuilt/]); await talk('grounds_orin'); await talk('grounds_shane', [/What have you got/]); log('quests', JSON.stringify(await Q())); if ((await Q()).Q07 !== 'complete') note('BLOCKER', 'Q07 cannot be completed in the browser (no build action)'); await shot('home_end'); }],
  ];
  for (const [name, f] of steps) { log(`\n== ${name}`); try { await f(); } catch (e) { log('ERR', e.message); await shot('err_' + name.replace(/\W+/g, '_')); if (/defeated/.test(e.message)) break; } }
  log('\nmaps visited', [...seenMaps].join(', '));
  log('page errors', JSON.stringify(errs));
  log('FINDINGS\n' + findings.join('\n'));
  await b.close();
})();
