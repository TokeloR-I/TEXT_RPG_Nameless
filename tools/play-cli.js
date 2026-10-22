/* Play the game in a terminal (same engine as the browser).
 *   node tools/play-cli.js            random seed
 *   node tools/play-cli.js --seed 42  repeatable run (great for reproducing bugs) */
const readline = require('readline');
const { GameEngine } = require('../src/engine.js');

const seedArg = process.argv.indexOf('--seed');
const seed = seedArg > -1 ? parseInt(process.argv[seedArg + 1], 10) : undefined;
const engine = new GameEngine({ seed });

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
function print(events) {
    for (const e of events) {
        if (e.type === 'clear') console.log('\n' + '─'.repeat(60));
        else console.log(e.important ? `\x1b[1;33m${strip(e.text)}\x1b[0m` : strip(e.text));
    }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\n> ' });
print(engine.start());
rl.prompt();
rl.on('line', (line) => {
    if (line.trim() === 'exit') return rl.close();
    print(engine.input(line));
    rl.prompt();
});
