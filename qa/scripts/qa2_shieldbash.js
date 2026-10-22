// QA-2 Shield Bash: independent checks of the 11 acceptance criteria in
// docs/design/QA_2_SHIELD_BASH_PROPOSAL.md (approved), through the real command path where possible.
//   node qa/scripts/qa2_shieldbash.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => { try { const r = fn(); out.push(`${r.ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${r.note || ''}`); } catch (e) { out.push(`FAIL  [${id}] ${what}\n        THREW ${e.stack.split('\n').slice(0, 2).join(' ')}`); } };
const CR = (d, o = {}) => {
    d.statusDefinitions.Stun = { ...d.statusDefinitions.Stun, control: 'hard', crGain: o.gain ?? 40 };
    d.statusRules.controlResistance = { threshold: 100, recoveryPerRound: o.rec ?? 10, releaseThreshold: 50, tierMultipliers: { regular: 1, elite: 1.5, boss: o.boss ?? 2, player: 1, summon: 1 } };
};

/** Vanguard L3 vs the Warden (or the hallway). oath: Oath Points pinned before every command (null = honest). */
function vanguard({ room = 'boss', spd, mutate, seed = 1, oath = 5 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA)); if (mutate) mutate(d);
    const g = new GameEngine({ seed, data: d }); g.start();
    ['warrior', 'add_xp 250', 'vanguard'].forEach((c) => g.input(c));
    if (spd != null) g.player.spd = spd;
    if (room === 'boss') g.currentRoom = 'wardens_roost'; else g.input('n');
    g.log = [T(g.input('engage'))];
    g.player.hp = g.player.maxHp = 99999;
    for (const e of g.combat.enemies) { e.hp = e.maxHp = 9999; }
    g.do = (c) => { if (oath != null) g.player.resource.current = oath; const t = T(g.input(c)); g.log.push(t); return t; };
    return g;
}
const stunsLanded = (t) => (t.match(/is stunned!/g) || []).length;
/** The boss's scheduled turns as a string: A = acted, S = skipped. */
const turnPattern = (txt, who = 'The Crow-Touched Warden') =>
    txt.split('\n').map((l) => (l.includes(`${who}'s Turn!`) ? 'A' : l.includes(`${who} is unable to act`) ? 'S' : '')).join('');

