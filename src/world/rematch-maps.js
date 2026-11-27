/* =========================================================================
 * Enso's Last Stand — WORLD: where beaten bosses can be fought again (docs/design/BESTIARY_CODEX_REMATCH.md)
 * Space only. For each boss: the map it fell on, the tile where a ring of black feathers lies once it has fallen
 * and the crow is with you (the ring is a story station, `rematch_<key>`, its talk in src/story/codex.js), and the
 * tile where the remembered boss stands up (beside where it first stood: the first encounter keeps its own tile) (encounter `rematch_<key>`, shown while the flag `rematch:<key>` is set).
 * No new areas: every ring is in the arena the boss was fought in (the area-art rule).
 *
 * The remembered boss drops ordinary spoils the first time it is beaten again (elite rank, no second authored
 * boss reward); its trophy is kept in the Bestiary (src/engine/codex.js).
 * zone1.js adds these to the maps, after Chapter One and Two are in.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    // key: the boss's enemy key. ring / at: tiles. enemies: the fight as it is remembered (boss first).
    const PLACES = [
        { key: 'crow_touched_warden', map: 'sanctuary', ring: { x: 13, y: 7 }, at: { x: 11, y: 4 }, enemies: ['crow_touched_warden'], sprite: 'warden', loot: { lootLevel: 3, lootTable: 'chapter1' } },
        { key: 'heaven_doorwarden', map: 'kloster_inner', ring: { x: 17, y: 15 }, at: { x: 19, y: 14 }, enemies: ['heaven_doorwarden'], sprite: 'warden', loot: { lootLevel: 5, lootTable: 'chapter1' } },
        { key: 'binding_echo', map: 'gullstrand_coast', ring: { x: 30, y: 9 }, at: { x: 29, y: 8 }, enemies: ['binding_echo'], sprite: 'shade', loot: { lootLevel: 4, lootTable: 'chapter1' } },
        { key: 'bjarki_grave_bound', map: 'bjarki_barrow', ring: { x: 22, y: 10 }, at: { x: 18, y: 10 }, enemies: ['bjarki_grave_bound'], sprite: 'warden', loot: { lootLevel: 4, lootTable: 'chapter1' } },
        { key: 'peat_king', map: 'jarnmyr', ring: { x: 12, y: 26 }, at: { x: 9, y: 25 }, enemies: ['peat_king', 'mire_dead', 'mire_dead'], sprite: 'ghoul', loot: { lootLevel: 3, lootTable: 'chapter1' } },
        { key: 'lucifero', map: 'underworld_arena', ring: { x: 16, y: 10 }, at: { x: 13, y: 8 }, enemies: ['lucifero'], sprite: 'warden', loot: { lootLevel: 5, lootTable: 'chapter1' } },
        { key: 'beelzebub', map: 'dominion_beelzebub', ring: { x: 16, y: 10 }, at: { x: 13, y: 8 }, enemies: ['beelzebub'], sprite: 'warden', loot: { lootLevel: 6, lootTable: 'chapter1' } },
        { key: 'slotos', map: 'dominion_slotos', ring: { x: 16, y: 10 }, at: { x: 13, y: 8 }, enemies: ['slotos'], sprite: 'warden', loot: { lootLevel: 6, lootTable: 'chapter1' } },
        { key: 'plumede', map: 'dominion_plumede', ring: { x: 16, y: 10 }, at: { x: 13, y: 8 }, enemies: ['plumede'], sprite: 'warden', loot: { lootLevel: 6, lootTable: 'chapter1' } }
    ];

    /** Put the rings and the remembered fights on `maps`. `codex` (src/story/codex.js) gives names and when each fell. */
    function addRematches(maps, codex) {
        if (!codex) return;
        for (const p of PLACES) {
            const r = codex.rematches[p.key], map = maps[p.map];
            if (!r || !map) continue;
            // The ring shows once the boss has fallen in the story and the crow is with you (it is the crow's memory).
            const fell = { ...(r.beaten || {}), flags: ['aspect_nahemoth', ...((r.beaten || {}).flags || [])] };
            map.interactables.push({ id: `rematch_ring_${p.key}`, kind: 'station', station: `rematch_${p.key}`, x: p.ring.x, y: p.ring.y,
                name: 'Ring of black feathers', sprite: 'feather_ring', verb: 'Look at', when: fell });
            const boss = { lootRank: 'elite', lootProfile: 'guardian', ...p.loot };
            map.encounters.push({ id: `rematch_${p.key}`, x: p.at.x, y: p.at.y, name: r.name, enemies: p.enemies.slice(), trigger: 'contact', sprite: p.sprite,
                detect: 240, when: { flags: [`rematch:${p.key}`] }, loot: p.enemies.map((_, i) => (i ? null : boss)),
                text: `The feathers lift and turn, and ${r.name.replace(/^The /, 'the ')} stands where it fell, as you remember it.` });
        }
    }

    const api = { PLACES, addRematches };
    (ENSO.world || (ENSO.world = {})).rematchMaps = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
