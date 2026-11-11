/* The Broken Crown rework's story route north (C1-N02 The Ash on the Register), played through the real world model,
 * for route tests and QA (docs/design/CHAPTER_ONE_NARRATIVE_REWORK.md). Since 2026-11-11 the six Shamefield favours
 * are optional: proof of who forged the register's clearances opens the orchard gate instead.
 * `io` gives the caller's own helpers: { say(re), bye(), settle()? }. `how` is 'grab' (default) or 'follow'.
 * Starts anywhere in Shamefield after the register is handed over (Q05 complete); ends with the gate open
 * and C1-N04 An Oath in Ash active. meetCorvin() is that quest's talk at the foot of the climb. */
const H = require('../../tests/world-helpers');

function storyRouteNorth(g, s, io, how = 'grab') {
    const { say, bye } = io;
    const settle = io.settle || (() => {});
    const talk = (id) => { settle(); const r = H.inspect(s, id); if (r.type !== 'talk') throw new Error(`${id}: ${JSON.stringify(r).slice(0, 200)}`); return r; };
    if (s.mapId !== 'shamefield') { settle(); H.travel(s, 'shamefield'); }
    talk('village_elian'); say(/Do you know this seal/); bye();
    talk('village_oath_courier'); say(how === 'follow' ? /Let him run/ : /Grab him/); bye();
    talk('village_captain'); say(/go north/); bye();
    if (g.questState('C1-N02') !== 'complete') throw new Error(`C1-N02 is ${g.questState('C1-N02')}`);
}

/** C1-N04: talk to Corvin Sere at the foot of the Featherwatch climb and take one approach ('challenge' by default). */
function meetCorvin(g, s, io, approach = 'challenge') {
    const { say, bye } = io;
    const r = H.inspect(s, 'featherwatch_corvin');
    if (r.type !== 'talk') throw new Error(`featherwatch_corvin: ${JSON.stringify(r).slice(0, 200)}`);
    say({ challenge: /won't reach the Warden/, deceive: /watch sent me/, bargain: /want with the Warden/ }[approach]);
    bye();
}

module.exports = { storyRouteNorth, meetCorvin };
