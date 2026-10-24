// Art pipeline (Keel's engine decision rev 2, P0): packing PNG and Tiled files into JS, the Tiled map loader,
// atlas cell lookup and the 32 -> 16 px map converter.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { test, assert } = require('./helpers.js');
const { pack, pngSize } = require('../tools/pack-assets.js');
const { fromTiled, artCell } = require('../src/world/tiled.js');
const { doubleWorld, doubleStory, doubleMap } = require('../src/world/scale16.js');
const { validateWorld, WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const data = require('../src/data.js');
const story = require('../src/story/chapter1.js');

/** A real (tiny, solid colour) PNG, so the packer is tested on the format it will see. */
function png(w, h) {
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, body) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
        const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(tb));
        return Buffer.concat([len, tb, c]);
    };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 4, 0x80)])));
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('Art pipeline: the packer turns PNGs and Tiled JSON into one script of data URIs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enso-pack-'));
    fs.mkdirSync(path.join(dir, 'tiles'));
    fs.writeFileSync(path.join(dir, 'tiles', 'village.png'), png(64, 32));
    fs.writeFileSync(path.join(dir, 'maps.json'), JSON.stringify({ width: 1, height: 1 }));
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'ignored');
    assert.deepStrictEqual(pngSize(png(48, 16)), { w: 48, h: 16 });
    const { source, keys, problems } = pack(dir);
    assert.deepStrictEqual(problems, []);
    assert.deepStrictEqual(keys, ['maps', 'tiles/village']);
    const sandbox = {}; sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox);
    const A = sandbox.ENSO.packedAssets;
    assert.strictEqual(A['tiles/village'].w, 64);
    assert.strictEqual(A['tiles/village'].h, 32);
    assert.ok(A['tiles/village'].uri.startsWith('data:image/png;base64,iVBORw0KGgo'));
    assert.strictEqual(A.maps.type, 'tiled');
    assert.strictEqual(pack(dir).source, source, 'packing twice gives the same file');
    fs.writeFileSync(path.join(dir, 'broken.png'), 'not a png');
    assert.ok(pack(dir).problems.some((p) => p.includes('broken.png')));
    fs.rmSync(dir, { recursive: true });
});

test('Art pipeline: the packed assets file in the repo is up to date with assets/src', () => {
    const { source } = pack(path.join(__dirname, '..', 'assets', 'src'));
    assert.strictEqual(fs.readFileSync(path.join(__dirname, '..', 'assets', 'packed', 'assets.js'), 'utf8'), source, 'run `npm run pack`');
});

// A 6 x 5 Tiled map: grass everywhere, a stone wall ring, one boulder (collision only) and a roof overhead.
const prop = (name, value) => ({ name, type: typeof value === 'number' ? 'int' : 'string', value });
function tiledMap() {
    const W = 6, H = 5, grid = (f) => Array.from({ length: W * H }, (_, i) => f(i % W, Math.floor(i / W)));
    const edge = (x, y) => x === 0 || y === 0 || x === W - 1 || y === H - 1;
    return {
        width: W, height: H, tilewidth: 16, tileheight: 16,
        properties: [prop('name', 'Test Yard'), prop('zoneId', 'test_zone'), prop('ambient', '{"tint":"rgba(0,0,0,0.1)"}')],
        tilesets: [{
            firstgid: 1, name: 'village', image: '../tiles/village.png', columns: 4, tilecount: 8, tilewidth: 16, tileheight: 16,
            tiles: [{ id: 0, properties: [prop('name', 'grass')] }, { id: 1, properties: [prop('tile', '#')] }, { id: 2, properties: [] }]
        }],
        layers: [
            { type: 'tilelayer', name: 'ground', width: W, height: H, data: grid(() => 1) },
            { type: 'tilelayer', name: 'walls', width: W, height: H, data: grid((x, y) => (edge(x, y) ? 2 : 0)) },
            { type: 'tilelayer', name: 'overhead', width: W, height: H, data: grid((x, y) => (y === 1 && x === 2 ? 0x80000003 : 0)) },
            { type: 'tilelayer', name: 'collision', width: W, height: H, data: grid((x, y) => (edge(x, y) || (x === 4 && y === 3) ? 3 : 0)) },
            {
                type: 'objectgroup', name: 'objects', objects: [
                    { id: 1, name: 'start', class: 'spawn', x: 16, y: 16, point: true, properties: [prop('facing', 'right')] },
                    { id: 7, name: 'gate', class: 'spawn', x: 64, y: 32, point: true, properties: [prop('facing', 'right')] },
                    { id: 2, name: 'yard_gate', class: 'exit', x: 80, y: 32, width: 16, height: 16, properties: [prop('toMap', 'yard'), prop('toSpawn', 'gate'), prop('trigger', 'interact'), prop('prompt', 'Leave')] },
                    { id: 3, name: 'yard_sign', class: 'inspect', x: 16, y: 48, width: 16, height: 16, properties: [prop('text', 'A sign.')] },
                    { id: 4, name: 'Rats', class: 'encounter', x: 32, y: 48, width: 16, height: 16, properties: [prop('id', 'yard_rats'), prop('enemies', 'rust_rat, rust_rat'), prop('sprite', 'rats')] },
                    { id: 5, class: 'light', x: 16, y: 48, point: true, properties: [prop('radius', 2), prop('color', 'rgba(255,150,60,0.3)')] },
                    { id: 6, name: 'yard_notice', class: 'boundary', x: 16, y: 16, width: 32, height: 16, properties: [prop('title', 'Yard'), prop('text', 'The yard.')] }
                ]
            }
        ]
    };
}

