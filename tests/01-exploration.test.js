// Tests moved verbatim from the old tests/run-tests.js (section: class selection & exploring).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('every class can be picked and the room shows', () => {
    for (const cls of Object.keys(data.basePlayerClasses)) {
        const g = newGame().do(cls);
        assert.strictEqual(g.mode, 'explore');
        assert.strictEqual(g.player.className, cls);
        assert.match(g.text(), /STARTING ROOM/);
        assertHealthy(g);
    }
});

test('take works (adaptiveLoot crash fixed)', () => {
    const g = newGame().do('warrior', 'take grigamba stone');
    assert.ok(g.player.inventory.includes('Grigamba stone'));
    assertHealthy(g);
});

test('adaptiveLoot swaps items per class when defined', () => {
    const g = newGame();
    g.data = JSON.parse(JSON.stringify(data));
    g.data.adaptiveLoot['Grigamba stone'] = { mage: 'Grigamba focus crystal' };
    g.do('mage', 'take grigamba stone');
    assert.ok(g.player.inventory.includes('Grigamba focus crystal'));
});

test('movement with shortcuts', () => {
    const g = newGame().do('rogue', 'n');
    assert.strictEqual(g.currentRoom, 'hallway_of_chains');
    g.do('go south', 'east');
    assert.strictEqual(g.currentRoom, 'collapsed_wine_cellar');
});
