const { test, assert, newGame } = require('./helpers.js');
function merchant(id = 'mara') {
    const g = newGame(84).do('warrior');
    g.act({ type: 'enter_world' });
    g.player.gold = 100;
    if (id === 'shane') g.story.flags.push('shane_recruited');
    g.act({ type: 'talk', npcId: id });
    const choice = g.getAvailableActions().actions.find(a => a.text === 'What have you got?');
    assert.ok(choice);
    g.act({ type: 'dialogue_choice', choiceId: choice.choiceId });
    return g;
}
test('merchant UI: all merchants expose stock after asking for goods', () => {
    for (const id of ['mara', 'bragg', 'iona', 'shane']) {
        const g = merchant(id);
        const before = g.snapshot().json;
        const a = g.getAvailableActions();
        assert.strictEqual(g.snapshot().json, before, 'availability is pure');
        assert.strictEqual(a.shop.shopId, id);
        assert.strictEqual(a.shop.gold, 100);
        assert.ok(a.shop.goods.length);
        for (const good of a.shop.goods) {
            assert.strictEqual(good.price, g.data.shopDefinitions[id].stock[good.item].buyPrice);
            assert.strictEqual(good.enabled, true);
        }
    }
});
test('merchant UI: buying in dialogue refreshes gold, stock and owned counts', () => {
    const g = merchant();
    const good = g.getAvailableActions().shop.goods[0];
    const a = { type: 'buy', shopId: good.shopId, item: good.item };
    assert.ok(g.act(a).ok);
    const updated = g.getAvailableActions().shop.goods[0];
    assert.strictEqual(g.player.gold, 100 - good.price);
    assert.strictEqual(updated.remaining, good.remaining - 1);
    assert.strictEqual(updated.owned, good.owned + 1);
    assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue');
    const saved = JSON.parse(JSON.stringify(g.serialize()));
    const copy = newGame(85).do('warrior');
    assert.ok(copy.load(saved).ok);
    assert.deepStrictEqual(copy.getAvailableActions().shop, g.getAvailableActions().shop);
});
test('merchant UI: unavailable purchases agree with engine refusals and change nothing', () => {
    const g = merchant();
    const first = g.getAvailableActions().shop.goods[0];
    const action = { type: 'buy', shopId: first.shopId, item: first.item };
    for (let i = 0; i < first.remaining; i++) assert.ok(g.act(action).ok);
    for (const gold of [100, 0]) {
        g.player.gold = gold;
        const good = g.getAvailableActions().shop.goods[0];
        assert.strictEqual(good.enabled, false);
        const before = JSON.stringify(g.player);
        const result = g.act(action);
        assert.strictEqual(result.ok, false);
        assert.deepStrictEqual(result.error, good.reason);
        assert.strictEqual(JSON.stringify(g.player), before);
    }
    assert.strictEqual(g.act({ ...action, shopId: 'bragg' }).ok, false);
    assert.ok(g.act({ type: 'dialogue_leave' }).ok);
    assert.strictEqual(g.story.dialogue, null);
});
test('merchant UI: menu selection buys, refreshes feedback and returns to dialogue', () => {
    const fs = require('fs'), vm = require('vm');
    const source = fs.readFileSync(require('path').join(__dirname, '../ui/world-ui.js'), 'utf8');
    const start = source.indexOf('    function renderShop(');
    const end = source.indexOf('    function drawTalk(', start);
    const g = merchant();
    let back = false, updates = 0;
    const root = { hidden: true, innerHTML: '', querySelector: () => null };
    const context = {
        engine: g, els: { dialog: root }, esc: String, menu: null,
        makeMenu: (items, options) => ({ items, index: 0, ...options }),
        menuHtml: () => '<ul class="shop-goods"></ul>', bindMenuClicks: () => {},
        updateHud: () => updates++, renderTalk: (_, conversationOnly) => { back = conversationOnly; }
    };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end), context);
    context.renderShop(g.getAvailableActions());
    const before = g.player.gold;
    const price = g.getAvailableActions().shop.goods[0].price;
    context.menu.items[0].action();
    assert.strictEqual(g.player.gold, before - price);
    assert.strictEqual(updates, 1);
    assert.ok(root.innerHTML.includes('Purchased'));
    assert.ok(root.innerHTML.includes(`${g.player.gold} Gold`));
    context.menu.back();
    assert.strictEqual(back, true);
});
