// Usage: node docs/experiments/qa8/stunlock.js . --stunlock
// run with --stunlock so QA's smart bot tries to chain stuns on the boss
const path=require('path'); const ROOT=path.resolve(process.argv[2] || '.');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const base = require(path.join(ROOT, 'src/data.js'));
const { choose } = require(path.join(ROOT, 'qa/scripts/smartbot.js')); // QA's smart bot (read-only use)
const REGEN = { 'Stealth Tokens': 3, 'Combo Points': 3, 'Deception Tokens': 2, 'Time Charges': 2 };
const V = { baseline: (d) => {}, all4: (d) => { for (const [k, v] of Object.entries(REGEN)) d.resourceRules[k].regen = v; } };
for (const [vn, mut] of Object.entries(V)) {
  const data = JSON.parse(JSON.stringify(base)); mut(data);
  for (const [cls, br] of [['rogue','assassin'],['rogue','duelist'],['rogue','saboteur'],['mage','illusionist'],['mage','chronomancer'],['warrior','vanguard']]) {
    let wins = 0, maxRun = 0, skips = 0, turns = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const g = new GameEngine({ seed, data }); g.start(); g.input(cls); g.input('add_xp 250'); g.input(br);
      g.player.inventory.push('Healing Herb Bundle', 'Bandages', 'Bandages'); g.currentRoom='wardens_roost'; g.input('engage');
      let run = 0;
      for (let i=0; i<300 && g.mode==='combat'; i++) {
        const out = g.input(g.combat.awaitingContinue ? 'continue' : choose(g)).filter(e=>e.type==='text').map(e=>e.text).join('\n');
        for (const m of out.match(/Warden (uses|is unable to act)/g) || []) { turns++; if (/unable/.test(m)) { skips++; run++; maxRun = Math.max(maxRun, run); } else run = 0; }
      }
      if (g.mode === 'won') wins++;
    }
    console.log(`${vn.padEnd(9)} ${br.padEnd(13)} boss-alone ${String(wins).padStart(3)}% · boss turns denied ${Math.round(100*skips/Math.max(1,turns))}% · longest denied streak ${maxRun}`);
  }
}
