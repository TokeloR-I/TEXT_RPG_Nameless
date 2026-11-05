/* The six Shamefield favours (Get to Know the Locals, L01) played through the real world model, for route tests and QA.
 * Since Tokelo 2026-11-04 the Watch Captain keeps the orchard gate shut until they're done, so every mainline
 * route walks this. `io` gives the caller's own helpers: { say(re), bye(), fight(id), settle() }.
 * Starts anywhere after the register is handed over (Q05 complete); ends with L01 complete and the gate open. */
const H = require('../../tests/world-helpers');

function helpLocals(g, s, io) {
    const { say, bye, fight } = io;
    const settle = io.settle || (() => {});
    const talk = (id) => { settle(); const r = H.inspect(s, id); if (r.type !== 'talk') throw new Error(`${id}: ${JSON.stringify(r).slice(0, 200)}`); return r; };
    const done = (q) => { if (g.questState(q) !== 'complete') throw new Error(`${q} is ${g.questState(q)}`); };
    const go = (map) => { settle(); H.travel(s, map); };

    if (g.questState('L01') !== 'active') { talk('village_captain'); say(/I'll help them/); bye(); }

    // SF4 Singing at the Mill
    go('shamefield'); talk('village_tamsin'); say(/troubling the village/); bye();
    H.inspect(s, 'village_mill_bottles'); fight('mill_shade');
    talk('village_tamsin'); say(/mill is quiet/); bye(); done('SF4');
    // SF3 Pigs at Large
    go('village_residential_lane'); talk('lane_greta'); say(/lost some pigs/); bye();
    go('shamefield');
    for (const id of ['stray_pig_bridge', 'stray_pig_houses', 'stray_pig_church']) { settle(); H.inspect(s, id); }
    go('village_residential_lane'); talk('lane_greta'); say(/on their way home/); bye(); done('SF3');
    // SF5 Names for the Bell
    go('shamefield'); talk('village_elian'); say(/church/); bye();
    talk('village_church_door'); say(/Leave Elian's letter/);
    talk('village_elian'); say(/letter is at the church/); bye(); done('SF5');
    // SF2 The Brown Hops
    go('briarwell_cloister_court'); talk('cloister_fenric'); say(/hops look sick/); say(/find out what's eating/); bye();
    H.inspect(s, 'cloister_hops'); H.inspect(s, 'cloister_granary'); fight('cloister_rat_nest');
    talk('cloister_fenric'); say(/It was rats/); bye(); done('SF2');
    // SF1 Bread and Beer
    go('village_residential_lane'); talk('lane_oda'); say(/at it again/); bye();
    go('briarwell_cloister_court'); talk('cloister_merrow'); say(/garden bed/); say(/Dig Briarwell garden bed/); bye();
    talk('cloister_garden_bed'); say(/Plant the Barley Seed/); say(/Water and weed/); say(/Water and weed/); say(/Harvest the barley/); bye();
    go('shamefield'); settle(); H.inspect(s, 'village_wild_hops'); H.inspect(s, 'village_rye');
    talk('village_watermill'); say(/Grind the rye/); bye();
    go('briarwell_cloister_court'); talk('cloister_fenric'); say(/Brew a cask/); bye();
    go('village_residential_lane'); talk('lane_oda'); say(/Bake a rye loaf/); bye();
    go('briarwell_cloister_court'); talk('cloister_fenric'); say(/Oda baked you this/); bye();
    go('village_residential_lane'); talk('lane_oda'); say(/Fenric brewed you this/); bye(); done('SF1');
    // SF6 A Proper Meal: cook at the homestead hearth, eat it, tell Oda
    talk('lane_oda'); say(/eat like an animal/); bye();
    go('grounds'); talk('grounds_hearth'); say(/Cook Leberkäsbrötchen/); bye();
    const ate = g.act({ type: 'use_item', item: 'Leberkäsbrötchen' });
    if (!ate.ok) throw new Error(`eat: ${ate.error && ate.error.message}`);
    go('village_residential_lane'); talk('lane_oda'); say(/I cooked/); bye(); done('SF6');
    // Report: the Captain opens the gate
    go('shamefield'); talk('village_captain'); say(/I know the locals now/); bye(); done('L01');
    settle();
}

module.exports = { helpLocals };