check('1', 'L3 Vanguard uses Oath Points; Shield Bash text and menu name the right threshold', () => {
    const g = vanguard({ room: 'hall' });
    const menu = g.do('help me');
    const desc = DATA.skillDefinitions['Shield Bash'].description;
    return { ok: g.player.resource.type === 'Oath Points' && /Oath Points ≥ 3/.test(desc) && !/Momentum/.test(desc) && /> Shield Bash/.test(menu), note: `resource ${g.player.resource.type}; text: "${desc}"` };
});
check('2', 'Threshold: Oath 0/1/2 -> damage but no stun; 3 and 7 -> stun', () => {
    const res = [0, 1, 2, 3, 7].map((o) => {
        const g = vanguard({ room: 'hall', oath: o, spd: 40 });
        const t = g.do('shield bash 1');
        return `${o}:${/uses Shield Bash on .* for \d+ damage/.test(t) ? 'hit' : 'nohit'}/${stunsLanded(t) ? 'stun' : '-'}`;
    });
    return { ok: res.join(' ') === '0:hit/- 1:hit/- 2:hit/- 3:hit/stun 7:hit/stun', note: res.join(' ') };
});
check('3', 'No expenditure: Oath Points unchanged after a stunning bash (command path, honest resource)', () => {
    const g = vanguard({ room: 'hall', oath: null, spd: 40 });
    g.player.resource.current = 4; const t = g.do('shield bash 1');
    return { ok: stunsLanded(t) === 1 && g.player.resource.current === 4, note: `Oath 4 -> ${g.player.resource.current}, stun landed ${stunsLanded(t) === 1}` };
});
check('4', 'Failed attacks: a dodged or absorbed bash applies no stun and starts no lockout', () => {
    const res = ['Mirror Image', 'Bone Wall'].map((def) => {
        const g = vanguard({ room: 'hall', spd: 40 }); const e = g.combat.enemies[0];
        g.applyStatus(e, e, def === 'Bone Wall' ? { name: 'Bone Wall', type: 'absorb', duration: 3 } : { name: 'Mirror Image', type: 'dodge', value: 1, duration: 3 });
        const t = g.do('shield bash 1');
        return `${def}: stun ${stunsLanded(t)}, lockout ${e.shieldBashRecovery || 'none'}`;
    });
    return { ok: res.every((r) => /stun 0, lockout none/.test(r)), note: res.join(' | ') };
});
check('5', 'One-turn control: a landed stun denies exactly the next scheduled action, faster and slower', () => {
    const res = [40, 1].map((spd) => {
        const g = vanguard({ spd });
        g.do('shield bash'); g.do('guard'); g.do('guard'); g.do('guard');
        return `${spd === 40 ? 'faster' : 'slower'} ${turnPattern(g.log.join('\n'))}`;
    });
    // after the bash: one S then As only (Guard never stuns)
    return { ok: res.every((r) => /S/.test(r) && !/SS/.test(r) && (r.match(/S/g) || []).length === 1), note: res.join(' | ') };
});
check('5b', 'Haste: a bonus action does not count as the target\'s recovery turn (player as the target)', () => {
    // An enemy with a Shield Bash-flagged stun bashes the player; the player Hastes during the recovery turn.
    // Recovery must come from the player's normal turn, and a second bash stun must not land before it.
    const d = (x) => { x.rooms.hallway_of_chains.enemies = ['shackled_ghoul']; x.enemies.shackled_ghoul.skills = [{ name: 'Bash', base_damage: [1, 1], effects: [{ type: 'stun', duration: 1, shieldBashRecovery: true }] }]; };
    const g2 = new GameEngine({ seed: 2, data: (() => { const c = JSON.parse(JSON.stringify(DATA)); d(c); return c; })() }); g2.start();
    ['mage', 'add_xp 250', 'chronomancer', 'n'].forEach((c) => g2.input(c)); g2.player.spd = 1; g2.input('engage');
    let log = '';
    for (let i = 0; i < 8 && g2.mode === 'combat'; i++) { g2.player.resource.current = 99; g2.player.hp = 999; log += T(g2.input(i % 2 ? 'haste' : 'focus')); }
    const p = turnPattern(log, 'Mage').replace(/A/g, 'A');
    const yourTurns = log.split('\n').map((l) => (l.includes('--- Your Turn! ---') ? 'A' : l.includes('Mage is unable to act') ? 'S' : '')).join('');
    return { ok: !/SS/.test(yourTurns) && /S/.test(yourTurns), note: `your scheduled turns (S skipped, A acted): ${yourTurns}` };
});
check('6', 'Anti-lock: 30 rounds of Shield Bash at >=3 Oath, CR off — never two Shield Bash skips in a row', () => {
    const res = [40, 1].map((spd) => {
        const g = vanguard({ spd });
        for (let i = 0; i < 30 && g.mode === 'combat'; i++) g.do('shield bash');
        const p = turnPattern(g.log.join('\n'));
        return { spd, p, ok: !/SS/.test(p) && (p.match(/S/g) || []).length >= 10 };
    });
    return { ok: res.every((r) => r.ok), note: res.map((r) => `${r.spd === 40 ? 'faster' : 'slower'}: ${r.p}`).join(' | ') };
});
check('6b', 'QA-2 original repro, honest Oath Points (start 1, +1 per Guard): boss acts at least every other turn', () => {
    const g = vanguard({ oath: null });
    g.do('guard'); g.do('guard');                                   // reach 3 Oath legitimately
    for (let i = 0; i < 30 && g.mode === 'combat'; i++) g.do(g.player.resource.current >= 3 ? 'shield bash' : 'guard');
    const p = turnPattern(g.log.join('\n'));
    return { ok: !/SS/.test(p), note: `boss turns: ${p} (A ${(p.match(/A/g) || []).length}, S ${(p.match(/S/g) || []).length}); report #1 was 1 A then 20 S` };
});
check('7', 'CR (test-only values): stuns accrue CR, the one reaching 100 lands, the next is resisted', () => {
    const g = vanguard({ room: 'hall', mutate: (d) => CR(d, { gain: 50 }) , spd: 40 });
    const e = g.combat.enemies[0];
    const seq = [];
    // CR shown after each command, i.e. after that round's -10 recovery. Lockout turns show '-'.
    let reachedWhileLanding = false;
    for (let i = 0; i < 10 && g.mode === 'combat'; i++) {
        const before = e.cr ? e.cr.value : 0; const t = g.do('shield bash 1');
        const landed = stunsLanded(t) === 1; if (landed && before + 50 >= 100) reachedWhileLanding = true;
        seq.push(`${landed ? 'stun' : /resists Stun/.test(t) ? 'RESISTED' : '-'}@${e.cr ? e.cr.value : 0}${e.cr && e.cr.immune ? 'i' : ''}`);
    }
    return { ok: reachedWhileLanding && seq.some((x) => x.startsWith('RESISTED')), note: seq.join(' ') + '  (i = immune)' };
});
check('8', 'No CR and no Stun refresh from threshold failure, lockout, immunity or miss', () => {
    const notes = [];
    let ok = true;
    // threshold failure
    { const g = vanguard({ room: 'hall', mutate: (d) => CR(d), oath: 2, spd: 40 }); const e = g.combat.enemies[0]; g.do('shield bash 1'); ok &&= !e.cr; notes.push(`oath2 CR ${e.cr ? e.cr.value : 0}`); }
    // lockout: bash, then bash again while the target is still waiting to skip
    { const g = vanguard({ room: 'hall', mutate: (d) => CR(d), spd: 40 }); const e = g.combat.enemies[0];
      g.player.resource.current = 5; g.castSkill(g.player, g.playerSkill('Shield Bash'), [e]); const cr1 = e.cr.value; const st = g.findStatus(e, 'Stun'); st.duration = 1; const before = st.armed;
      g.castSkill(g.player, g.playerSkill('Shield Bash'), [e]); ok &&= e.cr.value === cr1; notes.push(`lockout CR ${cr1}->${e.cr.value}`); }
    // immunity
    { const g = vanguard({ room: 'hall', mutate: (d) => { CR(d); d.enemies.shackled_ghoul.statusAffinities = { Stun: 'immune' }; }, spd: 40 }); const e = g.combat.enemies[0];
      const t = g.do('shield bash 1'); ok &&= !e.cr && !e.shieldBashRecovery && /immune to Stun/.test(t); notes.push(`immune CR ${e.cr ? e.cr.value : 0}, lockout ${e.shieldBashRecovery || 'none'}`); }
    // miss (blind)
    { const g = vanguard({ room: 'hall', mutate: (d) => CR(d), spd: 40 }); const e = g.combat.enemies[0];
      g.applyStatus(e, g.player, { name: 'Blind', type: 'blind', value: 1, duration: 3 }); g.do('shield bash 1'); ok &&= !e.cr; notes.push(`blind-miss CR ${e.cr ? e.cr.value : 0}`); }
    return { ok, note: notes.join(' | ') };
});
check('9', "Boss tier (CR on): the boss's first stun lands even when one application alone passes 100", () => {
    const g = vanguard({ mutate: (d) => CR(d, { gain: 60, boss: 2 }), spd: 40 });
    const b = g.combat.enemies[0]; const t = g.do('shield bash');
    return { ok: stunsLanded(t) === 1 && b.cr.value === 110 && b.cr.immune, note: `first stun landed; boss CR ${b.cr.value} (60 x 2 = 120, minus 10 recovery), immune ${b.cr.immune}` };
});
check('10a', 'Guard still grants +1 Oath Point', () => {
    const g = vanguard({ room: 'hall', oath: null, spd: 40 }); g.player.resource.current = 1;
    const t = g.do('guard');
    return { ok: /\+1 Oath Points \(oath kept\)/.test(t) && g.player.resource.current === 2, note: `Oath 1 -> ${g.player.resource.current}` };
});
check('10b', "Other stuns get no lockout: Reaper's Charge can still stun on consecutive turns", () => {
    const g = vanguard({ spd: 40 }); g.player.skills.push('Reaper’s Charge');
    for (let i = 0; i < 6 && g.mode === 'combat'; i++) g.do("reaper's charge");
    const p = turnPattern(g.log.join('\n'));
    return { ok: /SSS/.test(p), note: `boss turns under repeated Reaper's Charge: ${p}` };
});
check('11', 'Lockout bookkeeping is cleared at fight end (player as target, next fight)', () => {
    const mk = (x) => { x.rooms.hallway_of_chains.enemies = ['shackled_ghoul']; x.rooms.collapsed_wine_cellar.enemies = ['cellar_vermin'];
        for (const k of ['shackled_ghoul']) x.enemies[k].skills = [{ name: 'Bash', base_damage: [1, 1], effects: [{ type: 'stun', duration: 1, shieldBashRecovery: true }] }]; };
    const d = JSON.parse(JSON.stringify(DATA)); mk(d);
    const g = new GameEngine({ seed: 3, data: d }); g.start(); ['warrior', 'n'].forEach((c) => g.input(c)); g.player.spd = 1; g.input('engage');
    g.player.hp = g.player.maxHp = 999;
    // Win fight 1 while the player is still locked out, then start a fight whose enemy can't stun.
    let atEnd = null;
    for (let i = 0; i < 40 && g.mode === 'combat'; i++) {
        if (g.player.shieldBashRecovery) { atEnd = g.player.shieldBashRecovery; g.combat.enemies[0].hp = 1; g.combat.enemies[0].def = 0; }
        g.input(g.combat && g.combat.awaitingContinue ? 'continue' : 'slash');
    }
    g.input('s'); g.input('e'); g.input('engage');
    return { ok: atEnd != null && g.player.shieldBashRecovery == null, note: `lockout when fight 1 ended: ${atEnd}; at the start of fight 2: ${g.player.shieldBashRecovery == null ? 'clear' : g.player.shieldBashRecovery}` };
});

console.log('QA-2 Shield Bash — independent checks of the approved criteria\n');
console.log(out.join('\n'));
console.log(`\n${out.filter((l) => l.startsWith('PASS')).length}/${out.length} pass`);
