// Crow tab view model (ui/crow-view.js, Pixie): Black Flight destinations and crow talk come only from the
// engine's getAvailableActions() options. The DOM is checked in the browser; these are the rules it follows.
const { test, assert } = require('./helpers.js');
const CV = require('../ui/crow-view.js');

const avail = (actions) => ({ awaiting: 'explore', actions });

test('Crow view: before the seal opens there are no crow options and the tab stays hidden', () => {
    const v = CV.crowView(avail([{ type: 'use_item', item: 'Bandages', enabled: true }]));
    assert.deepStrictEqual(v, { any: false, talk: null, flights: [] });
    assert.strictEqual(CV.crowView(null).any, false);
});

test('Crow view: destinations keep the engine\'s order with the place you are at first, and show its reasons', () => {
    const v = CV.crowView(avail([
        { type: 'talk_crow', enabled: true },
        { type: 'black_flight', anchorId: 'homestead', name: 'Forgotten Homestead', region: 'Blackbriar Vale', enabled: true },
        { type: 'black_flight', anchorId: 'shamefield', name: 'Shamefield Fountain', region: 'Blackbriar Vale', here: true, enabled: false, reason: { code: 'HERE' } },
        { type: 'black_flight', anchorId: 'roadstone', name: 'Repaired Roadstone', region: 'Blackbriar Vale', enabled: false, reason: { code: 'UNREACHABLE' } }
    ]));
    assert.ok(v.any);
    assert.deepStrictEqual(v.talk, { enabled: true, reason: '' });
    assert.deepStrictEqual(v.flights.map((f) => [f.anchorId, f.enabled, f.why]), [
        ['shamefield', false, 'You are here'],
        ['homestead', true, 'Blackbriar Vale'],
        ['roadstone', false, 'The crow cannot reach that perch yet']
    ]);
});

test('Crow view: the engine\'s own refusal text wins over the fallback words', () => {
    const v = CV.crowView(avail([
        { type: 'talk_crow', enabled: false, reason: { code: 'IN_COMBAT' } },
        { type: 'black_flight', anchorId: 'homestead', name: 'Forgotten Homestead', enabled: false, reason: { code: 'PURSUED', text: 'The wolves are still on your trail.' } }
    ]));
    assert.strictEqual(v.talk.reason, 'Not while fighting');
    assert.strictEqual(v.flights[0].why, 'The wolves are still on your trail.');
    assert.strictEqual(CV.confirmText({ name: 'Forgotten Homestead', region: 'Blackbriar Vale' }), 'Fly to Forgotten Homestead (Blackbriar Vale)?');
    assert.strictEqual(CV.confirmText({ name: 'Somewhere', region: '' }), 'Fly to Somewhere?');
});

test('Crow view: the portrait is a clean 16×16 grid in its five colours', () => {
    assert.strictEqual(CV.CROW_PORTRAIT.length, 16);
    for (const row of CV.CROW_PORTRAIT) assert.match(row, /^[ksebp.]{16}$/);
});
