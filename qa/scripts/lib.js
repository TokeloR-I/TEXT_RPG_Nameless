// QA scratch helpers. Never touches the repo; data changes go on a deep copy.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..'); // repo root (was /home/claude/enso in the QA workspace)
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const baseData = require(path.join(ROOT, 'src/data.js'));

const { registry } = require(path.join(ROOT, 'src/effects.js'));

function game(seed = 1, mutate, effects) {
    let data = baseData;
    if (mutate) { data = JSON.parse(JSON.stringify(baseData)); mutate(data); }
    const g = new GameEngine({ seed, data, effects: effects || registry });
    g.log = [];
    const push = (evs) => { for (const e of evs) if (e.type === 'text') g.log.push(e.text); };
    push(g.start());
    g.cmds = [];
    g.do = (...cs) => { for (const c of cs) { g.cmds.push(c); push(g.input(c)); } return g; };
    g.text = () => g.log.join('\n');
    g.since = (n) => g.log.slice(n).join('\n');
    g.drain = () => push(g.flush());
    return g;
}
const enemy = (g, key) => g.combat.enemies.find((e) => e.key === key);
module.exports = { game, enemy, baseData, GameEngine, ROOT, registry };
