# Art sources (Keel's engine decision rev 2)

Put authored art here: PNG tile atlases and sprite sheets, and maps saved from [Tiled](https://www.mapeditor.org/) as JSON.
`npm run pack` turns everything in this folder into `assets/packed/assets.js` (data URIs, so the game still opens from disk
and the WebGL pass can read the pixels). Commit both. `npm test` fails if the packed file is out of date.

- **Keys** are the path without the extension: `tiles/village.png` becomes `ENSO.packedAssets['tiles/village']`.
- **Tile size** is 16×16. Characters are 24×32.
- **Tiled maps** (`src/world/tiled.js` explains each rule):
  - Layers are `ground`, `detail`, `walls`, `overhead` and `collision`, plus an `objects` object layer.
  - Give each tileset tile that means something to the rules a `name` property (a tile name such as `grass` or
    `stone_wall`) or a `tile` property (a tileset character such as `,`).
  - Give the tileset an `asset` property naming its packed image, or name the image file after it.
  - Objects use the Class field: `spawn`, `exit`, `inspect`, `pickup`, `npc`, `encounter`, `boundary` or `light`. Their
    custom properties are the same fields as in `src/world/zone1.js`.
- **Licences:** only art we may use commercially and edit. Keep the licence file next to the art.