test('Art pipeline: a Tiled map loads into the world format, with collision and objects', () => {
    const { map, errors } = fromTiled(tiledMap(), ZONE1.tileset);
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(map.name, 'Test Yard');
    assert.deepStrictEqual(map.ambient, { tint: 'rgba(0,0,0,0.1)' }, 'JSON properties are parsed');
    assert.strictEqual(map.tiles[0], '######');
    assert.strictEqual(map.tiles[2][2], ',');
    const boulder = map.tiles[3][4];
    assert.notStrictEqual(boulder, ',', 'a collision-only cell gets its own legend entry');
    assert.deepStrictEqual(map.legend[boulder], { name: 'grass', solid: true });
    assert.deepStrictEqual(map.spawns.start, { x: 1, y: 1, facing: 'right' });
    assert.deepStrictEqual(map.exits[0], { id: 'yard_gate', x: 5, y: 2, trigger: 'interact', toMap: 'yard', toSpawn: 'gate', prompt: 'Leave' });
    assert.deepStrictEqual(map.encounters[0].enemies, ['rust_rat', 'rust_rat']);
    assert.strictEqual(map.encounters[0].id, 'yard_rats');
    assert.strictEqual(map.interactables[0].kind, 'inspect');
    assert.deepStrictEqual(map.lights[0], { x: 1, y: 3, radius: 2, color: 'rgba(255,150,60,0.3)' });
    assert.deepStrictEqual([map.boundaries[0].w, map.boundaries[0].h], [2, 1]);
    assert.deepStrictEqual(Object.keys(map.art.layers), ['ground', 'walls', 'overhead']);
    assert.strictEqual(map.art.tilesets[0].asset, 'village');

    // It is a real map: the world validator accepts it and you can walk on it.
    const world = { tileset: ZONE1.tileset, zones: { test_zone: { name: 'Test', mapIds: ['yard'] } }, maps: { yard: { ...map, zoneId: 'test_zone' } }, start: { map: 'yard', spawn: 'start' } };
    assert.deepStrictEqual(validateWorld(world, data), []);
    const s = new WorldSession(world);
    assert.strictEqual(s.move('up').type, 'blocked', 'the wall ring is solid');
    assert.strictEqual(s.move('down').type, 'moved');
    s.x = 3; s.y = 3;
    assert.strictEqual(s.move('right').type, 'blocked', 'the boulder from the collision layer is solid');
});

test('Art pipeline: bad Tiled objects and tiles are reported, not guessed', () => {
    const t = tiledMap();
    t.layers[4].objects.push({ id: 9, name: 'odd', class: 'teleporter', x: 0, y: 0, point: true });
    t.tilesets[0].tiles.push({ id: 3, properties: [prop('name', 'lava')] });
    t.layers[0].data[7] = 4;
    const { errors } = fromTiled(t, ZONE1.tileset);
    assert.ok(errors.some((e) => e.includes("class 'teleporter'")));
    assert.ok(errors.some((e) => e.includes("unknown tile 'lava'")));
});

test('Art pipeline: atlas cells come from the gid, with the horizontal flip flag', () => {
    const art = { tileSize: 16, tilesets: [{ firstgid: 1, columns: 4, tilecount: 8, asset: 'village' }, { firstgid: 9, columns: 2, tilecount: 4, asset: 'props' }] };
    assert.deepStrictEqual(artCell(art, 6), { asset: 'village', sx: 16, sy: 16, flipX: false });
    assert.deepStrictEqual(artCell(art, 12), { asset: 'props', sx: 16, sy: 16, flipX: false });
    assert.strictEqual(artCell(art, 0x80000001).flipX, true);
    assert.strictEqual(artCell(art, 0), null);
});

test('Art pipeline: the 32 -> 16 px converter keeps every map valid and every place the same', () => {
    const w16 = doubleWorld(ZONE1);
    assert.deepStrictEqual(validateWorld(w16, data, doubleStory(story)), []);
    const grounds = ZONE1.maps.grounds, g16 = w16.maps.grounds;
    assert.strictEqual(g16.tileSize, 16);
    assert.strictEqual(g16.tiles.length, grounds.tiles.length * 2);
    assert.strictEqual(g16.tiles[0].length, grounds.tiles[0].length * 2);
    for (const [k, sp] of Object.entries(grounds.spawns)) assert.ok(Math.floor(g16.spawns[k].x / 2) === sp.x && Math.floor(g16.spawns[k].y / 2) === sp.y, `spawn ${k} stays in its block`);
    const exit = grounds.exits[0];
    assert.strictEqual(g16.exits.filter((e) => e.id.split('__')[0] === exit.id).length, 4, 'a doorway stays one doorway wide');
    const marker = doubleStory(story).quests.Q01.objectives[0].marker;
    assert.deepStrictEqual([marker.x, marker.y], [story.quests.Q01.objectives[0].marker.x * 2, story.quests.Q01.objectives[0].marker.y * 2]);
    assert.strictEqual(doubleMap(g16), g16, 'a 16 px map is left alone');
    const s = new WorldSession(w16);
    assert.ok(['moved', 'blocked'].includes(s.move('down').type));
});
