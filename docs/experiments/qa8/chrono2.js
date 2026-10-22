// Chronomancer: does casting Haste every round (when affordable) help, at Time regen 1 vs 2? Boss alone, 100 seeds.
const path=require('path'); const ROOT=path.resolve(process.argv[2] || '.');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const base = require(path.join(ROOT, 'src/data.js'));
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];
function simple(g) { const p = g.player;
  if (p.hp <= p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it}`; }
  const opts = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current).sort((a, b) => (b.cost || 0) - (a.cost || 0));
  return opts.length ? `${opts[0].name} 1` : 'attack 1'; }
for (const regen of [1, 2]) for (const hasteFirst of [false, true]) {
  const data = JSON.parse(JSON.stringify(base)); data.resourceRules['Time Charges'].regen = regen;
  let wins = 0, hastes = 0, turns = 0, rounds = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const g = new GameEngine({ seed, data }); g.start(); g.input('mage'); g.input('add_xp 250'); g.input('chronomancer');
    g.player.inventory.push('Healing Herb Bundle', 'Bandages', 'Bandages'); g.currentRoom='wardens_roost'; g.input('engage');
    for (let i=0; i<300 && g.mode==='combat'; i++) {
      const sk = g.playerSkill('haste');
      let c = simple(g);
      if (hasteFirst && !g.combat.extraTurn && sk && g.skillCost(sk) <= g.player.resource.current && !/^use /.test(c)) { c = 'haste'; hastes++; }
      g.input(c); turns++;
    }
    rounds += g.combat ? g.combat.round : 0;
    if (g.mode === 'won') wins++;
  }
  console.log(`regen ${regen} ${hasteFirst ? 'haste every round when affordable' : 'never haste'}: boss-alone ${wins}% · hastes ${hastes} · commands ${turns}`);
}
console.log('haste cost:', JSON.stringify(base.skillDefinitions.haste || base.skillDefinitions.Haste));
