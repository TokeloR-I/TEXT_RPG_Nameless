// Usage: node docs/experiments/qa8/afford.js . [sens]   ("sens" = lower-value sensitivity pass)
// Boss-alone resource metrics per branch and variant (smart + simple bots). Scratch only.
const path=require('path'); const ROOT=path.resolve(process.argv[2] || '.');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const base = require(path.join(ROOT, 'src/data.js'));
const { choose } = require(path.join(ROOT, 'qa/scripts/smartbot.js')); // QA's smart bot (read-only use)
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];
function simple(g) { const p = g.player;
  if (p.hp <= p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it}`; }
  const opts = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current).sort((a, b) => (b.cost || 0) - (a.cost || 0));
  return opts.length ? `${opts[0].name} 1` : 'attack 1'; }
const REGEN = { 'Stealth Tokens': 3, 'Combo Points': 3, 'Deception Tokens': 2, 'Time Charges': 2 };
const DEF = { mage: 4, rogue: 5, necromancer: 6 };
const rg = (ns) => (d) => { for (const n of ns) d.resourceRules[n].regen = REGEN[n]; };
const df = (d) => { for (const [c, v] of Object.entries(DEF)) d.basePlayerClasses[c].baseStats.def = v; };
const V0 = { baseline: () => {}, stealth3: rg(['Stealth Tokens']), combo3: rg(['Combo Points']), deception2: rg(['Deception Tokens']), time2: rg(['Time Charges']), all4: rg(Object.keys(REGEN)), def_only: df, 'all4+def': (d) => { rg(Object.keys(REGEN))(d); df(d); } };
const one = (n, v) => (d) => { d.resourceRules[n].regen = v; };
const V = process.argv[3] === 'sens' ? { baseline: () => {}, stealth1: one('Stealth Tokens', 1), stealth2: one('Stealth Tokens', 2), combo1: one('Combo Points', 1), combo2: one('Combo Points', 2), deception1: one('Deception Tokens', 1) } : V0;
const rows = [];
for (const [vn, mut] of Object.entries(V)) {
  const data = JSON.parse(JSON.stringify(base)); mut(data);
  for (const [cls, br] of [['rogue','assassin'],['rogue','duelist'],['rogue','saboteur'],['mage','elementalist'],['mage','illusionist'],['mage','chronomancer']]) for (const pol of ['smart','simple']) {
    const s = { wins: 0, turns: 0, starved: 0, paid: 0, rounds: 0, capped: 0, regenRounds: 0, timeouts: 0 };
    for (let seed = 1; seed <= 100; seed++) {
      const g = new GameEngine({ seed, data }); g.start(); g.input(cls); g.input('add_xp 250'); g.input(br);
      g.player.inventory.push('Healing Herb Bundle', 'Bandages', 'Bandages'); g.currentRoom='wardens_roost'; g.input('engage');
      let i = 0;
      for (; i<300 && g.mode==='combat'; i++) {
        if (g.combat.awaitingContinue) { g.input('continue'); continue; }
        const p = g.player;
        const costly = p.skills.map((n) => g.playerSkill(n)).filter((k) => k && g.isCastable(k) && g.skillCost(k) > 0 && k.cost !== 'all');
        if (costly.length && !costly.some((k) => g.skillCost(k) <= p.resource.current)) s.starved++;
        const r0 = g.combat.round;
        const out = g.input(pol === 'smart' ? choose(g) : simple(g)).filter(e=>e.type==='text').map(e=>e.text).join('\n');
        s.turns++;
        if (/Used \d+ /.test(out)) s.paid++;
        if (g.combat && g.combat.round > r0) { s.rounds++; if (p.resource.regen > 0) { s.regenRounds++; if (p.resource.current >= p.resource.max) s.capped++; } }
      }
      if (i >= 300) s.timeouts++;
      if (g.mode === 'won') s.wins++;
    }
    rows.push({ vn, br, pol, ...s });
  }
}
const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
for (const pol of ['smart', 'simple']) {
  console.log(`\n${pol} bot, boss alone, 100 seeds: win% · avg commands · starved% (no paid skill affordable) · paid-cast% · capped% (at max after a regen round)`);
  for (const br of [...new Set(rows.map((r) => r.br))]) {
    console.log(br.padEnd(13) + rows.filter((r) => r.br === br && r.pol === pol).map((r) => `${r.vn}: ${r.wins}%·${(r.turns / 100).toFixed(0)}·${pct(r.starved, r.turns)}%·${pct(r.paid, r.turns)}%·${pct(r.capped, r.regenRounds)}%`).join(' | '));
  }
}
