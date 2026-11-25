/* =========================================================================
 * Enso's Last Stand — BESTIARY, LORE CODEX AND BOSS REMATCHES (Wick + Pixie + Hawk, 2026-11-25)
 * docs/design/BESTIARY_CODEX_REMATCH.md. Pure data: src/engine/codex.js reads it, ui/world-ui.js shows it.
 *
 * Every line here retells something the player has already been shown in the game (lore bible part 1, and the
 * shipped Chapter Two text). Nothing [mid] or [late] goes in. A lore entry opens when its `unlock` condition holds
 * (a story condition, src/engine/story.js storyAllows: flags, quests, seen: ['talk:elian'] ...).
 *
 * bestiary { enemyKey: { region, kind, lore, more?: [{ if, text }] } }   in the order the Journal shows them
 *     region  'vale' | 'north' | 'dominions'   (the Bestiary's three pages)
 *     kind    what the player would call it: Beast, Vermin, Undead, Spirit, Person, Demon...
 *     more    extra lines that open with the story (Bran's name only after his burial).
 * lore [{ id, group, title, text, unlock }]
 * bosses { enemyKey: { epithet } }   the name card's second line when the fight starts
 * rematches { bossKey: { name, where, level, beaten, trophy: { name, text } } }   beaten: the story condition that says it fell
 *     The crow remembers every fight it has seen. Where a boss fell, once the crow is with you, a ring of black
 *     feathers lets you fight it again as it was, grown to your level (level = the level it was built for).
 *     Space (where the ring and the remembered fight stand) lives in src/world/rematch-maps.js.
 * npcs  the feather rings' talk, one per boss (stations in the world: { kind: 'station', station: 'rematch_<key>' }).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const bestiary = {
        // ---- Blackbriar Vale -------------------------------------------------------------
        rust_rat: { region: 'vale', kind: 'Vermin', lore: 'Rats with fur the colour of an old nail, living in the long grass by the footbridge and in the wrecks on the tollway. Their bite goes bad in the wound.' },
        weak_goblin: { region: 'vale', kind: 'Goblin', lore: 'Thin goblins who pick through what travellers leave on the Broken Tollway. More hungry than cruel. They run when a fight turns against them.' },
        bone_gnawer: { region: 'vale', kind: 'Undead', lore: 'Something bony that gnaws at cart wheels in the tollway wreckage. Someone smeared ash round one of those wheels in a circle, left open at the top.' },
        hungry_wolf: { region: 'vale', kind: 'Beast', lore: 'A gaunt grey wolf who leads a pack at the crossroads on the Overgrown Road. The pack goes where it goes.' },
        pack_wolf: { region: 'vale', kind: 'Beast', lore: 'Lean grey wolves that hunt in a circle around their leader. Their meat cooks well enough.' },
        drunken_shade: { region: 'vale', kind: 'Spirit', lore: 'Pale shapes that sway in the spray of the falls by Shamefield\'s mill, arm in arm, singing a festival song with most of the words wrong. One of them wears a miller\'s apron.' },
        watch_constable: { region: 'vale', kind: 'Person', lore: 'Shamefield\'s watch. They are doing their job, and their job is mostly telling people to move along.' },
        cult_acolyte: { region: 'vale', kind: 'Broken Oath', lore: 'Grey-robed members of the Broken Oath who keep bowls of ash and scrape a circle, left open at the top, into stone. They throw fire from a distance.' },
        cult_zealot: { region: 'vale', kind: 'Broken Oath', lore: 'The Broken Oath\'s fighters, in ash-red, with flails. They came for the Festival of the Sun with trestles and chains.' },
        oath_sergeant: { region: 'vale', kind: 'Broken Oath', lore: 'Sergeant Kess, the Ash-Marked: a grey-haired soldier in an old Crown coat with an ash circle on the sleeve, keeping a ledger of crates at the orchard. Very calm. Draws anyway.' },
        carrion_crow: { region: 'vale', kind: 'Beast', lore: 'Crows on the Featherwatch path with eyes the wrong red. They are not the Warden\'s birds any more: the cult has been feeding them.' },
        shackled_ghoul_stronger: { region: 'vale', kind: 'Undead', lore: 'A ghoul scarred with ritual cuts, dragging a snapped chain. The Broken Oath chains the war dead and cuts them like this.' },
        crow_touched_warden: { region: 'vale', kind: 'Keeper', lore: 'The Warden of Featherwatch. He kept one seal and many crows, rebuilt their cages from old prison bars, and mended a boy\'s arm without taking a coin. He was given the key and told never to use it.',
            more: [{ if: { flags: ['bran_buried'] }, text: 'His name, stitched inside his collar, was Bran Ashdown. It is on the top stone of his cairn now, in your hand.' }] },
        heaven_doorwarden: { region: 'vale', kind: 'Seraph', lore: 'Aurevain, Warden of the Altar: something in gilded plate with four wings folded and a spear of light. It keeps Heaven\'s altar now that Caelith does not, and it wants the coal back.' },
        // ---- Hrimvald ----------------------------------------------------------------------
        wolfbanner_raider: { region: 'north', kind: 'Wolf-Banner', lore: 'Torvald Redhand\'s crews, in madder-red wool under the running wolf. On the pass they tipped the biers out onto the road. They were not robbing the dead. They were looking for something.' },
        wolfbanner_skirmisher: { region: 'north', kind: 'Wolf-Banner', lore: 'Wolf-Banner spearmen who hold a spear the way a man holds something he throws, and keep their distance while they do it.' },
        wolfbanner_ringleader: { region: 'north', kind: 'Wolf-Banner', lore: 'Ulfrun Grey-Mantle: a broad woman with a wolf pelt over her mail and a two-hand axe. She closed Frostspine Pass to southerners.' },
        ulfhednar: { region: 'north', kind: 'Wolf-Coat', lore: 'Men who wear whole wolf skins with the heads pulled over their own like hoods. They squat round fires of cart-boards on the pass road and get up grinning.' },
        sunscorched_wolf: { region: 'north', kind: 'Beast', lore: 'Coast wolves singed white along the back, panting as if it were midsummer, with eyes the colour of noon. They guard the bright cave on Gullstrand.' },
        moonless_wolf: { region: 'north', kind: 'Beast', lore: 'Wolves with no light in them at all, only the shape of wolves cut out of the evening. They come out of the dark hollow on Gullstrand.' },
        binding_echo: { region: 'north', kind: 'Spirit', lore: 'A coil of chain turning over the ring on Gullstrand, links of sunlight and links of no light, wound into something with no face. Not a wolf. The thing that held one.' },
        drowned_oarsman: { region: 'north', kind: 'Undead', lore: 'Men who walk up out of the surf as if they had only been wading, weed in their hair, eyes white as salt, each with an oar like a spear. They wait by the boats for a crew that is not coming.' },
        bog_light: { region: 'north', kind: 'Spirit', lore: 'Green lights over the Járnmyr boardwalk at the height of a lantern in a hand. There is no hand.' },
        mire_dead: { region: 'north', kind: 'Undead', lore: 'Bodies that stand up out of the red water of Járnmyr, dark as old leather, and come on dripping.' },
        peat_king: { region: 'north', kind: 'Undead', lore: 'The Man in the Peat: he sat up out of the deep cut slowly, the way a sleeper sits up, his hair gone red and a plaited cord round his throat. The cut went down past the peat for ore.' },
        grave_foreman: { region: 'north', kind: 'Person', lore: 'Hallgeir Spade, who leans on his spade with a list while his men cut turf on the Silent Field. "Not the field rites, lads. The field\'s rites. Dig."' },
        mound_bride: { region: 'north', kind: 'Spirit', lore: 'A woman in a bride\'s crown of birch twigs among the Birkholt stones. When she turns there is nothing in the crown but cold, and she reaches for what you carry.' },
        skuli_tally_hand: { region: 'north', kind: 'Person', lore: 'Skuli Tally-Hand keeps the Wolf-Banner camp\'s accounts and claims the table they are written on.' },
        old_greymane: { region: 'north', kind: 'Beast', lore: 'A she-wolf as big as a calf, white at the muzzle, one ear torn to a stub. She does not growl. She has done this before.' },
        draugr: { region: 'north', kind: 'Undead', lore: 'Bjarki\'s hearth-men, still in the mail and with the shields they were buried with. They turn to face you together, the way they were taught. Radiant blows hit them harder.' },
        draugr_champion: { region: 'north', kind: 'Undead', lore: 'Hrolf Shield-Bearer: a big man behind a shield of black oak, pulled out of the barrow wall with eyes like cold coals.' },
        grave_ward: { region: 'north', kind: 'Spirit', lore: 'The fire in each burial anchor of Bjarki\'s barrow stands up beside him as a ward. Put out the anchors and fewer stand.' },
        bjarki_grave_bound: { region: 'north', kind: 'Undead', lore: 'Bjarki the Grave-Bound sat up in his coffin and kept on standing: mail, a helm, a shield as broad as a cart wheel and a sword black with grave-earth. The fires lean toward him when he speaks.' },
        // ---- The Dominions -----------------------------------------------------------------
        hell_imp: { region: 'dominions', kind: 'Demon', lore: 'Imps the size of children who flick cinders at each other until they see you, and grin.' },
        ash_hound: { region: 'dominions', kind: 'Demon', lore: 'Hounds that climb out of the lava with their pelts still smoking.' },
        brimstone_brute: { region: 'dominions', kind: 'Demon', lore: 'Something heavy that hauls itself out of the floor with yellow crystal growing out of its shoulders like a crust. Imps hide behind its legs.' },
        lucifero: { region: 'dominions', kind: 'Ruler', lore: 'Ruler of the First Dominion. Starless black, crowned with nothing, and the floor leans toward him. Bound, he kneels in the circle.' },
        rift_stalker: { region: 'dominions', kind: 'Demon', lore: 'Thin shapes that stand where there was nothing. When you blink they are somewhere else, and closer.' },
        beelzebub: { region: 'dominions', kind: 'Ruler', lore: 'Ruler of the Second Dominion: a figure in violet glass with a cloud of black flies turning round his head. The far side of the room is suddenly the near side.' },
        iron_carapace: { region: 'dominions', kind: 'Demon', lore: 'A beetle the size of a cart that backs out of the slag pits and turns its armoured front to you.' },
        slotos: { region: 'dominions', kind: 'Ruler', lore: 'Ruler of the Third Dominion: a slab of slag-iron, tusked and ridged, covered in hammer marks. None of them have dented it.' },
        feather_shrike: { region: 'dominions', kind: 'Demon', lore: 'Black birds with hooked beaks that drop out of the wind onto the Fourth Dominion\'s ledge.' },
        plumede: { region: 'dominions', kind: 'Ruler', lore: 'Ruler of the Fourth Dominion: a slender figure in a cloak of black feathers who lands without a sound and is moving before you have seen her land.' }
    };

    // The lore codex: what the player has learned, written down. Short, concrete, from what they were shown.
    const lore = [
        // ---- You ----
        { id: 'waking', group: 'You', title: 'The waking', unlock: { quests: { Q01: 'active+' } },
            text: 'You woke in a cellar with no memory and hands that glow. Carved over you: "...WHO SLEEPS HERE IS NOT TO BE...". Someone tried to scratch it out.' },
        { id: 'house', group: 'You', title: 'The house on the ridge', unlock: { quests: { Q02: 'active+' } },
            text: 'The kitchen table is set for two. Under the grass runs old masonry, and the cornerstone is far too big for a farmhouse.' },
        { id: 'first_memory', group: 'You', title: 'The first memory', unlock: { flags: ['aspect_nahemoth'] },
            text: 'A balcony over a festival street hung with lanterns. A calm voice gives an order. The lanterns go out, and the street is empty.' },
        { id: 'nahemoth', group: 'You', title: 'Nahemoth, the crow', unlock: { flags: ['aspect_nahemoth'] },
            text: 'The crow that woke when the first seal opened calls itself Nahemoth, the First Shell: "the part of the world that remembers where you have stepped". It remembers every fight it has seen, and will show you one again where it happened.' },
        // ---- Blackbriar Vale ----
        { id: 'old_crown', group: 'Blackbriar Vale', title: 'The old crown', unlock: { seen: ['talk:elian'] },
            text: 'The old lord is dead and his crown is broken, a year ago now. Nobody says his name; it is bad luck. Whole streets emptied when he gave the word.' },
        { id: 'sworn_band', group: 'Blackbriar Vale', title: 'The Sworn Band', unlock: { seen: ['talk:elian'] },
            text: 'The heroes were a sworn band. The bravest carried the sun banner. They broke the lord\'s guard at the gates, then broke him. Their sign is a sun breaking a crown.' },
        { id: 'memorial', group: 'Blackbriar Vale', title: 'The memorial stone', unlock: { seen: ['inspect:village_memorial'] },
            text: 'In Shamefield: "FOR THOSE TAKEN UNDER THE OLD CROWN". No names. The list was too long to carve.' },
        { id: 'shamefield', group: 'Blackbriar Vale', title: 'Shamefield', unlock: { seen: ['enter:shamefield'] },
            text: 'The village\'s name is an old joke: people shamed for something work the field until they earn their name back. This year it holds the Festival of the Sun for the victory, one year on.' },
        { id: 'kloster', group: 'Blackbriar Vale', title: 'The Kloster', unlock: { any: [{ seen: ['enter:briarwell_cloister_court'] }, { seen: ['enter:kloster_inner'] }] },
            text: 'The brothers and sisters of Briarwell brew, bake, mill and bury. Their charter to keep a granary "for the living, and against the winter" is older than the old crown. Their bell once rang for an hour without stopping.' },
        { id: 'caelith', group: 'Blackbriar Vale', title: 'Caelith and the live coal', unlock: { flags: ['seraph_met'] },
            text: 'The courtyard statue is Caelith, a seraph who kept Heaven\'s altar fire. Below, the winter did not end. Caelith carried one live coal down, and spring ran down the hill. Heaven called it a sin and threw Caelith after the coal. On the altar step someone carved HE FELL FOR US.' },
        { id: 'broken_oath', group: 'Blackbriar Vale', title: 'The Broken Oath', unlock: { any: [{ flags: ['corvin_met'] }, { quests: { 'C1-N02': 'active+' } }] },
            text: 'Grey robes, bowls of ash, chants, and a circle left open at the top scraped into stone: in the cellar, on the dead tree, in the well. They chain ghouls with ritual cuts. Corvin Sere leads them; Sergeant Kess held the orchard for him.' },
        { id: 'seal', group: 'Blackbriar Vale', title: 'The first seal', unlock: { flags: ['crow_warden_memory_key'] },
            text: 'A ring of black stone in the Warden\'s wall, a circle left open at the top, with no handle and no keyhole. Only a hollow the shape of a feather. The Warden had the key and was told never to use it.' },
        { id: 'warden', group: 'Blackbriar Vale', title: 'The Warden', unlock: { flags: ['warden_dead'] },
            text: 'He kept the seal, fed the crows and splinted their wings, and wrote it all down. His last entry: "Someone has woken in the old house. The crows saw. Keep the seal."' },
        { id: 'bran', group: 'Blackbriar Vale', title: 'Bran Ashdown', unlock: { flags: ['bran_buried'] },
            text: 'Stitched inside the Warden\'s collar, small and careful: BRAN ASHDOWN. You scratched it into the top stone of his cairn. A gray crow with a crooked wing sits on it.' },
        { id: 'orin', group: 'Blackbriar Vale', title: 'Orin Vale', unlock: { flags: ['orin_met'] },
            text: 'A mason who came through when the seal broke, black grit still on his sleeves. "Old things hear that sort of noise." He says the foundations at the house are older than the village.' },
        // ---- Hrimvald ----
        { id: 'silent_field', group: 'Hrimvald', title: 'The Silent Field', unlock: { any: [{ quests: { C202: 'active+' } }, { flags: ['anchor:silent_field'] }] },
            text: 'Twenty winters ago six hundred marched out to the Silent Field. By evening they were gone: not dead on the grass, just gone. The old songs say the choosers of the slain came down that night and found nobody to choose.' },
        { id: 'name_boards', group: 'Hrimvald', title: 'The name boards', unlock: { any: [{ flags: ['eydis_met'] }, { flags: ['eydis_harbor_met'] }] },
            text: 'Each steading cut its people\'s names on boards the morning the host marched. Their families can no longer say those names without the boards. Eydis Namesinger keeps them as the Roll, and the Wolf-Banner has been taking them.' },
        { id: 'grave_ale', group: 'Hrimvald', title: 'The grave-ale', unlock: { any: [{ flags: ['heard_of_succession'] }, { flags: ['ragnhild_met'] }] },
            text: 'No body, so no grave-ale; no grave-ale, so no heir. Jarl Eirik\'s high seat has stood empty twenty winters, and six hundred households wait on the same law.' },
        { id: 'ragnhild_torvald', group: 'Hrimvald', title: 'Ragnhild and Torvald', unlock: { flags: ['ragnhild_met', 'torvald_met'] },
            text: 'Ragnhild holds Hrafnholm and wants the Thing to declare the six hundred dead, so their widows can mourn like widows. Torvald Redhand, whose brother Arni marched with them, says you cannot drink the grave-ale of a man who is not dead.' },
        { id: 'the_thing', group: 'Hrimvald', title: 'The Thing', unlock: { flags: ['thing_sat'] },
            text: 'The assembly heard both sides and gave its verdict: not yet. You sat as the Thing\'s witness.' },
        { id: 'hallvard', group: 'Hrimvald', title: 'Hallvard the One-Handed', unlock: { flags: ['heard_of_hallvard'] },
            text: 'Jarl Eirik\'s skald, and the only one who walked off the Silent Field. Every other witness was a wagon boy or a wife on the ridge.' },
        { id: 'fenrir', group: 'Hrimvald', title: 'The bound wolf', unlock: { flags: ['fenrir_quest_discovered'] },
            text: 'On Gullstrand a wolf of the sun and a wolf of the moon hunt, and a stone ring holds a coil of chain that once held something greater than either.' },
        // ---- Below ----
        { id: 'james', group: 'Below', title: 'James', unlock: { flags: ['james_met'] },
            text: 'A bard with a lute and riddles. "James is the name I use when travelling."',
            more: [{ if: { flags: ['demonkore_revealed'] }, text: '"Demonkore is the name they remember."' }] },
        { id: 'dominions', group: 'Below', title: 'The Dominions', unlock: { flags: ['underworld_opened'] },
            text: 'Beside the homestead well the air hangs folded like cloth, and a stair goes down into warm red dark: a great round floor, and rulers who kneel in the binding circle once beaten.' }
    ];

    // The name card's second line when a boss fight starts. Never a name the player has not earned (Bran is "the Warden").
    const bosses = {
        crow_touched_warden: { epithet: 'Keeper of the First Seal' },
        heaven_doorwarden: { epithet: 'Warden of the Altar' },
        binding_echo: { epithet: 'What Held the Wolf' },
        bjarki_grave_bound: { epithet: 'Who Sleeps Under the Mound' },
        peat_king: { epithet: 'Risen from the Deep Cut' },
        lucifero: { epithet: 'Ruler of the First Dominion' },
        beelzebub: { epithet: 'Ruler of the Second Dominion' },
        slotos: { epithet: 'Ruler of the Third Dominion' },
        plumede: { epithet: 'Ruler of the Fourth Dominion' }
    };

    // Boss rematches: the crow remembers. `level` is the level the boss was built for; above it the remembered boss
    // grows with you (actionRules.rematch.scale), so a rematch is never a walkover. Trophies are kept in the Bestiary.
    const rematches = {
        crow_touched_warden: { name: 'The Crow-Touched Warden', where: "The Warden's Sanctuary", level: 4, beaten: { flags: ['warden_dead'] },
            trophy: { name: 'Crooked Feather', text: 'A grey feather with a kink in it, from the crow that sits on the cairn. It let you take it.' } },
        heaven_doorwarden: { name: 'Aurevain, Warden of the Altar', where: 'Briarwell Kloster, the inner court', level: 10, beaten: { flags: ['seraph_trial_won'] },
            trophy: { name: 'Ember of the Altar', text: 'A spark that does not go out, cupped in a scorch mark on your palm. It does not burn you. You are not sure why.' } },
        binding_echo: { name: 'The Binding Echo', where: 'Gullstrand Coast, the stone ring', level: 7, beaten: { flags: ['fenrir_trial_cleared'] },
            trophy: { name: 'Link of Two Lights', text: 'One link of the chain, half sunlight and half dark.' } },
        bjarki_grave_bound: { name: 'Bjarki the Grave-Bound', where: "Bjarki's Barrow", level: 7, beaten: { flags: ['bjarki_laid'] },
            trophy: { name: 'Grave-Earth Rivet', text: 'A rivet from a shield as broad as a cart wheel, black with the earth it was buried in.' } },
        peat_king: { name: 'The Man in the Peat', where: 'Járnmyr, the deep cut', level: 6, beaten: { flags: ['peat_king_laid'] },
            trophy: { name: 'Bog-Iron Pin', text: 'A cloak pin of bog iron, rusted red, that came up out of the cut with him.' } },
        lucifero: { name: 'Lucifero', where: 'The First Dominion', level: 7, beaten: { flags: ['underworld_ruler_beaten'] },
            trophy: { name: 'Starless Shard', text: 'A sliver of black with no light in it, which always falls the same way up.' } },
        beelzebub: { name: 'Beelzebub', where: 'The Second Dominion', level: 7, beaten: { flags: ['beelzebub_ruler_beaten'] },
            trophy: { name: 'Violet Glass Fly', text: 'A fly of violet glass. When you look away it is somewhere else in your pack.' } },
        slotos: { name: 'Slotos', where: 'The Third Dominion', level: 7, beaten: { flags: ['slotos_ruler_beaten'] },
            trophy: { name: 'Undented Plate', text: 'A plate of slag-iron off his hide. Your best blow is the only mark on it.' } },
        plumede: { name: 'Plumede', where: 'The Fourth Dominion', level: 7, beaten: { flags: ['plumede_ruler_beaten'] },
            trophy: { name: 'Silent Plume', text: 'A black feather that makes no sound when it falls, however you drop it.' } }
    };

    // The feather rings: one story "station" per boss. The crow's voice (dry, never kind about it).
    const npcs = {};
    for (const [key, r] of Object.entries(rematches)) {
        const fight = { rematch: key };
        const mid = r.name.replace(/^The /, 'the ');   // "fell where the Crow-Touched Warden fell", mid-sentence
        npcs[`rematch_${key}`] = {
            name: 'Ring of black feathers', title: r.where,
            talk: [{ node: 'ring' }],
            nodes: {
                ring: {
                    lines: [[null, `A ring of black feathers lies where ${mid} fell. The crow lands in the middle of it and cocks its head at you.`],
                        ['crow', key === 'crow_touched_warden' ? "I remember this one. Every step. I'd rather not, but I do." : 'I remember this fight. Every blow of it. I can show it to you again, as strong as you are now.']],
                    choices: [{ text: `Remember the fight. (Fight ${mid} again)`, effects: [fight], end: true }, { text: 'Leave it.', end: true }]
                }
            }
        };
    }

    const codex = { bestiary, lore, bosses, rematches, npcs };
    (ENSO.story || (ENSO.story = {})).codex = codex;
    if (isNode) module.exports = codex;
})(typeof window !== 'undefined' ? window : globalThis);
