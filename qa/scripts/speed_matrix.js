// QA-1 evidence / retest: how many times does each status actually DO its job,
// when the player (applier) is faster vs slower than the enemy?
// One enemy (SPD 10, 999 HP, DEF 0). Player SPD 40 ("faster") or 1 ("slower").
// Each status is applied with its real skill on the player's turn, then the player attacks 5 times.
//   node qa/scripts/speed_matrix.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));

const CASES = [
    // name, skill, target, what counts as one "use", intended uses (from the skill text)
    { status: 'Marked for Death', skill: 'Marked for Death', target: 1, use: 'your attacks that got +50%', intended: 1 },
    { status: 'Expose', skill: 'Expose Weakness', target: 1, use: 'your attacks that got +20%', intended: 2 },
    { status: 'Guard', skill: 'Guard', use: 'enemy hits reduced', intended: 1 },
    { status: 'Evasion', skill: 'Evasion', use: 'enemy attacks rolled vs dodge', intended: 1 },
    { status: 'Riposte', skill: 'Riposte', use: 'counters fired', intended: 1 },
    { status: 'Taunt', skill: 'Shield of the Dead', use: 'enemy attacks pulled to a minion', intended: 2, minion: true },
    // controls: holder-turn statuses (expected to be speed-independent today)
    { status: 'Stun', skill: 'Shield Bash', target: 1, use: 'enemy turns skipped', intended: 1 },
    { status: 'Silence', skill: 'Garrote', target: 1, use: 'enemy turns silenced', intended: 1 },
    { status: 'Blind', skill: 'Smoke Bomb', use: 'enemy attacks rolled vs blind', intended: 1 },
    { status: 'Bleed', skill: 'Hemorrhage', target: 1, use: 'bleed ticks', intended: 3 },
];

function measure(cs, playerSpd) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = ['shackled_ghoul'];
    Object.assign(d.enemies.shackled_ghoul, { hp: 999, maxHp: 999, def: 0, spd: 10 });
    const g = new GameEngine({ seed: 7, data: d });
    g.start(); g.input('warrior'); g.input('n');
    g.player.spd = playerSpd;
    g.input('engage');
    const p = g.player;
    p.hp = p.maxHp = 99999;
    p.skills.push(cs.skill, 'Raise Skeleton');
    const refill = () => { p.resource.current = p.resource.max = 99; };
    let uses = 0;
    const on = (obj, fn, wrap) => { const orig = obj[fn].bind(obj); obj[fn] = (...a) => wrap(orig, ...a); };
    const enemy = g.combat.enemies[0];
    on(g, 'rollDamage', (orig, att, tgt, skill, hit) => {
        if (att.isPlayer && tgt === enemy && cs.status === 'Expose' && g.findStatus(tgt, 'Expose')) uses++;
        if (att.isPlayer && tgt === enemy && cs.status === 'Marked for Death' && g.findStatus(tgt, 'Marked for Death')) uses++;
        if (tgt.isPlayer && cs.status === 'Guard' && g.findStatus(tgt, 'Guard')) uses++;
        return orig(att, tgt, skill, hit);
    });
    on(g, 'hitConnects', (orig, att, tgt) => {
        if (tgt.isPlayer && cs.status === 'Evasion' && g.findStatus(tgt, 'Evasion')) uses++;
        if (att === enemy && cs.status === 'Blind' && g.findStatus(att, 'Blind')) uses++;
        return orig(att, tgt);
    });
    on(g, 'counterAttack', (orig, holder, att) => {
        if (cs.status === 'Riposte' && holder.isPlayer && g.statusOfType(holder, 'counter') && att.hp > 0) uses++;
        return orig(holder, att);
    });
    on(g, 'castSkill', (orig, caster, skill, targets) => {
        if (cs.status === 'Taunt' && caster === enemy && targets[0] && targets[0].isMinion) uses++;
        if (cs.status === 'Silence' && caster === enemy && g.findStatus(enemy, 'Silence')) uses++;
        return orig(caster, skill, targets);
    });
    on(g, 'startTurn', (orig, actor) => {
        const bleed = actor === enemy && g.findStatus(enemy, 'Bleed');
        const r = orig(actor);
        if (cs.status === 'Bleed' && bleed) uses++;
        if (cs.status === 'Stun' && actor === enemy && r) uses++;
        return r;
    });
    if (cs.minion) { refill(); g.input('raise skeleton'); refill(); g.input('attack 1'); } // skeleton joins next round
    refill();
    g.input(cs.target ? `${cs.skill} ${cs.target}` : cs.skill);
    for (let i = 0; i < 5 && g.mode === 'combat'; i++) { refill(); g.input('attack 1'); }
    if (g.errors.length) throw g.errors[0];
    return uses;
}

console.log('Status uses by speed order (one enemy, SPD 10; player SPD 40 = faster, 1 = slower)\n');
console.log('status             intended  faster  slower   counts');
let diverge = 0;
for (const cs of CASES) {
    const f = measure(cs, 40), s = measure(cs, 1);
    const flag = f !== s ? '  <-- speed-dependent' : (f !== cs.intended ? '  <-- off intended' : '');
    if (f !== s) diverge++;
    console.log(`${cs.status.padEnd(18)} ${String(cs.intended).padStart(5)}  ${String(f).padStart(6)}  ${String(s).padStart(6)}   ${cs.use}${flag}`);
}
console.log(`\n${diverge} status(es) depend on speed order.`);
