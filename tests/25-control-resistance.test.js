// Control Resistance: Vaelis Package 2 (docs/design/VAELIS_PACKAGE_2_CONTROL_RESISTANCE.md), deterministic
// acceptance matrix 1–12. Integration notes: architecture/REVIEW_DESIGN_PACKAGES_1-3.md §2.
// Possession (matrix 4 and 11, boss refusal) arrives with N-5 and is tested there.
const { test, assert, newGame, gameWith, stun, since } = require('./helpers.js');

/** Warrior in the hallway (ghoul, ghoul, Rust Rat), acting first; nobody dies by accident. */
function hallFight(mutate) {
    const g = gameWith((d) => {
        for (const k of ['shackled_ghoul', 'rust_rat']) {
            const e = d.enemies[k];
            e.skills = [{ name: 'Test Hit', base_damage: [1, 1] }];
            e.critChance = 0; e.hp = e.maxHp = 999;
        }
        if (mutate) mutate(d);
    });
    g.do('warrior');
    g.player.spd = 40;
    g.do('n', 'engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.critChance = 0;
    return g;
}
const rat = (g) => g.combat.enemies[2];

/** Warrior against the boss, acting first each round; the boss hits for 1 and can't die. */
function bossFight() {
    const g = gameWith((d) => {
        const w = d.enemies.crow_touched_warden;
        w.skills = [{ name: 'Test Hit', base_damage: [1, 1] }];
        w.critChance = 0; w.hp = w.maxHp = 99999;
    });
    g.do('warrior');
    g.player.spd = 40;
    g.currentRoom = 'wardens_roost';
    g.do('engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.critChance = 0;
    return g;
}
const bossTurns = (text) => (text.match(/Warden (uses|is unable to act)/g) || []).map((x) => (/uses/.test(x) ? 'A' : 'S')).join('');
const apply = (g, target, name, type, duration, value, source) =>
    g.applyStatus(source || g.player, target, { name, type, duration, value });

test('CR 1: hard control 0 → 35 → 70, the third is capped at one turn (→ 100), the fourth is resisted', () => {
    const g = hallFight();
    const t = rat(g);
    g.flush();
    const durations = [];
    for (let i = 0; i < 3; i++) durations.push(apply(g, t, 'Stun', 'skip_turn', 3).duration);
    assert.deepStrictEqual(durations, [3, 3, 1], 'full duration below 50, capped at 70');
    assert.strictEqual(t.cr.value, 100);
    assert.strictEqual(apply(g, t, 'Stun', 'skip_turn', 3), null, 'resisted at 100');
    const text = g.flush().map((e) => e.text).join('\n');
    assert.match(text, /Control Resistance 0 → 35[\s\S]*Control Resistance 35 → 70[\s\S]*\(Control Resistance 70: Stun lasts 1 turn\.\)[\s\S]*Control Resistance 70 → 100[\s\S]*Rust Rat resists Stun! \(Control Resistance 100\)/,
        'cap is decided before the gain; the gain is logged after the application');
    assert.strictEqual(t.cr.value, 100, 'a resisted attempt adds nothing');
});

test('CR 2: soft control 0 → 20 → 40 → 60, capped at 60, binary Silence resisted at 80, Slow halved at 80', () => {
    const g = hallFight();
    const t = rat(g);
    const durations = [];
    for (let i = 0; i < 4; i++) durations.push(apply(g, t, 'Silence', 'silence', 3).duration);
    assert.deepStrictEqual(durations, [3, 3, 3, 1]);
    assert.strictEqual(t.cr.value, 80);
    assert.strictEqual(apply(g, t, 'Silence', 'silence', 3), null, 'no half-silence: resisted outright');
    const slow = apply(g, t, 'Slow', 'slow', 3, 0.5);
    assert.ok(slow, 'Slow still applies at 80');
    assert.strictEqual(slow.value, 0.25, '50% of its strength');
    assert.strictEqual(slow.duration, 1, 'for at most one turn');
    assert.strictEqual(t.cr.value, 100);
    assert.match(g.flush().map((e) => e.text).join('\n'), /Rust Rat resists Silence! \(Control Resistance 80\)[\s\S]*\(Control Resistance 80: Slow at half strength for 1 turn\.\)/);
});

test('CR 3: fights start at 0 (regular, player, summon), 25 (elite) and 60 (boss); a new fight resets them', () => {
    const g = hallFight((d) => { d.enemies.rust_rat.tier = 'elite'; });
    const s = g.getState();
    assert.deepStrictEqual(s.combat.enemies.map((e) => [e.tier, e.cr]), [['regular', 0], ['regular', 0], ['elite', 25]]);
    assert.strictEqual(s.player.cr, 0);
    assert.strictEqual(bossFight().getState().combat.enemies[0].cr, 60);
    // build some, then start the next fight
    apply(g, rat(g), 'Stun', 'skip_turn', 1);
    apply(g, g.player, 'Stun', 'skip_turn', 1);
    assert.strictEqual(rat(g).cr.value, 60);
    assert.strictEqual(g.player.cr.value, 35);
    g.mode = 'explore'; g.combat = null;
    g.startCombat(['shackled_ghoul', 'shackled_ghoul', 'rust_rat']);
    const again = g.getState();
    assert.deepStrictEqual(again.combat.enemies.map((e) => e.cr), [0, 0, 25]);
    assert.strictEqual(again.player.cr, 0, 'the player\'s CR is fight-local too');
});

test('CR 5: a boss hard-skipped at opportunity N keeps N+1 (any source, even after CR fell); N+2 can be skipped again', () => {
    const g = bossFight();
    const boss = g.combat.enemies[0];
    g.crState(boss).value = 0;                               // CR fell all the way
    const n = g.log.length;
    assert.strictEqual(apply(g, boss, 'Frozen in time', 'skip_turn', 2).duration, 2, 'a 2-turn skip lands at CR 0');
    g.do('attack 1');                                        // boss opportunity N: skipped
    assert.strictEqual(boss.cr.protectNext, true);
    const other = { id: 'minion_99', name: 'Some Ally' };    // a different source
    assert.strictEqual(apply(g, boss, 'Stun', 'skip_turn', 1, null, other), null, 'N+1 is protected');
    assert.strictEqual(boss.cr.value, 35, 'a protected attempt adds no CR');
    g.do('attack 1');                                        // N+1: the leftover Frozen turn doesn't skip it
    assert.strictEqual(boss.cr.protectNext, false, 'protection ends after the protected normal opportunity');
    assert.strictEqual(boss.cr.value, 25, 'no new control since N: decays 10');
    assert.ok(apply(g, boss, 'Stun', 'skip_turn', 1), 'N+2 is eligible again');
    g.do('attack 1');                                        // N+2: skipped
    const text = since(g, n);
    assert.strictEqual(bossTurns(text), 'SAS');
    assert.match(text, /shakes it off: it can't lose two turns in a row/);
    assert.match(text, /resists Stun! \(It can't lose two turns in a row\.\)/);
});

test('CR 5b: spamming hard control at the boss never denies two turns in a row, and regular enemies get no such protection', () => {
    const g = bossFight();
    const boss = g.combat.enemies[0];
    const n = g.log.length;
    for (let i = 0; i < 40 && g.mode === 'combat'; i++) {
        g.crState(boss).value = 0;                          // worst case: CR never builds
        apply(g, boss, 'Frozen in time', 'skip_turn', 3);
        g.do('attack 1');
    }
    const seq = bossTurns(since(g, n));
    assert.ok(seq.length >= 40 && !seq.includes('SS'), seq);
    assert.ok((seq.match(/S/g) || []).length >= 15, `still controllable every other turn: ${seq}`);
    // a regular enemy with CR forced to 0 can be skipped turn after turn
    const h = hallFight();
    const m = h.log.length;
    for (let i = 0; i < 4; i++) { h.crState(rat(h)).value = 0; apply(h, rat(h), 'Stun', 'skip_turn', 1); h.do('attack 1'); }
    assert.deepStrictEqual((since(h, m).match(/Rust Rat (uses|is unable to act)/g) || []).map((x) => (/uses/.test(x) ? 'A' : 'S')), ['S', 'S', 'S', 'S']);
});

test('CR 6: anything that skips a turn is hard whatever its name; Slow (speed only) is soft', () => {
    const g = hallFight();
    assert.strictEqual(g.controlClass('Slow', 'skip_turn'), 'hard');
    assert.strictEqual(g.controlClass('Slow', 'slow'), 'soft');
    assert.strictEqual(g.controlClass('Some New Status', 'skip_turn'), 'hard', 'no data entry needed to be hard');
    for (const name of ['Blind', 'Pin', 'Taunt', 'Bleed', 'Expose', 'Soul Chain']) assert.strictEqual(g.controlClass(name, g.statusDef(name).type), null, name);
    const t = rat(g);
    apply(g, t, 'Slow', 'skip_turn', 1);
    assert.strictEqual(t.cr.value, 35, 'a turn-skipping "Slow" gains like hard control');
    apply(g, g.combat.enemies[0], 'Slow', 'slow', 2, 0.5);
    assert.strictEqual(g.combat.enemies[0].cr.value, 20);
});

test('CR 7: a failed Confuse roll adds nothing; a Confuse that skips the turn adds the hard 35', () => {
    const g = hallFight();
    const t = rat(g);
    const confuse = (value) => g.castSkill(g.player, { name: 'Test Confuse', effects: [{ type: 'skip_turn_chance', value, duration: 1 }], target: 'enemy_single' }, [t]);
    confuse(0);
    assert.ok(!g.findStatus(t, 'Confused'));
    assert.strictEqual(g.crValue(t), 0);
    confuse(1);
    assert.ok(g.findStatus(t, 'Confused'));
    assert.strictEqual(t.cr.value, 35);
    // (A retarget-only Confuse doesn't exist in the engine; it would be soft through statusDefinitions.)
});

test('CR 8: decays 10 per holder opportunity without new control, a skipped one too, never below 0; Haste bonus actions don\'t decay', () => {
    const g = hallFight();
    const t = rat(g);
    apply(g, t, 'Stun', 'skip_turn', 2);                      // 35, two skipped turns
    const values = [];
    for (let i = 0; i < 6; i++) { g.do('attack 1'); values.push(t.cr.value); }
    // turn 1 skipped (control landed since the last one: no decay), turn 2 skipped (no new control: decays), then acting turns
    assert.deepStrictEqual(values, [35, 25, 15, 5, 0, 0]);
    // player: one opportunity with a Haste bonus action decays once
    g.crState(g.player).value = 50;
    g.combat.extraTurn = true;
    g.do('attack 1');
    assert.match(g.text(), /You act again/);
    assert.strictEqual(g.player.cr.value, 50, 'the bonus action is not an opportunity end');
    g.do('attack 1');
    assert.strictEqual(g.player.cr.value, 40);
});

test('CR 9: one cast with two control effects gives one (largest) gain from one snapshot; later casts gain again', () => {
    const g = hallFight();
    const t = rat(g);
    g.crState(t).value = 40;
    const both = { name: 'Test Double Control', effects: [{ type: 'stun', duration: 2 }, { type: 'silence', duration: 2 }], target: 'enemy_single' };
    g.castSkill(g.player, both, [t]);
    assert.strictEqual(t.cr.value, 75, '40 + 35 once, not 40 + 35 + 20');
    assert.strictEqual(g.findStatus(t, 'Stun').duration, 2);
    assert.strictEqual(g.findStatus(t, 'Silence').duration, 2, 'the second effect uses the pre-cast CR (40), not 75');
    g.castSkill(g.player, { name: 'Test Silence', effects: [{ type: 'silence', duration: 2 }], target: 'enemy_single' }, [t]);
    assert.strictEqual(g.findStatus(t, 'Silence').duration, 1, 'a new cast sees CR 75: capped');
    assert.strictEqual(t.cr.value, 95, 'and gains again');
    assert.strictEqual(g.combat.currentCastId, null, 'the cast id is cleared after the cast');
    // soft first, hard second in one cast: the gain is topped up to the hard 35, once
    const u = g.combat.enemies[0];
    g.castSkill(g.player, { name: 'Test Soft Then Hard', effects: [{ type: 'silence', duration: 1 }, { type: 'stun', duration: 1 }], target: 'enemy_single' }, [u]);
    assert.strictEqual(u.cr.value, 35);
});

test('CR 10: Cleanse removes the status but not the CR; explicit immunity blocks the gain; damage and DoTs don\'t touch CR', () => {
    const g = hallFight();
    const t = rat(g);
    stun(g, t);
    g.cleanse(t, { statuses: ['Stun'] });
    assert.ok(!g.findStatus(t, 'Stun'));
    assert.strictEqual(t.cr.value, 35, 'cleansing keeps accrued CR');
    t.statusAffinities = { Stun: 'immune' };
    assert.strictEqual(stun(g, t), null);
    assert.strictEqual(t.cr.value, 35, 'immune: no gain');
    const u = g.combat.enemies[0];
    g.applyDot(g.player, u, { name: 'Bleed', value: 2, duration: 2 });
    apply(g, u, 'Blind', 'blind', 2, 0.25);
    g.damage(u, 5, g.player);
    assert.strictEqual(g.crValue(u), 0);
    assert.strictEqual(u.cr, undefined, 'no CR state was even created');
});

test('CR 11: availability reports CR resistance as an on-hit outcome (still enabled), and act() agrees', () => {
    const g = gameWith((d) => { d.enemies.rust_rat.hp = d.enemies.rust_rat.maxHp = 999; });
    g.do('warrior', 'add_xp 250', 'vanguard');
    g.player.spd = 40;
    g.do('n', 'engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.resource.current = 3;
    const t = rat(g);
    g.crState(t).value = 100;
    const bashOpt = () => g.getAvailableActions().actions.find((o) => o.skillId === 'Shield Bash');
    const target = bashOpt().targets.find((x) => x.id === t.id);
    assert.ok(bashOpt().enabled && target.enabled, 'not refused');
    assert.deepStrictEqual(target.notes, [{ code: 'CONTROL_RESISTED', message: 'Control Resistance 100: Stun will be resisted.' }]);
    assert.ok(!bashOpt().targets.find((x) => x.id === 'enemy_0').notes, 'no note at CR 0');
    const r = g.act({ type: 'skill', skillId: 'Shield Bash', targetId: t.id });
    assert.ok(r.ok);
    assert.match(r.events.map((e) => e.text).join('\n'), /Rust Rat resists Stun! \(Control Resistance 100\)/);
    assert.ok(!t.shieldBashRecovery, 'no lockout from a resisted stun');
});

test('CR 12: multi-target freeze resolves per target; CR state saves, rolls back and replays deterministically', () => {
    const g = hallFight();
    const [a, b, c] = g.combat.enemies;
    g.crState(b).value = 60; g.crState(c).value = 85;
    g.castSkill(g.player, { name: 'Test Freeze', effects: [{ type: 'freeze_enemies', duration: 2 }], target: 'all_enemies' }, [a, b, c]);
    assert.deepStrictEqual([a, b, c].map((x) => (g.findStatus(x, 'Frozen in time') || {}).duration || 0), [2, 1, 0]);
    assert.deepStrictEqual([a, b, c].map((x) => x.cr.value), [35, 95, 85]);
    // rollback: a command that fails after control landed leaves CR exactly as it was
    const before = JSON.stringify([g.player, ...g.combat.enemies].map((x) => x.cr || null));
    const orig = g.castSkillEffects;
    g.castSkillEffects = function (caster, skill, targets) {
        this.applyStatus(caster, targets[0], { name: 'Stun', type: 'skip_turn', duration: 1 });
        throw new Error('boom');
    };
    assert.strictEqual(g.act({ type: 'attack', targetId: 'enemy_0' }).error.code, 'INTERNAL_ERROR');
    g.castSkillEffects = orig;
    assert.strictEqual(JSON.stringify([g.player, ...g.combat.enemies].map((x) => x.cr || null)), before, 'rolled back');
    // snapshot/restore and replay: the copy keeps counting identically
    const copy = newGame(1);
    copy.restore(g.snapshot());
    for (const x of [copy, g]) { x.act({ type: 'attack', targetId: 'enemy_0' }); x.act({ type: 'attack', targetId: 'enemy_0' }); }
    assert.strictEqual(copy.snapshot().json, g.snapshot().json);
    const run = () => {
        const h = hallFight();
        for (let i = 0; i < 8; i++) { apply(h, rat(h), 'Stun', 'skip_turn', 2); h.do('attack 1'); }
        return JSON.stringify([h.getState().combat, h.log]);
    };
    assert.strictEqual(run(), run(), 'same inputs, same CR history and log');
});
