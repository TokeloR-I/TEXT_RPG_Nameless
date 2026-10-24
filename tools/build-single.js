/* Bundles each page + its stylesheet + all scripts into ONE file you can
 * double-click or send to someone:  node tools/build-single.js
 *   index.html  (classic text game)        -> dist/EnsosLastStand.html
 *   world.html  (graphical Zone 1 explorer) -> dist/EnsosLastStand-World.html */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const PAGES = [
    { page: 'index.html', out: 'EnsosLastStand.html' },
    { page: 'world.html', out: 'EnsosLastStand-World.html' }
];
const outName = Object.fromEntries(PAGES.map((p) => [p.page, p.out]));

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const { page, out } of PAGES) {
    let html = read(page);
    // fonts the stylesheet points at (url('assets/fonts/x.woff2')) are inlined, so the file still works on its own
    const inlineFonts = (css) => css.replace(/url\('(assets\/fonts\/[^']+\.woff2)'\)/g, (_, f) => `url('data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')}')`);
    html = html.replace(/<link rel="stylesheet" href="([^"]+\.css)">/g, (_, file) => `<style>\n${inlineFonts(read(file))}\n</style>`);
    html = html.replace(/<script src="((?:src|ui|assets)\/[^"]+)"><\/script>/g, (_, file) => `<script>\n${read(file).replace(/<\/script>/g, '<\\/script>')}\n</script>`);
    // Transparent VFX atlases must remain available in the offline single-file
    // graphical build. Inline the original SVG instead of requiring a network/file fetch.
    if (page === 'world.html') {
        const atlasPath = 'assets/vfx/nahemoth/black-flight-atlas.svg';
        const atlasData = 'data:image/svg+xml;base64,' +
            fs.readFileSync(path.join(root, atlasPath)).toString('base64');
        html = html.replace(atlasPath, atlasData);
    }
    // links between the pages point at their built names
    html = html.replace(/href="([a-z-]+\.html)"/g, (m, file) => (outName[file] ? `href="${outName[file]}"` : m));
    fs.writeFileSync(path.join(root, 'dist', out), html);
    console.log(`Built dist/${out} (${(html.length / 1024).toFixed(0)} KB)`);
}
