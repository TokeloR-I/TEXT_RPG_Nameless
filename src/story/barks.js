/* =========================================================================
 * Enso's Last Stand — AMBIENT BARKS (Wick, 2026-11-25)
 * One-line things people say aloud when you walk past (a speech bubble over them, never a dialogue box).
 * BARKS { npcId: [ { say, if? } ] }   `if` is a story condition (src/engine/story.js storyAllows): flags, notFlags,
 *       quests ({ 'Q01': 'complete' | 'active' | 'active+' }), className ('warrior'|'rogue'|'mage'|'necromancer'), ...
 * Keep each line under 60 characters. Pure data; ui/world-ui.js picks one that its condition allows.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const barks = {
        // ---- Chapter One: Shamefield, the Kloster, the roads of Blackbriar Vale ----
        bragg: [
            { say: "Coin's coin. Want an edge put on something?" },
            { say: "Iron's three times what it was. Three times!" },
            { say: "Under the crown, a cart came up every week." },
            { say: "That blade's had a hard life. Bring it here.", if: { className: 'warrior' } }
        ],
        corvin: [
            { say: "Thirty-eight links. Thirty-nine. Who cut this?" },
            { say: "The old order kept these roads safe. Ask anyone." },
            { say: "Keep that hand in your pocket, stranger." },
            { say: "Back again. Persistent. I value that.", if: { flags: ['corvin_met'] } }
        ],
        elian: [
            { say: "I keep a list of names. It keeps getting longer." },
            { say: "Fog's lifting. Or I'm getting used to it." },
            { say: "The goblins won't come this side of the water.", if: { notFlags: ['elian_in_village'] } },
            { say: "Shamefield's bell is louder than I remembered.", if: { flags: ['elian_in_village'] } }
        ],
        fenric: [
            { say: "Every cask is younger than it thinks it is." },
            { say: "Bread is only beer that gave up too soon." },
            { say: "The water, the soil, or my enemies. One of them.", if: { quests: { SF2: 'active' } } },
            { say: "Rats. I still haven't told Oda. Don't you.", if: { quests: { SF2: 'complete' } } }
        ],
        greta: [
            { say: "If it was a pig, I've an opinion on it." },
            { say: "Smoked shoulder, fresh today. Well. This week." },
            { say: "Tell them Greta has crusts. They'll come home.", if: { quests: { SF3: 'active' } } },
            { say: "Not one word of apology from those pigs.", if: { quests: { SF3: 'complete' } } }
        ],
        iona: [
            { say: "Feverfew, yarrow, willow bark. Keep going." },
            { say: "The watch counts every packet. Every one." },
            { say: "You'll want willow bark. Your sort always does.", if: { className: 'warrior' } },
            { say: "His burn salve beats mine. Don't repeat that.", if: { flags: ['shane_recruited'] } }
        ],
        kess: [
            { say: "Twenty-two years a Crown sergeant. Look at me." },
            { say: "Keep that hand where I can see it." },
            { say: "Corvin fed us. I keep telling myself that." }
        ],
        mara: [
            { say: "Supplies are scarce. Look closely." },
            { say: "Count it twice. I always do." },
            { say: "I know every cart on this road. Lately, fewer." },
            { say: "Hands where I can see them, please.", if: { className: 'rogue' } }
        ],
        merrow: [
            { say: "Barley to the brewery, rye to the ovens." },
            { say: "The red-cord sacks are for nobody. Still no." },
            { say: "I keep the granary. Mostly I keep saying no." },
            { say: "Your barley bed won't weed itself.", if: { quests: { SF1: 'active' } } }
        ],
        oath_courier: [
            { say: "Keep walking. I'm nobody." },
            { say: "The orchard gate. Just get to the orchard gate." },
            { say: "Don't look at me. Don't look at the satchel." }
        ],
        oda: [
            { say: "Don't touch, it's hot. Everything's hot." },
            { say: "Hear that crack? That's my loaf." },
            { say: "A roll on its own is half a meal." },
            { say: "Loaf in my oven, cask in his. Then we'll see.", if: { quests: { SF1: 'active' } } }
        ],
        orin: [
            { say: "One stone at a time." },
            { say: "These foundations are older than the village." },
            { say: "Strong back. Ever carried stone?", if: { className: 'warrior' } },
            { say: "A gate with no wall is a polite suggestion.", if: { built: ['homestead_gate'] } }
        ],
        scavenger: [
            { say: "Just stones. Just sorting stones." },
            { say: "Dressed stone sells. Don't ask who's buying." },
            { say: "That mark. On the stone, and now on you." }
        ],
        shane: [
            { say: "Shame doesn't pay my debts. Never has." },
            { say: "You look healthy. That's bad for business." },
            { say: "Chant louder. I can't hear my debts.", if: { notFlags: ['shane_recruited'] } },
            { say: "Finest stall for three miles. Also the only one.", if: { flags: ['shane_recruited'] } }
        ],
        tamsin: [
            { say: "We're still here. More than many can say." },
            { say: "Mara's on the square, Bragg's by the inn." },
            { say: "Nobody hears the names hungry. That's the rule.", if: { quests: { 'C1-N03': 'active' } } },
            { say: "He mended my grandson's arm. Took no coin.", if: { flags: ['tamsin_mourned'] } }
        ],
        watch_captain: [
            { say: "Keep the peace and we'll get along. *hic*" },
            { say: "Walking is outside my job description." },
            { say: "Gate's shut. Bring me that register.", if: { quests: { Q05: 'active' } } },
            { say: "Got my eye on you. Both eyes. Eventually.", if: { className: 'rogue' } }
        ],

        // ---- Chapter Two: Hrimvald (Skeldvik, Hrafnholm, Birkholt, Jarnmyr, Gullstrand, Runadal) ----
        arnkel: [
            { say: "I say the law from memory. Again, from the top." },
            { say: "I take no sides. Stop offering me one." },
            { say: "The households are nearly in. Not long now.", if: { quests: { C203: 'active' } } },
            { say: "The law was said. What you do with it is yours.", if: { flags: ['thing_heard'] } }
        ],
        asger: [
            { say: "Three days on the kiln. Mustn't let it flare." },
            { say: "Mostly foxes, at night. Mostly." },
            { say: "You walk like a fox. I notice foxes.", if: { className: 'rogue' } },
            { say: "Kilns are quiet tonight. Just the kilns, I hope.", if: { flags: ['clue_collier'] } }
        ],
        aslaug: [
            { say: "Mead from my casks, gossip from everyone's." },
            { say: "Fire's free. Stand by it, you look frozen." },
            { say: "Steel on the peg while you drink, friend.", if: { className: 'warrior' } }
        ],
        bersi: [
            { say: "The Sea-Hare isn't going anywhere. Nor am I." },
            { say: "Good mast. Paid for in herring that never came." },
            { say: "Thirty in silver. I count it in my sleep.", if: { quests: { 'C2-S04': 'active' } } },
            { say: "She'll sail come spring. Mark my words.", if: { quests: { 'C2-S04': 'complete' } } }
        ],
        bjorn: [
            { say: "Forty families eat because these hammers go." },
            { say: "Mind the sparks. They don't care whose coat." },
            { say: "Let me see that edge. Hm. Bring it back later.", if: { className: 'warrior' } },
            { say: "Forge is open to you. Don't make me regret it.", if: { flags: ['jarnmyr_forge_open'] } }
        ],
        brynja: [
            { say: "Mind the net, it bites." },
            { say: "Not selling salt? Then what brings you down?" },
            { say: "Heard the headland howl? So did the wolves.", if: { quests: { CL1: 'active' } } },
            { say: "I can hear the sea from the headland now.", if: { flags: ['fenrir_heir_awakened'] } }
        ],
        eydis: [
            { say: "Every name I say aloud stays said." },
            { say: "Skalds remember for a living. I'd rather not." },
            { say: "When the Thing sits, I read them all.", if: { quests: { C203: 'active' } } },
            { say: "They heard the names. That was the point.", if: { flags: ['thing_heard'] } }
        ],
        eyvind: [
            { say: "Mending the pen. Slowly. Very slowly." },
            { say: "Gran's watching, isn't she? Don't tell me." },
            { say: "Bride? What bride? Never heard her.", if: { quests: { 'C2-S06': 'active' } } }
        ],
        geir: [
            { say: "Mind the oars, stranger." },
            { say: "I steer. The rest isn't mine to answer for." },
            { say: "To the six hundred. And to my brother." }
        ],
        gudrun: [
            { say: "Mutton from my fell, skyr from my cows!" },
            { say: "Buy something, so the walk down was worth it." },
            { say: "Long way down for the Thing. Longer back up." }
        ],
        gunnhild: [
            { say: "Easy, girls. It's only a stranger." },
            { say: "Two ewes gone, and not a sound. Not one." },
            { say: "Whatever it is, the fence doesn't slow it.", if: { quests: { 'C2-S07': 'active' } } },
            { say: "Full count tonight. I counted twice.", if: { quests: { 'C2-S07': 'complete' } } }
        ],
        hakon: [
            { say: "A carter carries his own hearth." },
            { say: "Wrist's mending. Slower than I'd like." },
            { say: "Sixty years of sailcloth, tipped out like turnips.", if: { notFlags: ['caravan_saved'] } },
            { say: "Asta's home in Birkholt. That's what matters.", if: { flags: ['caravan_saved'] } }
        ],
        halli: [
            { say: "Don't talk to me, I'm losing." },
            { say: "An hour in the corner. Finish it, Sveinn!" },
            { say: "If you're watching, watch him, not me." }
        ],
        hild: [
            { say: "After the Thing. Everything's after the Thing." },
            { say: "Twenty winters of 'not yet'." },
            { say: "Have you heard Kolgrim yet? Hear us both.", if: { quests: { 'C2-S02': 'active' } } },
            { say: "I said his name this morning. Twice.", if: { quests: { 'C2-S02': 'complete' } } }
        ],
        james: [
            { say: "Not one skald will teach a southerner." },
            { say: "Fishermen don't tip. Fishermen never tip.", if: { notFlags: ['james_recruited'] } },
            { say: "A bard with no lute is just a man who hums.", if: { notFlags: ['james_lute_recovered'] } },
            { say: "Better acoustics than the Stormtide, this.", if: { flags: ['james_settled'] } }
        ],
        ketil: [
            { say: "Fifty years I've rowed out of this cove." },
            { say: "Tide's turning. I'll mind the boats." },
            { say: "I know every man this sea took. Not those.", if: { quests: { 'C2-S11': 'active' } } },
            { say: "Low tide, and nobody on the shingle. Good.", if: { quests: { 'C2-S11': 'complete' } } }
        ],
        kolgrim: [
            { say: "Shields higher. Higher!" },
            { say: "Want to fight? Pick up a spear." },
            { say: "I hold it for him. Like a man's cloak." },
            { say: "Hild sent you, didn't she?", if: { quests: { 'C2-S02': 'active' } } }
        ],
        leif: [
            { say: "Hold this end. No, the other end." },
            { say: "I build ships. I don't sail them." },
            { say: "Wind's off the land tonight. Good.", if: { quests: { C2S1: 'complete' } } }
        ],
        oddny: [
            { say: "Mind the stacks; they fall on strangers." },
            { say: "Peat for every hearth from here to Birkholt." },
            { say: "Lights on the mire again. I'm not looking.", if: { quests: { 'C2-S03': 'active' } } },
            { say: "No lights since. Bjorn calls me a witch.", if: { flags: ['mire_reburied'] } }
        ],
        osric: [
            { say: "At your service, and at everyone else's." },
            { say: "Everyone owes someone. A fine year for it." },
            { say: "Wool, amber, and whatever you forgot you need." },
            { say: "Settled accounts. I do love a settled account.", if: { quests: { 'C2-S04': 'complete' } } }
        ],
        ragna: [
            { say: "Mind the ewes, they're jumpy." },
            { say: "Eyvind! That pen won't mend itself!" },
            { say: "Weeping at the stones again last night.", if: { quests: { 'C2-S06': 'active' } } },
            { say: "Quiet at the stones. The ewes slept.", if: { quests: { 'C2-S06': 'complete' } } }
        ],
        ragnhild: [
            { say: "Guests eat at this hall's tables. Eat, then." },
            { say: "Twenty years I've held this seat." },
            { say: "The Thing sits when the Lawspeaker calls it.", if: { quests: { C203: 'active' } } },
            { say: "The law was said. Now we live with it.", if: { flags: ['thing_heard'] } }
        ],
        runa: [
            { say: "Look at the memorial, not at her." },
            { say: "Sworn to Sigrun. That's all you need to know." },
            { say: "My father asks if I've eaten. Every time." }
        ],
        sigrid: [
            { say: "Over, under. Over, under." },
            { say: "Asta would hate a fuss. So I weave." },
            { say: "Madder yarn and her pattern stick, that's all.", if: { quests: { 'C2-S01': 'active' } } },
            { say: "The sail's done. She'd have found a fault.", if: { quests: { 'C2-S01': 'complete' } } }
        ],
        sigrun: [
            { say: "Everyone says I'm the heir. Please don't." },
            { say: "Middle board, top row. Spelled wrong." },
            { say: "Best day in years, and Mother's still cross.", if: { flags: ['thing_heard'] } }
        ],
        solveig: [
            { say: "Cod by the pair! Herring by the cask!" },
            { say: "Opinions free. Fish, not." },
            { say: "Their whole ship is weeping. Lovely sound.", if: { quests: { C2S1: 'complete' } } }
        ],
        steinar: [
            { say: "Walk where you like. Don't touch the horses." },
            { say: "Big tent's his. Mind the guy ropes." },
            { say: "Good stance. Wasted on the south.", if: { className: 'warrior' } },
            { say: "Skuli's gone. Nobody here is sorry.", if: { flags: ['skuli_beaten'] } }
        ],
        sveinn: [
            { say: "Sit and watch. Just don't help him." },
            { say: "I'll finish it when he admits it's finished." },
            { say: "Your move, Halli. Still your move." }
        ],
        sven: [
            { say: "Buying or not? The wharf's wide either way." },
            { say: "Fair and square, that lute. Fair and square.", if: { notFlags: ['james_lute_recovered'] } },
            { say: "Miss that lute. Never could play it.", if: { flags: ['james_lute_recovered'] } },
            { say: "Fancy a roll of the dice, light-fingers?", if: { className: 'rogue' } }
        ],
        thora: [
            { say: "Pay your mooring. Sheathe your steel." },
            { say: "Ring the bell if you see fog before I do." },
            { say: "No law against a smell. I checked, twice.", if: { quests: { C2S1: 'complete' } } },
            { say: "Eight guards, and wolf-coats on the pass.", if: { quests: { 'C2-S12': 'active' } } }
        ],
        thorvi: [
            { say: "Bread for the stones. They're not in a hurry." },
            { say: "Long walk from Skeldvik. Longer with bread." },
            { say: "The stones don't eat it. The ravens do." }
        ],
        thyri: [
            { say: "Stand back from the mouth!" },
            { say: "Ore in the top, charcoal in the top." },
            { say: "Three furnaces this year. Odd year." },
            { say: "Bjorn will hear it. Better from you.", if: { flags: ['clue_bloomery'] } }
        ],
        torvald: [
            { say: "Stand somewhere, southerner." },
            { say: "Twenty winters of 'wait'. I'm done waiting." },
            { say: "You hold that like you've used it. Good.", if: { className: 'warrior' } }
        ],
        ulfrun: [
            { say: "Southern manners, Redhand calls it." },
            { say: "Keep your distance in the yard. Habit." },
            { say: "You let me walk off the mountain. Why?", if: { flags: ['ulfrun_beaten'] } }
        ],
        vigdis: [
            { say: "Every block counted. Every wedge, every rope." },
            { say: "Mind the ledge. The pit's deeper than it looks." },
            { say: "My count's been wrong all winter.", if: { notFlags: ['clue_quarry'] } },
            { say: "Get my wedges back and I'll count them twice.", if: { flags: ['clue_quarry'] } }
        ],
        yrsa: [
            { say: "Sit, if your knees will let you." },
            { say: "They come up here when the dead won't keep quiet." },
            { say: "Keep your sparks off my drying herbs.", if: { className: 'mage' } },
            { say: "Mind your dead up here. Mine are touchy.", if: { className: 'necromancer' } }
        ]
    };
    (ENSO.story || (ENSO.story = {})).barks = barks;
    if (isNode) module.exports = barks;
})(typeof window !== 'undefined' ? window : globalThis);
