/* Headless tests for the engine. Run:  node tests/run-tests.js  (or: npm test)
 * Only some files:  node tests/run-tests.js qa1 rogue   (substring match on the file name)
 * No dependencies. Every test uses a fixed seed, so results are repeatable.
 * Tests live in tests/NN-area.test.js (shared helpers: tests/helpers.js); files run in NN order. */
const fs = require('fs');
const path = require('path');
const { tests } = require('./helpers.js');

const filters = process.argv.slice(2);
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort()
    .filter((f) => !filters.length || filters.some((x) => f.includes(x)));
if (!files.length) { console.log(`No test files match: ${filters.join(' ')}`); process.exit(1); }
for (const f of files) require(path.join(__dirname, f));

let failed = 0;
for (const t of tests) {
    try { t.fn(); console.log(`  ✓ ${t.name}`); }
    catch (err) { failed++; console.log(`  ✗ ${t.name}\n      ${err.message.split('\n').join('\n      ')}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
