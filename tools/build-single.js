/* Bundles index.html + style.css + all scripts into ONE file you can
 * double-click or send to someone:  node tools/build-single.js  ->  dist/EnsosLastStand.html */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${read('style.css')}\n</style>`);
html = html.replace(/<script src="((?:src|ui)\/[^"]+)"><\/script>/g, (_, file) => `<script>\n${read(file).replace(/<\/script>/g, '<\\/script>')}\n</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'EnsosLastStand.html'), html);
console.log(`Built dist/EnsosLastStand.html (${(html.length / 1024).toFixed(0)} KB)`);
