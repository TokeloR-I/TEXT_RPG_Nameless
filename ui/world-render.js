/* =========================================================================
 * Enso's Last Stand — WORLD RENDERER (canvas, no external files)
 * Draws a map, its objects and lighting from plain shapes, and the player from
 * layered sprite sheets (ui/sprites.js), so the game stays double-click playable. Tiles are painted by
 * name (see `tileset` in src/world/zone1.js); a map's static tiles are cached
 * on an offscreen canvas and only animated tiles are redrawn each frame.
 * Presentation only: it reads positions, it never changes game state.
 * ========================================================================= */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});

    // Small deterministic noise so every tile looks a little different but never flickers.
    const hash = (x, y, s = 0) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const ANIMATED = new Set(['water', 'tall_weeds', 'fireplace', 'rope', 'seal_door', 'lantern']);
    const WALLS = new Set(['stone_wall', 'wood_wall']);
    const EXTERIOR = new Set(['house_wall', 'house_window', 'roof', 'shed_wall', 'shed_roof', 'shed_door_shut']);

    function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
    function circle(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    function speckle(g, px, py, T, tx, ty, colours, n) {
        for (let i = 0; i < n; i++) {
            const r = hash(tx, ty, i + 11);
            rect(g, px + Math.floor(hash(tx, ty, i) * (T - 2)), py + Math.floor(hash(tx, ty, i + 5) * (T - 2)), 2, 2, colours[Math.floor(r * colours.length)]);
        }
    }

    // ---------------------------------------------------------------------
    // Tile painters: (g, px, py, T, ctx) where ctx = { tx, ty, name, below, above, time }
    // ---------------------------------------------------------------------
    const ground = {
        stone_floor(g, px, py, T, c) {
            rect(g, px, py, T, T, '#34323a');
            speckle(g, px, py, T, c.tx, c.ty, ['#2b2930', '#3e3c45', '#302e35'], 6);
            if (hash(c.tx, c.ty, 3) < 0.35) rect(g, px, py + T - 1, T, 1, '#2a282f');
        },
        wood_floor(g, px, py, T, c) {
            rect(g, px, py, T, T, '#4e3b2a');
            for (let i = 0; i < 4; i++) {
                const y = py + i * (T / 4);
                rect(g, px, y, T, 1, '#3f2f21');
                const seam = px + Math.floor(hash(c.tx, c.ty * 4 + i, 7) * T);
                rect(g, seam, y, 1, T / 4, '#3f2f21');
                if (hash(c.tx, c.ty * 4 + i, 9) < 0.5) rect(g, px + 2, y + 2, T - 4, 1, '#574330');
            }
        },
        grass(g, px, py, T, c) {
            rect(g, px, py, T, T, '#283d2b');
            for (let i = 0; i < 5; i++) {
                const x = px + Math.floor(hash(c.tx, c.ty, i) * (T - 3));
                const y = py + Math.floor(hash(c.tx, c.ty, i + 20) * (T - 4));
                rect(g, x, y, 1, 3, hash(c.tx, c.ty, i + 40) < 0.5 ? '#36503a' : '#20322a');
                rect(g, x + 2, y + 1, 1, 2, '#33493a');
            }
        },
        dirt_path(g, px, py, T, c) {
            rect(g, px, py, T, T, '#56483a');
            speckle(g, px, py, T, c.tx, c.ty, ['#4a3d30', '#655644', '#5d4f3e'], 7);
        },
        void(g, px, py, T) { rect(g, px, py, T, T, '#09090c'); },
        // Chapter One
        cobble(g, px, py, T, c) {
            rect(g, px, py, T, T, '#4a4744');
            for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
                const off = r % 2 ? 4 : 0;
                const x = px + k * 8 + off, y = py + r * 8;
                rect(g, x + 1, y + 1, 6, 6, hash(c.tx * 4 + k, c.ty * 4 + r, 5) < 0.5 ? '#5a5652' : '#524e4a');
            }
        },
        bridge(g, px, py, T, c) {
            rect(g, px, py, T, T, '#1b3140');
            rect(g, px + 3, py, T - 6, T, '#5c4630');
            for (let i = 0; i < 4; i++) rect(g, px + 3, py + i * 8 + 7, T - 6, 1, '#3e2e1f');
            rect(g, px + 1, py, 2, T, '#3e2e1f'); rect(g, px + T - 3, py, 2, T, '#3e2e1f');
            if (hash(c.tx, c.ty, 2) < 0.5) rect(g, px + 8, py + 9, 6, 2, '#1b3140');   // a missing plank
        }
    };
    // What each tile stands on, for tiles drawn as an object on top of a floor.
    const BASE = {
        barrel: 'stone_floor', crate: 'stone_floor', rubble: 'stone_floor', shelf: 'stone_floor', stairs_up: 'stone_floor', bedroll: 'stone_floor',
        counter: 'wood_floor', table: 'wood_floor', workbench: 'wood_floor', chair: 'wood_floor', armchair: 'wood_floor', bed: 'wood_floor', fireplace: 'wood_floor',
        rug: 'wood_floor', doorway: 'wood_floor', stairs_down: 'wood_floor',
        tall_weeds: 'grass', tree: 'grass', dead_tree: 'grass', fence: 'grass', rock: 'grass', well: 'grass', scarecrow: 'grass', water: 'grass',
        signpost: 'grass', rope: 'stone_floor',
        // Chapter One
        stall: 'cobble', notice_board: 'cobble', fruit_tree: 'grass', seal_door: 'stone_floor', cage: 'stone_floor',
        memorial: 'grass', wagon: 'grass', cart: 'grass',
        // Shamefield expansion (SHAMEFIELD_VILLAGE_MAP_AND_IMPLEMENTATION_HANDOFF.md)
        lantern: 'cobble', fountain: 'cobble', oven: 'cobble', hops: 'grass', sacks: 'cobble', pig: 'grass', cask: 'cobble', bell: 'cobble'
    };
    const painters = {
        // Shamefield expansion: market fountain, bread oven, hop trellis, half-timber walls, grain sacks, pigs, casks, bell
        fountain(g, px, py, T, c) {
            circle(g, px + T / 2, py + T / 2 + 2, T * 0.47, '#3a3a40');
            circle(g, px + T / 2, py + T / 2, T * 0.45, '#8a8890');
            circle(g, px + T / 2, py + T / 2, T * 0.36, '#2f5566');
            circle(g, px + T / 2, py + T / 2, T * 0.16, '#8a8890');
            rect(g, px + T / 2 - 2, py + 6, 4, T / 2 - 4, '#9a98a0');
            const k = Math.floor(c.time / 180) % 3;
            for (let i = 0; i < 3; i++) rect(g, px + 9 + i * 6, py + 10 + ((i + k) % 3) * 3, 1, 2, '#a8d0e0');   // splashing
        },
        oven(g, px, py, T, c) {
            circle(g, px + T / 2, py + 14, 13, '#8a6a52'); rect(g, px + 3, py + 14, T - 6, T - 16, '#8a6a52');
            for (let i = 0; i < 3; i++) rect(g, px + 5 + i * 8, py + 20, 6, 1, '#6a4e3a');
            circle(g, px + T / 2, py + 21, 6, '#1a0e08'); rect(g, px + T / 2 - 6, py + 21, 12, 7, '#1a0e08');
            const f = 0.5 + 0.5 * Math.sin(c.time / 140 + c.tx);
            rect(g, px + T / 2 - 4, py + 23, 8, 4, f > 0.5 ? '#e8902a' : '#c8601a');
            rect(g, px + T - 9, py + 1, 5, 7, '#5a4a40');                                                  // chimney
        },
        hops(g, px, py, T, c) {
            rect(g, px + 4, py, 2, T, '#5a4430'); rect(g, px + T - 6, py, 2, T, '#5a4430'); rect(g, px + 2, py + 2, T - 4, 2, '#5a4430');
            for (let i = 0; i < 6; i++) {
                const x = px + 7 + hash(c.tx, c.ty * 7 + i, 5) * (T - 14), y = py + 5 + i * 4;
                circle(g, x, y, 2.5, '#4a7a3a'); circle(g, x + 1, y + 1, 1.5, '#9ac06a');
            }
        },
        timber_wall(g, px, py, T, c) {
            rect(g, px, py, T, T, '#d8cfb6');                                                                  // plaster
            rect(g, px, py, T, 3, '#4a3426'); rect(g, px, py + T / 2 - 1, T, 3, '#4a3426'); rect(g, px, py + T - 3, T, 3, '#2a1e16');
            rect(g, px, py, 3, T, '#4a3426');
            g.strokeStyle = '#4a3426'; g.lineWidth = 2; g.beginPath();
            if ((c.tx + c.ty) % 2) { g.moveTo(px + 3, py + T / 2); g.lineTo(px + T, py + 3); } else { g.moveTo(px + 3, py + 3); g.lineTo(px + T, py + T / 2); }
            g.stroke();
            if (hash(c.tx, c.ty, 9) < 0.35) { rect(g, px + 10, py + T / 2 + 4, 12, 9, '#2a2018'); rect(g, px + 12, py + T / 2 + 6, 8, 5, '#3a4a5a'); }
        },
        sacks(g, px, py, T) {
            for (const [x, y] of [[8, 18], [20, 18], [14, 9]]) { circle(g, px + x, py + y, 7, '#b8a07a'); rect(g, px + x - 2, py + y - 8, 4, 3, '#8a744a'); }
        },
        pig(g, px, py, T, c) {
            const b = Math.sin(c.time / 300 + c.tx) * 0.8;
            g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(px + 16, py + 25, 9, 3, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + 8, py + 13 + b, 16, 10, '#d89a9a'); circle(g, px + 24, py + 16 + b, 5, '#d89a9a');
            rect(g, px + 27, py + 15 + b, 3, 3, '#b87a7a'); rect(g, px + 10, py + 22, 2, 4, '#b87a7a'); rect(g, px + 20, py + 22, 2, 4, '#b87a7a');
        },
        cask(g, px, py, T) {
            rect(g, px + 3, py + 10, T - 6, 16, '#6a4a2e'); circle(g, px + 6, py + 18, 8, '#6a4a2e'); circle(g, px + T - 6, py + 18, 8, '#6a4a2e');
            rect(g, px + 9, py + 10, 2, 16, '#3a3a40'); rect(g, px + T - 11, py + 10, 2, 16, '#3a3a40');
            circle(g, px + T - 6, py + 18, 4, '#8a6a4a'); rect(g, px + 12, py + 14, 8, 6, '#d8cfb6');                 // chalked label
        },
        bell(g, px, py, T) {
            rect(g, px + 4, py + 2, 3, T - 4, '#5a4430'); rect(g, px + T - 7, py + 2, 3, T - 4, '#5a4430'); rect(g, px + 2, py + 2, T - 4, 3, '#6b5238');
            g.fillStyle = '#a08a40'; g.beginPath(); g.moveTo(px + 10, py + 18); g.lineTo(px + 12, py + 7); g.lineTo(px + 20, py + 7); g.lineTo(px + 22, py + 18); g.fill();
            circle(g, px + 16, py + 19, 2, '#6a5a2a');
        },
        // Chapter One tiles
        stall(g, px, py, T, c) {
            rect(g, px + 2, py + 12, T - 4, 14, '#5c4630'); rect(g, px + 2, py + 12, T - 4, 2, '#7a6044');
            const awn = c.tx % 2 ? '#7a2f2a' : '#8a7a3a';
            rect(g, px, py + 2, T, 7, awn); for (let i = 0; i < 4; i++) rect(g, px + i * 8, py + 2, 4, 7, '#d8cfb6');
            rect(g, px + 6, py + 15, 5, 4, '#9a8a5a'); rect(g, px + 14, py + 15, 4, 4, '#5a7a4a'); rect(g, px + 21, py + 14, 5, 5, '#7a5a6a');
        },
        notice_board(g, px, py, T) {
            rect(g, px + 5, py + 18, 3, 12, '#3b2b1f'); rect(g, px + T - 8, py + 18, 3, 12, '#3b2b1f');
            rect(g, px + 3, py + 4, T - 6, 16, '#6a5440'); rect(g, px + 3, py + 4, T - 6, 2, '#7a6450');
            rect(g, px + 6, py + 8, 8, 9, '#d8cfb6'); rect(g, px + 17, py + 7, 9, 6, '#e8d8a0'); rect(g, px + 17, py + 14, 7, 4, '#c8bfa6');
            rect(g, px + 7, py + 10, 6, 1, '#6a6460'); rect(g, px + 7, py + 12, 5, 1, '#6a6460');
        },
        fruit_tree(g, px, py, T, c) {
            rect(g, px + T / 2 - 3, py + T - 10, 6, 9, '#4a3424');
            circle(g, px + T / 2, py + T / 2 - 1, T * 0.42, '#24402a');
            circle(g, px + T / 2 - 4, py + T / 2 - 5, T * 0.2, '#30553a');
            for (let i = 0; i < 4; i++) circle(g, px + 7 + Math.floor(hash(c.tx, c.ty, i) * 18), py + 6 + Math.floor(hash(c.tx, c.ty, i + 9) * 14), 1.8, '#b0402e');
        },
        seal_door(g, px, py, T, c) {
            rect(g, px, py, T, T, '#141218'); rect(g, px, py, T, 2, '#24212a');
            const glow = 0.25 + 0.15 * Math.sin((c.time || 0) / 600);
            g.strokeStyle = `rgba(190, 60, 60, ${glow + 0.3})`; g.lineWidth = 2;
            const cx = c.left === 'seal_door' ? px : px + T;          // one circle across the two door tiles
            g.beginPath(); g.arc(cx, py + T / 2 + 2, 11, -Math.PI / 2 + 0.5, Math.PI * 1.5 - 0.5); g.stroke();
        },
        cage(g, px, py, T) {
            rect(g, px + 4, py + T - 6, T - 8, 3, '#3a3a40'); rect(g, px + 4, py + 4, T - 8, 3, '#3a3a40');
            for (let i = 0; i < 5; i++) rect(g, px + 5 + i * 5, py + 6, 1.5, T - 11, '#5a5a62');
            rect(g, px + 12, py + 16, 6, 4, '#0e0e12'); circle(g, px + 15, py + 15, 2.5, '#0e0e12');   // a crow
        },
        memorial(g, px, py, T) {
            rect(g, px + 8, py + 6, T - 16, T - 9, '#6a6870'); rect(g, px + 8, py + 6, T - 16, 2, '#85838c');
            circle(g, px + T / 2, py + 7, 8, '#6a6870');
            rect(g, px + 11, py + 14, 10, 1, '#4a4850'); rect(g, px + 11, py + 17, 8, 1, '#4a4850');
            circle(g, px + 9, py + T - 3, 2, '#c8a0c8'); circle(g, px + 13, py + T - 2, 2, '#e0d070');      // flowers
        },
        wagon(g, px, py, T, c) {
            rect(g, px + 1, py + 8, T - 2, 14, '#5c4630'); rect(g, px + 1, py + 8, T - 2, 2, '#7a6044');
            circle(g, px + 8, py + 24, 5, '#2e241a'); circle(g, px + T - 8, py + 24, 5, '#2e241a');
            rect(g, px + 6, py + 4, 8, 5, '#8a7a5a'); rect(g, px + 16, py + 3, 6, 6, '#6a5a7a');
            if (c.right !== 'wagon') rect(g, px + 18, py + 1, 8, 3, '#c8bfa6');                     // the ledger on top
        },
        cart(g, px, py, T, c) {
            g.save(); g.translate(px + T / 2, py + T / 2); g.rotate((hash(c.tx, c.ty, 4) - 0.5) * 0.9);
            rect(g, -13, -7, 26, 12, '#4e3c2a'); rect(g, -13, -7, 26, 2, '#644e38');
            g.strokeStyle = '#2e241a'; g.lineWidth = 2; g.beginPath(); g.arc(-7, 7, 5, 0, Math.PI * 2); g.stroke();
            g.restore();
        },
        stone_wall(g, px, py, T, c) {
            const face = !WALLS.has(c.below);
            rect(g, px, py, T, T, '#1c1b21');
            if (face) {
                const top = py + Math.floor(T * 0.35);
                rect(g, px, top, T, T - (top - py), '#47434f');
                for (let row = 0; row < 3; row++) {
                    const y = top + row * Math.ceil((T - (top - py)) / 3);
                    rect(g, px, y, T, 1, '#2d2b32');
                    const off = (row + c.tx) % 2 ? T / 2 : T / 4;
                    rect(g, px + off, y, 1, Math.ceil((T - (top - py)) / 3), '#2d2b32');
                }
                rect(g, px, top, T, 2, '#56525f');
            } else speckle(g, px, py, T, c.tx, c.ty, ['#23222a', '#18171c'], 4);
        },
        wood_wall(g, px, py, T, c) {
            const face = !WALLS.has(c.below);
            rect(g, px, py, T, T, '#261c15');
            if (face) {
                const top = py + Math.floor(T * 0.3);
                rect(g, px, top, T, T - (top - py), '#5b4430');
                for (let i = 0; i < 4; i++) rect(g, px + i * (T / 4), top, 1, T - (top - py), '#47331f');
                rect(g, px, top, T, 2, '#6d533b');
                rect(g, px, py + T - 3, T, 3, '#3a2a1c');
            }
        },
        barrel(g, px, py, T) {
            circle(g, px + T / 2, py + T / 2 + 2, T * 0.36, '#2a1f17');
            circle(g, px + T / 2, py + T / 2, T * 0.36, '#5b3f28');
            rect(g, px + T * 0.18, py + T * 0.36, T * 0.64, 2, '#2e2016');
            rect(g, px + T * 0.18, py + T * 0.62, T * 0.64, 2, '#2e2016');
        },
        crate(g, px, py, T) {
            rect(g, px + 3, py + 4, T - 6, T - 6, '#3a2c1f');
            rect(g, px + 3, py + 3, T - 6, T - 7, '#6b5235');
            g.strokeStyle = '#4a3825'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(px + 5, py + 5); g.lineTo(px + T - 5, py + T - 6); g.moveTo(px + T - 5, py + 5); g.lineTo(px + 5, py + T - 6); g.stroke();
        },
        rubble(g, px, py, T, c) {
            for (let i = 0; i < 6; i++) {
                const x = px + 5 + hash(c.tx, c.ty, i) * (T - 10), y = py + 7 + hash(c.tx, c.ty, i + 9) * (T - 12);
                circle(g, x, y + 1, 3 + hash(c.tx, c.ty, i + 3) * 4, '#26242a');
                circle(g, x, y, 3 + hash(c.tx, c.ty, i + 3) * 4, i % 2 ? '#55525a' : '#4a4750');
            }
        },
        shelf(g, px, py, T, c) {
            rect(g, px + 1, py + 2, T - 2, T - 4, '#2c2016');
            for (let r = 0; r < 3; r++) {
                rect(g, px + 1, py + 4 + r * 9, T - 2, 2, '#4a3524');
                for (let j = 0; j < 4; j++) if (hash(c.tx, c.ty, r * 4 + j) < 0.7) rect(g, px + 4 + j * 6, py + r * 9 - 1, 4, 5, ['#6b7a6a', '#7a6a50', '#59506a'][(r + j) % 3]);
            }
        },
        stairs_up(g, px, py, T) {
            for (let i = 0; i < 5; i++) rect(g, px + 2, py + i * (T / 5), T - 4, T / 5 - 1, `rgb(${70 + i * 10},${66 + i * 10},${74 + i * 10})`);
        },
        stairs_down(g, px, py, T) {
            for (let i = 0; i < 5; i++) rect(g, px + 2, py + i * (T / 5), T - 4, T / 5 - 1, `rgb(${60 - i * 9},${46 - i * 7},${34 - i * 5})`);
        },
        bedroll(g, px, py, T) {
            rect(g, px + 3, py + 6, T - 6, T - 12, '#4b4434');
            rect(g, px + 3, py + 6, 8, T - 12, '#6a604c');
        },
        counter(g, px, py, T) {
            rect(g, px, py + 4, T, T - 4, '#463c35');
            rect(g, px, py + 2, T, 8, '#6c635a');
            rect(g, px + 6, py + 14, T - 12, 2, '#2f2924');
        },
        table(g, px, py, T) {
            rect(g, px + 3, py + T - 6, 3, 5, '#3a2a1c'); rect(g, px + T - 6, py + T - 6, 3, 5, '#3a2a1c');
            rect(g, px + 2, py + 6, T - 4, T - 12, '#6b4f35');
            rect(g, px + 2, py + 6, T - 4, 2, '#7d5f42');
            circle(g, px + 11, py + 15, 4, '#a39b8a'); circle(g, px + 21, py + 15, 4, '#8f877a');
        },
        workbench(g, px, py, T) {
            rect(g, px + 3, py + T - 6, 3, 5, '#3a2a1c'); rect(g, px + T - 6, py + T - 6, 3, 5, '#3a2a1c');
            rect(g, px + 1, py + 7, T - 2, T - 13, '#5e4a35');
            rect(g, px + 1, py + 7, T - 2, 2, '#73593f');
            rect(g, px + 5, py + 12, 9, 2, '#7a7a80'); rect(g, px + 19, py + 11, 3, 6, '#5a5048');
        },
        chair(g, px, py, T) {
            rect(g, px + 9, py + 8, T - 18, T - 14, '#5a412b');
            rect(g, px + 9, py + 6, T - 18, 4, '#6b4f35');
        },
        armchair(g, px, py, T) {
            rect(g, px + 5, py + 5, T - 10, T - 9, '#3d2426');
            rect(g, px + 8, py + 10, T - 16, T - 16, '#5a3436');
        },
        bed(g, px, py, T, c) {
            const head = c.above !== 'bed';
            rect(g, px + 1, py, T - 2, T, '#5a3f2a');
            rect(g, px + 3, py + (head ? 3 : 0), T - 6, T - (head ? 3 : 2), '#8a8478');
            if (head) rect(g, px + 6, py + 4, T - 12, 7, '#b1aa9c');
            else rect(g, px + 3, py, T - 6, T - 8, '#6a5560');
        },
        fireplace(g, px, py, T, c) {
            rect(g, px, py, T, T, '#3a3740');
            rect(g, px + 4, py + 10, T - 8, T - 10, '#120c0a');
            rect(g, px + 6, py + T - 6, T - 12, 3, '#3a3633');
            const flick = 0.25 + 0.15 * Math.sin(c.time / 400 + c.tx);
            g.fillStyle = `rgba(150, 70, 30, ${flick})`; g.fillRect(px + 8, py + T - 9, T - 16, 3);
            rect(g, px, py, T, 4, '#4f4b56');
        },
        rug(g, px, py, T, c) {
            rect(g, px, py, T, T, '#4a2228');
            const edge = (t) => t !== 'rug';
            if (edge(c.above)) rect(g, px, py, T, 3, '#6a3a30');
            if (edge(c.below)) rect(g, px, py + T - 3, T, 3, '#6a3a30');
            if (edge(c.left)) rect(g, px, py, 3, T, '#6a3a30');
            if (edge(c.right)) rect(g, px + T - 3, py, 3, T, '#6a3a30');
            rect(g, px + T / 2 - 3, py + T / 2 - 3, 6, 6, '#5c2f2c');
        },
        doorway(g, px, py, T, c) {
            if (EXTERIOR.has(c.left) || EXTERIOR.has(c.right) || EXTERIOR.has(c.above)) {
                rect(g, px, py, T, T, '#0f0c0b');                  // open door into darkness
                rect(g, px, py, 3, T, '#3a2a1c'); rect(g, px + T - 3, py, 3, T, '#3a2a1c'); rect(g, px, py, T, 3, '#3a2a1c');
                rect(g, px + 4, py + T - 3, T - 8, 3, '#56483a');
            } else {
                rect(g, px, py + T / 2 - 2, T, 4, '#3a2a1c');
            }
        },
        tall_weeds(g, px, py, T, c) {
            rect(g, px, py, T, T, '#2f4528');
            const sway = Math.sin(c.time / 700 + c.tx * 0.7 + c.ty * 0.4) * 1.5;
            for (let i = 0; i < 7; i++) {
                const x = px + 2 + Math.floor(hash(c.tx, c.ty, i) * (T - 6));
                const h = 9 + Math.floor(hash(c.tx, c.ty, i + 30) * 10);
                const y = py + T - 2 - Math.floor(hash(c.tx, c.ty, i + 60) * 12);
                g.strokeStyle = i % 2 ? '#4c6a3a' : '#405a33'; g.lineWidth = 2;
                g.beginPath(); g.moveTo(x, y); g.lineTo(x + sway, y - h); g.stroke();
            }
        },
        tree(g, px, py, T, c) {
            rect(g, px + T / 2 - 3, py + T - 10, 6, 9, '#3b2b1f');
            circle(g, px + T / 2 + 1, py + T / 2 + 1, T * 0.46, '#0f1a12');
            circle(g, px + T / 2, py + T / 2 - 1, T * 0.44, '#1d3023');
            circle(g, px + T / 2 - 4, py + T / 2 - 5, T * 0.22, '#28432e');
            if (hash(c.tx, c.ty, 1) < 0.5) circle(g, px + T / 2 + 6, py + T / 2 + 2, T * 0.14, '#24392a');
        },
        dead_tree(g, px, py, T) {
            g.strokeStyle = '#4a4038'; g.lineWidth = 3; g.lineCap = 'round';
            g.beginPath();
            g.moveTo(px + T / 2, py + T - 2); g.lineTo(px + T / 2, py + 6);
            g.moveTo(px + T / 2, py + 14); g.lineTo(px + 6, py + 6);
            g.moveTo(px + T / 2, py + 11); g.lineTo(px + T - 6, py + 3);
            g.moveTo(px + T / 2, py + 20); g.lineTo(px + T - 7, py + 15);
            g.stroke(); g.lineCap = 'butt';
        },
        fence(g, px, py, T) {
            rect(g, px, py + 11, T, 3, '#6a5440'); rect(g, px, py + 19, T, 3, '#5a4636');
            rect(g, px + 4, py + 7, 4, 19, '#7a6450'); rect(g, px + T - 8, py + 7, 4, 19, '#7a6450');
        },
        rock(g, px, py, T) {
            circle(g, px + T / 2, py + T / 2 + 3, T * 0.36, '#1f2622');
            circle(g, px + T / 2, py + T / 2, T * 0.34, '#5c5a60');
            circle(g, px + T / 2 - 4, py + T / 2 - 4, T * 0.14, '#75727a');
        },
        water(g, px, py, T, c) {
            rect(g, px, py, T, T, '#1b3140');
            const t = c.time / 900;
            for (let i = 0; i < 3; i++) {
                const y = py + 6 + i * 9 + Math.sin(t + c.tx + i) * 1.5;
                rect(g, px + 4 + ((i * 7 + c.tx * 5) % 12), y, 9, 1, '#2f5566');
            }
        },
        house_wall(g, px, py, T, c) {
            rect(g, px, py, T, T, '#4a3a2e');
            for (let i = 0; i < 4; i++) rect(g, px, py + i * 8, T, 1, '#3a2c22');
            rect(g, px, py + T - 3, T, 3, '#241b15');
            if (hash(c.tx, c.ty, 2) < 0.4) rect(g, px + 6, py + 12, 8, 1, '#5a4838');
        },
        house_window(g, px, py, T, c) {
            painters.house_wall(g, px, py, T, c);
            rect(g, px + 7, py + 6, T - 14, T - 14, '#2a2018');
            rect(g, px + 9, py + 8, T - 18, T - 18, '#141922');
            rect(g, px + T / 2 - 1, py + 8, 2, T - 18, '#2a2018');
            g.fillStyle = 'rgba(200, 170, 90, 0.08)'; g.fillRect(px + 9, py + 8, T - 18, T - 18);
        },
        roof(g, px, py, T, c) {
            rect(g, px, py, T, T, '#29252e');
            for (let i = 0; i < 4; i++) {
                const off = (i + c.ty) % 2 ? 0 : 8;
                for (let j = -1; j < 3; j++) rect(g, px + off + j * 16, py + i * 8 + 6, 14, 2, '#35303c');
            }
            if (c.below !== 'roof') rect(g, px, py + T - 4, T, 4, '#1b181f');
        },
        shed_wall(g, px, py, T) {
            rect(g, px, py, T, T, '#46473a');
            for (let i = 0; i < 4; i++) rect(g, px + i * 8, py, 1, T, '#363729');
            rect(g, px, py + T - 3, T, 3, '#262719');
        },
        shed_door_shut(g, px, py, T) {
            rect(g, px, py, T, T, '#46473a');
            rect(g, px + 5, py + 3, T - 10, T - 3, '#3b2c20');
            for (let i = 0; i < 3; i++) rect(g, px + 5 + i * 7, py + 3, 1, T - 3, '#2b1f16');
            rect(g, px + T - 10, py + T / 2, 3, 3, '#7a6a50');
        },
        shed_roof(g, px, py, T, c) {
            rect(g, px, py, T, T, '#33302a');
            for (let i = 0; i < 4; i++) rect(g, px, py + i * 8 + 5, T, 2, '#3f3b33');
            if (c.below !== 'shed_roof') rect(g, px, py + T - 4, T, 4, '#1f1d19');
        },
        well(g, px, py, T) {
            circle(g, px + T / 2, py + T / 2 + 2, T * 0.44, '#2a292e');
            circle(g, px + T / 2, py + T / 2, T * 0.42, '#6a6870');
            circle(g, px + T / 2, py + T / 2, T * 0.27, '#07070a');
            rect(g, px + 3, py + 2, 3, T - 6, '#5a4430'); rect(g, px + T - 6, py + 2, 3, T - 6, '#5a4430');
            rect(g, px + 3, py + 2, T - 6, 3, '#6b5238');
            rect(g, px + T / 2 - 1, py + 5, 1, T / 2 - 4, '#a08e70');
        },
        signpost(g, px, py, T) {
            rect(g, px + T / 2 - 2, py + 10, 4, T - 11, '#5a4430');
            rect(g, px + 5, py + 6, T - 10, 9, '#6b5238');
            g.fillStyle = '#6b5238'; g.beginPath(); g.moveTo(px + T - 5, py + 6); g.lineTo(px + T - 1, py + 10.5); g.lineTo(px + T - 5, py + 15); g.fill();
            rect(g, px + 8, py + 10, T - 18, 1, '#4a3825');
        },
        rope(g, px, py, T, c) {
            rect(g, px + T / 2 - 2, py, 4, T - 6, '#a08e70');
            for (let i = 0; i < 5; i++) rect(g, px + T / 2 - 2, py + 3 + i * 5, 4, 1, '#7a6a50');
            circle(g, px + T / 2, py + T - 6, 4, '#8a7a5c');
            const a = 0.12 + 0.04 * Math.sin(c.time / 900);
            g.fillStyle = `rgba(200, 210, 230, ${a})`; g.fillRect(px + 4, py, T - 8, T);
        },
        scarecrow(g, px, py, T) {
            rect(g, px + T / 2 - 1, py + 8, 3, T - 8, '#5a4430');
            rect(g, px + 3, py + 11, T - 6, 3, '#5a4430');
            rect(g, px + 9, py + 10, T - 18, 13, '#5b4a2e');
            circle(g, px + T / 2, py + 7, 5, '#b9a678');
            rect(g, px + T / 2 - 7, py + 1, 14, 3, '#2e2a24');
            for (const [x, y] of [[5, 8], [T - 7, 9], [T - 12, 8]]) { circle(g, px + x, py + y, 2.6, '#060607'); rect(g, px + x + 1, py + y - 1, 2, 1, '#060607'); }
        }
    };

    // Creatures, drawn in a 32x32 box at (px, py); used on the map and on battle cards (scaled).
    const creatures = {
        rat(g, px, py, t, flip) {
            const b = Math.sin(t / 160) * 0.8;
            g.save(); if (flip) { g.translate(px * 2 + 32, 0); g.scale(-1, 1); }
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 25, 10, 3, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#7a5a4a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 6, py + 21); g.quadraticCurveTo(px + 1, py + 18 + b, px + 3, py + 13); g.stroke();
            g.fillStyle = '#8a4e32'; g.beginPath(); g.ellipse(px + 15, py + 19 + b, 9, 5.5, 0, 0, Math.PI * 2); g.fill();
            circle(g, px + 23, py + 17 + b, 4.5, '#9a5a3a');
            circle(g, px + 21, py + 13 + b, 2, '#b07a60');
            rect(g, px + 25, py + 16 + b, 1.5, 1.5, '#e8c070');
            g.restore();
        },
        wolf(g, px, py, t) {
            const b = Math.sin(t / 220) * 0.8;
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 28, 13, 3.5, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + 7, py + 19, 3, 9, '#4a4a50'); rect(g, px + 22, py + 19, 3, 9, '#4a4a50');
            g.fillStyle = '#5c5c64'; g.beginPath(); g.ellipse(px + 15, py + 17 + b, 11, 6, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#6a6a72'; g.beginPath(); g.moveTo(px + 22, py + 11 + b); g.lineTo(px + 31, py + 15 + b); g.lineTo(px + 22, py + 19 + b); g.fill();
            g.fillStyle = '#5c5c64'; g.beginPath(); g.moveTo(px + 22, py + 11 + b); g.lineTo(px + 24, py + 6 + b); g.lineTo(px + 26, py + 12 + b); g.fill();
            g.strokeStyle = '#5c5c64'; g.lineWidth = 3; g.beginPath(); g.moveTo(px + 5, py + 15 + b); g.lineTo(px + 1, py + 11 + b * 2); g.stroke();
            rect(g, px + 25, py + 13 + b, 2, 1.5, '#e8d070');
        },
        shade(g, px, py, t) {
            const b = Math.sin(t / 300) * 1.5;
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 28, 8, 3, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#3e4a3c'; g.beginPath(); g.moveTo(px + 8, py + 27 + b); g.lineTo(px + 24, py + 27 + b); g.lineTo(px + 20, py + 10 + b); g.lineTo(px + 12, py + 10 + b); g.fill();
            circle(g, px + 16, py + 9 + b, 5.5, '#8a9a80');
            rect(g, px + 13, py + 8 + b, 2, 2, '#1a1a1a'); rect(g, px + 17, py + 8 + b, 2, 2, '#1a1a1a');
        }
    };
    // Chapter One people and foes. person() draws a small standing figure in the player's style.
    /** A shade darker, for the second step of a colour ramp. */
    const darker = (hex, k = 0.72) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
    /** HD-2D villagers: the same layered, proportioned sprite pipeline as the player (ui/sprites.js), recoloured
     *  per villager, with their hat, helm, hood or tool on top. Falls back to the simple figure without sprites. */
    function person(g, px, py, t, o) {
        if (!ENSO.sprites || !ENSO.sprites.drawCharacter) return personFlat(g, px, py, t, o);
        const cx = px + 16, base = py + 30;
        const seed = Math.floor(hash(Math.round(px), Math.round(py), 3) * 1000);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, base - 1, 8, 3, 0, 0, Math.PI * 2); g.fill();
        const MS = ENSO.spriteManifest && ENSO.spriteManifest.manaseed;
        if (MS) {
            // Mana Seed paper doll (assets/sprites/manaseed.js): the villager's colours pick the nearest skin, hair,
            // outfit and hood or hat; helms and props are still drawn on top below.
            const op = MS.options, near = (list, hex, from = 0) => nearest(list.map((x) => (x && x.swatch) || x), hex, from);
            const cosmetics = {
                hairStyle: o.hairStyle != null ? o.hairStyle % op.hairStyles.length : seed % op.hairStyles.length,
                hairColor: o.hair ? near(op.hairColours, o.hair) : seed % op.hairColours.length,
                outfit: o.cloak ? near(op.outfitSwatches, o.cloak) : seed % op.outfits.length,
                hat: o.hood ? near(op.hatSwatches.slice(0, 6), o.hood, 1) : o.hat ? near(op.hatSwatches, o.hat, 1) : 0
            };
            const appearance = o.skin ? near(op.skins, o.skin) : o.appearance != null ? o.appearance : seed % op.skins.length;
            ENSO.sprites.drawCharacter(g, cx, base, { appearance, cosmetics, character: MS, facing: 'down', anim: 'idle' }, t);
            return personProps(g, cx, base - 30, { ...o, hat: null, hood: null });
        }
        const palette = { c: o.cloak, C: darker(o.cloak) };
        if (o.belt) palette.a = o.belt;
        if (o.hair) Object.assign(palette, { h: o.hair, H: darker(o.hair), L: darker(o.hair, 1.25) });
        if (o.skin) Object.assign(palette, { s: o.skin, S: darker(o.skin, 0.85) });
        ENSO.sprites.drawCharacter(g, cx, base, {
            appearance: o.appearance != null ? o.appearance : seed % 4, cosmetics: { hairStyle: o.hairStyle != null ? o.hairStyle : seed % 12, hairColor: seed % 4, outfit: 0 },
            facing: 'down', anim: 'idle', palette
        }, t + seed * 37);
        personProps(g, cx, base - 30, o);
    }
    /** Index of the colour in `list` (hex strings, nulls skipped) nearest to `hex`, from index `from`. */
    function nearest(list, hex, from = 0) {
        const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        const [r, g2, b] = rgb(hex);
        let best = from, bd = Infinity;
        list.forEach((c, i) => {
            if (i < from || !c) return;
            const [r2, gg, b2] = rgb(c), d = (r - r2) ** 2 + (g2 - gg) ** 2 + (b - b2) ** 2;
            if (d < bd) { bd = d; best = i; }
        });
        return best;
    }
    /** What a villager wears or carries over the body: hat, helm, hood, scarf, tools, crows. `top` is 30 px above the feet. */
    function personProps(g, cx, top, o) {
        if (o.hat) { rect(g, cx - 8, top + 6, 16, 2, o.hat); rect(g, cx - 5, top + 1, 10, 5, o.hat); rect(g, cx - 5, top + 1, 10, 1, darker(o.hat, 1.3)); }
        if (o.helm) { g.fillStyle = o.helm; g.beginPath(); g.arc(cx, top + 9, 6.5, Math.PI, Math.PI * 2); g.fill(); rect(g, cx - 6, top + 8, 13, 2, darker(o.helm)); rect(g, cx - 1, top + 1, 2, 3, o.helm); }
        if (o.hood) { g.fillStyle = o.hood; g.beginPath(); g.arc(cx, top + 10, 7.5, Math.PI * 0.95, Math.PI * 2.05); g.fill(); rect(g, cx - 7, top + 10, 2, 7, o.hood); rect(g, cx + 6, top + 10, 2, 7, o.hood); }
        if (o.scarf) { rect(g, cx - 5, top + 17, 10, 3, o.scarf); rect(g, cx - 5, top + 17, 10, 1, darker(o.scarf, 1.25)); }
        if (o.prop === 'staff') { rect(g, cx + 8, top + 2, 2, 28, '#7a6044'); rect(g, cx + 8, top + 2, 1, 28, '#9a8064'); }
        if (o.prop === 'pack') { rect(g, cx - 11, top + 14, 5, 9, '#6a5440'); rect(g, cx - 11, top + 14, 5, 1, '#8a7460'); }
        if (o.prop === 'hammer') { rect(g, cx + 8, top + 15, 2, 12, '#7a6044'); rect(g, cx + 6, top + 13, 6, 3, '#9a9aa2'); }
        if (o.prop === 'basket') { rect(g, cx + 6, top + 21, 7, 5, '#8a6a3a'); rect(g, cx + 7, top + 19, 5, 2, '#5a8a4a'); }
        if (o.prop === 'halberd') { rect(g, cx + 9, top - 2, 2, 31, '#5a4a3a'); rect(g, cx + 7, top - 3, 7, 5, '#a8a8b0'); }
        if (o.crows) for (const [dx, dy] of [[-9, 10], [9, 6]]) { circle(g, cx + dx, top + dy, 2.6, '#0a0a0e'); rect(g, cx + dx + 2, top + dy - 1, 2, 1, '#0a0a0e'); }
    }
    function personFlat(g, px, py, t, o) {
        const cx = px + 16, base = py + 28, bob = Math.sin(t / 500 + px) * 0.6;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx, base, 8, 3, 0, 0, Math.PI * 2); g.fill();
        rect(g, cx - 4, base - 6, 3, 6, '#2a2420'); rect(g, cx + 1, base - 6, 3, 6, '#2a2420');
        g.fillStyle = o.cloak; g.beginPath(); g.moveTo(cx - 7, base - 5 + bob); g.lineTo(cx + 7, base - 5 + bob); g.lineTo(cx + 5, base - 18 + bob); g.lineTo(cx - 5, base - 18 + bob); g.closePath(); g.fill();
        if (o.belt) rect(g, cx - 6, base - 10 + bob, 12, 2, o.belt);
        circle(g, cx, base - 22 + bob, 5.5, o.skin || '#d9c3a5');
        if (o.hair) { g.fillStyle = o.hair; g.beginPath(); g.arc(cx, base - 23 + bob, 5.5, Math.PI, Math.PI * 2); g.fill(); }
        if (o.hat) { rect(g, cx - 8, base - 26 + bob, 16, 2, o.hat); rect(g, cx - 5, base - 31 + bob, 10, 5, o.hat); }
        if (o.helm) { g.fillStyle = o.helm; g.beginPath(); g.arc(cx, base - 23 + bob, 6, Math.PI, Math.PI * 2); g.fill(); rect(g, cx - 1, base - 30 + bob, 2, 3, o.helm); }
        if (o.hood) { g.fillStyle = o.hood; g.beginPath(); g.arc(cx, base - 22 + bob, 7, Math.PI * 0.9, Math.PI * 2.1); g.fill(); }
        rect(g, cx - 3, base - 23 + bob, 2, 2, '#1a1412'); rect(g, cx + 1, base - 23 + bob, 2, 2, '#1a1412');
        if (o.scarf) rect(g, cx - 5, base - 18 + bob, 10, 3, o.scarf);
        if (o.prop === 'staff') rect(g, cx + 8, base - 28, 2, 26, '#7a6044');
        if (o.prop === 'pack') rect(g, cx - 10, base - 17 + bob, 5, 8, '#6a5440');
        if (o.prop === 'hammer') { rect(g, cx + 8, base - 16, 2, 12, '#7a6044'); rect(g, cx + 6, base - 18, 6, 3, '#8a8a90'); }
        if (o.prop === 'basket') { rect(g, cx + 6, base - 9, 7, 5, '#8a6a3a'); rect(g, cx + 7, base - 11, 5, 2, '#5a8a4a'); }
        if (o.prop === 'halberd') { rect(g, cx + 9, base - 32, 2, 30, '#5a4a3a'); rect(g, cx + 7, base - 33, 7, 5, '#9a9aa2'); }
        if (o.crows) for (const [dx, dy] of [[-8, -20], [8, -24]]) { circle(g, cx + dx, base + dy + bob, 2.6, '#0a0a0e'); rect(g, cx + dx + 2, base + dy - 1 + bob, 2, 1, '#0a0a0e'); }
    }
    const PEOPLE = {
        traveller: { cloak: '#5a5a48', hat: '#4a3a2a', prop: 'pack' },
        elder: { cloak: '#5a4a6a', hair: '#c8c8c8', prop: 'staff' },
        trader: { cloak: '#7a5a3a', hair: '#3a2a20', belt: '#c8a050' },
        smith: { cloak: '#4a3a30', hair: '#2a2420', belt: '#1a1612', prop: 'hammer', skin: '#c8a080' },
        herbalist: { cloak: '#3d6640', hood: '#2e4e30', prop: 'basket' },
        captain: { cloak: '#2e3e5a', helm: '#8a8a92', belt: '#c8a050' },
        shane: { cloak: '#7a6a2a', hair: '#8a4a2a', scarf: '#c83a5a', prop: 'pack' },
        warden_npc: { cloak: '#2a2a32', helm: '#3a3a42', prop: 'halberd', crows: true },
        mason: { cloak: '#6a6a5a', hair: '#5a4a3a', belt: '#4a3a2a', prop: 'hammer' },
        monk: { cloak: '#5a4a38', hood: '#4a3c2c', belt: '#c8b890' },
        steward: { cloak: '#3a3a44', hood: '#e0dccc', belt: '#5a4a38', prop: 'basket' },
        baker: { cloak: '#d8d0c0', hair: '#6a4a2a', belt: '#8a6a3a' },
        butcher: { cloak: '#7a3a34', hair: '#3a2a20', belt: '#e0dccc', prop: 'hammer', skin: '#d0a888' }
    };
    Object.assign(creatures, {
        goblin(g, px, py, t, flip) {
            const b = Math.sin(t / 180) * 0.8;
            g.save(); if (flip) { g.translate(px * 2 + 32, 0); g.scale(-1, 1); }
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 27, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + 12, py + 21, 3, 6, '#3a4a2a'); rect(g, px + 17, py + 21, 3, 6, '#3a4a2a');
            rect(g, px + 10, py + 13 + b, 12, 9, '#5a4a3a');
            circle(g, px + 16, py + 10 + b, 5, '#6a8a4a');
            g.fillStyle = '#6a8a4a'; g.beginPath(); g.moveTo(px + 11, py + 9 + b); g.lineTo(px + 5, py + 6 + b); g.lineTo(px + 12, py + 12 + b); g.fill();
            g.beginPath(); g.moveTo(px + 21, py + 9 + b); g.lineTo(px + 27, py + 6 + b); g.lineTo(px + 20, py + 12 + b); g.fill();
            rect(g, px + 14, py + 9 + b, 1.5, 1.5, '#e8d070'); rect(g, px + 17, py + 9 + b, 1.5, 1.5, '#e8d070');
            g.restore();
        },
        gnawer(g, px, py, t) {
            const b = Math.sin(t / 140) * 1;
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 26, 10, 3, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#d8d0c0'; g.lineWidth = 2;
            for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(px + 9 + i * 4, py + 16 + b); g.lineTo(px + 7 + i * 4, py + 25); g.stroke(); }
            g.fillStyle = '#c8c0b0'; g.beginPath(); g.ellipse(px + 15, py + 15 + b, 9, 4, 0, 0, Math.PI * 2); g.fill();
            circle(g, px + 24, py + 13 + b, 4, '#e0d8c8');
            rect(g, px + 25, py + 12 + b, 1.5, 1.5, '#c03030');
        },
        cultist(g, px, py, t) {
            const b = Math.sin(t / 400) * 0.8;
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 28, 8, 3, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#5a5a60'; g.beginPath(); g.moveTo(px + 8, py + 28); g.lineTo(px + 24, py + 28); g.lineTo(px + 19, py + 8 + b); g.lineTo(px + 13, py + 8 + b); g.fill();
            circle(g, px + 16, py + 9 + b, 5, '#4a4a50');
            rect(g, px + 13, py + 9 + b, 6, 3, '#141418');
            g.strokeStyle = '#b84040'; g.lineWidth = 1; g.beginPath(); g.arc(px + 16, py + 19 + b, 3, -1.2, 4.3); g.stroke();
        },
        ghoul(g, px, py, t) {
            const b = Math.sin(t / 200) * 1.2;
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 28, 9, 3, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + 11, py + 21, 3, 7, '#6a7a6a'); rect(g, px + 18, py + 21, 3, 7, '#6a7a6a');
            g.fillStyle = '#7a8a78'; g.beginPath(); g.ellipse(px + 16, py + 16 + b, 7, 7, 0, 0, Math.PI * 2); g.fill();
            circle(g, px + 16, py + 7 + b, 5, '#8a9a88');
            rect(g, px + 13, py + 6 + b, 2, 2, '#e04040'); rect(g, px + 17, py + 6 + b, 2, 2, '#e04040');
            g.strokeStyle = '#4a2020'; g.lineWidth = 1; for (const y of [13, 16, 19]) { g.beginPath(); g.moveTo(px + 11, py + y + b); g.lineTo(px + 21, py + y + 2 + b); g.stroke(); }
            g.strokeStyle = '#6a6a72'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 22, py + 18 + b); g.lineTo(px + 29, py + 25); g.stroke();
        },
        constable(g, px, py, t) { person(g, px, py, t, { cloak: '#2e3e5a', helm: '#8a8a92', belt: '#c8a050' }); rect(g, px + 25, py + 11, 2, 12, '#6a5440'); },
        warden(g, px, py, t) { person(g, px, py, t, { cloak: '#2a2a32', helm: '#3a3a42', prop: 'halberd', crows: true }); rect(g, px + 13, py + 5, 2, 2, '#e03030'); rect(g, px + 17, py + 5, 2, 2, '#e03030'); }
    });
    // Which creature to draw for an enemy key (battle cards) and for an encounter sprite (map).
    const CREATURE_FOR = {
        rust_rat: 'rat', cellar_vermin: 'rat', hungry_wolf: 'wolf',
        weak_goblin: 'goblin', bone_gnawer: 'gnawer', cult_acolyte: 'cultist', shackled_ghoul_stronger: 'ghoul',
        watch_constable: 'constable', crow_touched_warden: 'warden'
    };

    // Sprites for objects placed on top of tiles (interactables with a `sprite`).
    const sprites = {
        bundle(g, px, py, T) {
            rect(g, px + 9, py + 9, 14, 9, '#d8d2c2'); rect(g, px + 9, py + 12, 14, 2, '#b8b0a0');
            rect(g, px + 15, py + 9, 2, 9, '#a03a30');
        },
        bottle(g, px, py, T) {
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 16, py + 26, 6, 2, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + 12, py + 12, 8, 14, '#2f4a32'); rect(g, px + 14, py + 6, 4, 7, '#2f4a32'); rect(g, px + 14, py + 5, 4, 2, '#8a6a4a');
            rect(g, px + 13, py + 14, 2, 8, '#4f7a52');
        },
        rats(g, px, py, T, t) { creatures.rat(g, px - 6, py + 2, t, false); creatures.rat(g, px + 6, py - 6, t + 400, true); },
        goblins(g, px, py, T, t) { creatures.goblin(g, px - 6, py, t, false); creatures.goblin(g, px + 6, py - 4, t + 300, true); },
        gnawer(g, px, py, T, t) { creatures.rat(g, px + 7, py + 3, t + 200, true); creatures.gnawer(g, px - 4, py - 2, t); },
        cultists(g, px, py, T, t) { creatures.cultist(g, px - 6, py, t); creatures.cultist(g, px + 6, py - 3, t + 500); },
        ghoul(g, px, py, T, t) { creatures.ghoul(g, px, py, t); },
        constables(g, px, py, T, t) { creatures.constable(g, px - 6, py, t); creatures.constable(g, px + 6, py - 3, t + 400); },
        warden(g, px, py, T, t) { creatures.warden(g, px, py, t); },
        strongbox(g, px, py, T) {
            rect(g, px + 8, py + 14, 16, 11, '#4a3a2a'); rect(g, px + 8, py + 14, 16, 3, '#6a5440');
            rect(g, px + 14, py + 18, 4, 4, '#8a8a90'); rect(g, px + 10, py + 9, 12, 5, '#d8cfb6');
        },
        wolf(g, px, py, T, t) { creatures.wolf(g, px, py, t); },
        feathers(g, px, py, T) {
            g.strokeStyle = '#08080a'; g.lineWidth = 2; g.lineCap = 'round';
            for (const [x, y, dx, dy] of [[9, 20, 7, -5], [16, 22, 6, 2], [12, 13, 8, 3], [20, 15, -5, 6]]) {
                g.beginPath(); g.moveTo(px + x, py + y); g.quadraticCurveTo(px + x + dx / 2, py + y + dy / 2 - 3, px + x + dx, py + y + dy); g.stroke();
            }
            g.lineCap = 'butt';
        }
    };

    for (const [key, o] of Object.entries(PEOPLE)) sprites[key] = (g, px, py, T, t) => person(g, px, py, t, o);
    sprites.crowd = (g, px, py, T, t) => {
        person(g, px - 8, py + 2, t, { cloak: '#5a4a3a', hair: '#3a2a20' });
        person(g, px + 8, py + 1, t + 300, { cloak: '#4a5a4a', hair: '#8a6a40' });
        person(g, px, py - 3, t + 600, { cloak: '#6a4a4a', hat: '#4a3a2a' });
    };

    function create(canvas, world, opts = {}) {
        // T is the current map's cell size in pixels: 32 for the original maps, 16 for 16 px maps (Keel rev 2).
        // A map converted from 32 px (src/world/scale16.js) keeps its `source32`: its painted tiles, overhangs,
        // tile lights and object sprites are drawn from that at 32 px (the same pixels), everything that moves
        // or is placed by cell uses the 16 px grid.
        let T = opts.tile || 32;
        const cellOf = (map) => map.tileSize || opts.tile || 32;
        const HD = ENSO.tilesHD;                       // HD-2D painters and shadows (ui/tiles-hd.js), when loaded
        if (HD) {
            Object.assign(ground, HD.ground); Object.assign(painters, HD.painters);
            Object.assign(OVERHANGS, HD.overhangs); Object.assign(TILE_LIGHTS, HD.lights);
        }
        // Pack art (ui/tiles-manaseed.js) goes over the painters; while its sheet loads it returns false and the
        // painter it replaced draws instead.
        const PACK = ENSO.tilesManaseed;
        if (PACK && !PACK.wrapped) {
            PACK.wrapped = true;
            for (const [table, extra] of [[ground, PACK.ground], [painters, PACK.painters], [OVERHANGS, PACK.overhangs]]) {
                for (const [name, fn] of Object.entries(extra)) {
                    const prev = table[name];
                    table[name] = (...args) => { if (fn(...args) === false && prev) prev(...args); };
                }
            }
        }
        const g = canvas.getContext('2d');
        g.imageSmoothingEnabled = false;
        const dark = document.createElement('canvas');
        dark.width = canvas.width; dark.height = canvas.height;
        const dg = dark.getContext('2d');
        const cache = new Map(); // mapId -> offscreen canvas of static tiles

        const nameAt = (map, x, y) => {
            if (y < 0 || y >= map.tiles.length || x < 0 || x >= map.tiles[0].length) return null;
            const ch = map.tiles[y][x];
            const def = (map.legend && map.legend[ch]) || world.tileset[ch];
            return def ? def.name : null;
        };
        // Objects stand on whatever floor surrounds them (a crate in the house sits on boards, not stone).
        const FLOOR_OF = { stone_floor: 'stone_floor', wood_floor: 'wood_floor', rug: 'wood_floor', doorway: 'wood_floor', grass: 'grass', tall_weeds: 'grass', dirt_path: 'dirt_path', cobble: 'cobble' };
        function floorUnder(map, x, y, fallback) {
            const counts = {};
            for (const [nx, ny] of [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]]) {
                const f = FLOOR_OF[nameAt(map, nx, ny)];
                if (f) counts[f] = (counts[f] || 0) + 1;
            }
            const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
            return best || fallback;
        }
        function paintTile(tg, map, x, y, time) {
            const name = nameAt(map, x, y);
            const ctx = { tx: x, ty: y, name, time, below: nameAt(map, x, y + 1), above: nameAt(map, x, y - 1), left: nameAt(map, x - 1, y), right: nameAt(map, x + 1, y),
                aboveLeft: nameAt(map, x - 1, y - 1), aboveRight: nameAt(map, x + 1, y - 1), belowLeft: nameAt(map, x - 1, y + 1), belowRight: nameAt(map, x + 1, y + 1) };
            const px = x * T, py = y * T;
            if (ground[name]) { ground[name](tg, px, py, T, ctx); return; }
            const base = BASE[name] && floorUnder(map, x, y, BASE[name]);
            if (base) ground[base](tg, px, py, T, ctx);
            if (painters[name]) painters[name](tg, px, py, T, ctx);
            else if (!base) rect(tg, px, py, T, T, '#ff00ff'); // unknown tile: make it obvious
        }
        // Authored art (Keel rev 2): a map from a Tiled file carries `art` (src/world/tiled.js). Its ground, detail
        // and walls layers draw under the player and its overhead layer over them; any cell with no loaded art
        // under the player falls back to the procedural painter for its logical tile.
        const ATLAS = ENSO.atlas, TILED = ENSO.tiled;
        if (ATLAS) ATLAS.onLoad(() => cache.clear());
        function artCells(map, x, y, layers) {
            const art = map.art;
            if (!art || !ATLAS || !TILED || x >= art.width || y >= art.height) return [];
            const out = [];
            for (const name of layers) {
                const data = art.layers[name];
                const cell = data && TILED.artCell(art, data[y * art.width + x]);
                const img = cell && ATLAS.image(cell.asset);
                if (img) out.push({ img, ...cell, size: art.tileSize });
            }
            return out;
        }
        function drawArt(tg, cells, px, py) {
            for (const c of cells) {
                if (c.flipX) { tg.save(); tg.translate(px + T, py); tg.scale(-1, 1); tg.drawImage(c.img, c.sx, c.sy, c.size, c.size, 0, 0, T, T); tg.restore(); }
                else tg.drawImage(c.img, c.sx, c.sy, c.size, c.size, px, py, T, T);
            }
        }
        const UNDER = ['ground', 'detail', 'walls'];

        function staticLayer(mapId) {
            if (cache.has(mapId)) return cache.get(mapId);
            const map = world.maps[mapId].source32 || world.maps[mapId];
            T = map === world.maps[mapId] ? cellOf(map) : 32;
            const c = document.createElement('canvas');
            c.width = map.tiles[0].length * T; c.height = map.tiles.length * T;
            const cg = c.getContext('2d');
            cg.imageSmoothingEnabled = false;
            for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) {
                const art = artCells(map, x, y, UNDER);
                if (art.length) drawArt(cg, art, x * T, y * T);
                else if (!ANIMATED.has(nameAt(map, x, y))) paintTile(cg, map, x, y, 0);
            }
            if (HD) HD.shadePass(cg, map, nameAt, T);
            if (PACK) PACK.decorPass(cg, map, nameAt, T);
            cache.set(mapId, c);
            return c;
        }

        /** The player: layered sprite sheets via ENSO.sprites (ui/sprites.js, docs/SPRITES.md). The creator
         *  preview goes through here too, so the preview and the walking character are the same composition. */
        function drawPlayer(px, py, view, time) {
            const cx = px + T / 2, base = py + T - 2;
            g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, base - 1, 8, 3, 0, 0, Math.PI * 2); g.fill();
            ENSO.sprites.drawCharacter(g, cx, base, {
                appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className,
                facing: view.facing, anim: view.moving ? 'walk' : 'idle'
            }, time);
            const glow = 0.45 + 0.25 * Math.sin(time / 500);                        // the faintly glowing hands
            const hands = view.facing === 'left' || view.facing === 'right' ? [cx + (view.facing === 'left' ? -1 : 1)] : [cx - 5, cx + 5];
            for (const hx of hands) {
                const hy = base - 8;
                const grad = g.createRadialGradient(hx, hy, 0, hx, hy, 6);
                grad.addColorStop(0, `rgba(160, 255, 220, ${glow})`); grad.addColorStop(1, 'rgba(160, 255, 220, 0)');
                g.fillStyle = grad; g.fillRect(hx - 6, hy - 6, 12, 12);
            }
        }

        // Render hooks (GFX-3): extra drawing at fixed points of the frame, without touching this file.
        //   'ground'      after the floor, before anyone stands on it (decals, footprints, shadows)
        //   'foreground'  after people and tree crowns, in map pixels (weather, overhead effects)
        //   'light'       after darkness, glow and ambience, in screen pixels (flashes, vignettes)
        // fn(g, { map, time, ox, oy, view, dark? }) — presentation only, never game state.
        const hooks = { ground: [], foreground: [], light: [] };
        function addHook(stage, fn) {
            if (!hooks[stage]) throw new Error(`Unknown render stage '${stage}'`);
            hooks[stage].push(fn);
            return () => { const i = hooks[stage].indexOf(fn); if (i !== -1) hooks[stage].splice(i, 1); };
        }
        function run(stage, ctx) { for (const fn of hooks[stage]) { g.save(); try { fn(g, ctx); } finally { g.restore(); } } }
        /** Fixed map lights, tiles that give light (fireplaces), and any placed thing with a `light: { radius, color? }`. */
        const tileLights = new Map();
        function lightsOf(map, objects) {
            if (!tileLights.has(map)) {
                const found = [];
                const src = map.source32 || map, k = src === map ? 1 : 2;   // tile lights of a converted map sit at its block centres
                src.tiles.forEach((row, y) => [...row].forEach((ch, x) => { const l = TILE_LIGHTS[nameAt(src, x, y)]; if (l) found.push({ ...l, x: x * k + (k - 1) / 2, y: y * k + (k - 1) / 2, radius: l.radius * k }); }));
                tileLights.set(map, found);
            }
            return [...(map.lights || []), ...tileLights.get(map), ...objects.filter((o) => o.light).map((o) => ({ x: o.x, y: o.y, ...o.light }))];
        }

        /** view = { mapId, x, y (tile units, may be fractional), facing, moving, className, appearance, marker, fade } */
        function draw(view, objects, time) {
            const map = world.maps[view.mapId];
            const src = map.source32 || map, k = src === map ? 1 : 2;
            staticLayer(view.mapId);                                   // (sets T for the painters; reset below)
            T = cellOf(map);
            const PT = T * k;                                          // the painters' tile size
            const mw = map.tiles[0].length * T, mh = map.tiles.length * T;
            const W = canvas.width, H = canvas.height;
            if (dark.width !== W || dark.height !== H) { dark.width = W; dark.height = H; g.imageSmoothingEnabled = false; }   // the stage was refitted (ui/display.js)
            if (view.battle && ENSO.battleHD) return drawBattle(map, view, time, W, H);
            // camera: follow the player, clamp to the map, centre maps smaller than the screen
            const camX = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, view.x * T + T / 2 - W / 2));
            const camY = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, view.y * T + T / 2 - H / 2));
            const ox = -Math.round(camX), oy = -Math.round(camY);
            rect(g, 0, 0, W, H, '#060608');
            g.drawImage(staticLayer(view.mapId), ox, oy);
            g.save(); g.translate(ox, oy);
            const x0 = Math.max(0, Math.floor(camX / PT)), y0 = Math.max(0, Math.floor(camY / PT));
            const x1 = Math.min(src.tiles[0].length - 1, Math.ceil((camX + W) / PT)), y1 = Math.min(src.tiles.length - 1, Math.ceil((camY + H) / PT));
            T = PT;
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ANIMATED.has(nameAt(src, x, y)) && !artCells(src, x, y, UNDER).length) paintTile(g, src, x, y, time);
            T = cellOf(map);
            run('ground', { map, time, ox, oy, view });
            // People, enemies, objects and the player, back to front so whoever stands lower overlaps.
            for (const d of drawOrder(objects, view)) {
                if (d.kind === 'player') { drawPlayer(view.x * T, view.y * T, view, time); continue; }
                const o = d.o;
                if (o.sprite && sprites[o.sprite]) sprites[o.sprite](g, Math.floor(o.x / k) * PT, Math.floor(o.y / k) * PT, PT, time);
                if (!o.seen && o.kind !== 'encounter' && o.kind !== 'npc') {              // a faint glint marks things worth a look
                    const a = 0.35 + 0.35 * Math.sin(time / 350 + o.x * 3 + o.y);
                    g.fillStyle = `rgba(255, 244, 200, ${a})`;
                    g.fillRect(o.x * T + T - 9, o.y * T + 5, 2, 2); g.fillRect(o.x * T + T - 10, o.y * T + 6, 4, 1); g.fillRect(o.x * T + T - 9, o.y * T + 4, 1, 4);
                }
            }
            // Foreground: crowns of trees reach into the row above and cover whoever stands there.
            T = PT;
            for (let y = y0; y <= y1 + 1 && y < src.tiles.length; y++) for (let x = x0; x <= x1; x++) {
                const name = nameAt(src, x, y);
                if (OVERHANGS[name]) OVERHANGS[name](g, x * PT, y * PT, PT, { tx: x, ty: y, time });
                if (src.art) drawArt(g, artCells(src, x, y, ['overhead']), x * PT, y * PT);
            }
            T = cellOf(map);
            run('foreground', { map, time, ox, oy, view });
            if (view.marker) {                                                       // the tracked objective, when it's on this map
                const mx = view.marker.x * T + T / 2, my = view.marker.y * T - 6 + Math.sin(time / 260) * 3;
                g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(mx, my + 1); g.lineTo(mx + 6, my - 6); g.lineTo(mx, my - 13); g.lineTo(mx - 6, my - 6); g.fill();
                g.fillStyle = '#e8c860'; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + 5, my - 6); g.lineTo(mx, my - 12); g.lineTo(mx - 5, my - 6); g.fill();
            }
            g.restore();

            // lighting: darkness with holes for the player's light and fixed light sources
            const amb = map.ambient || {};
            if (amb.tint) { g.fillStyle = amb.tint; g.fillRect(0, 0, W, H); }
            if (opts.post) return postFrame(map, amb, objects, view, time, ox, oy, mw, mh, W, H);   // HD-2D: ui/postfx.js lights and grades
            if (amb.darkness) {
                dg.globalCompositeOperation = 'source-over';
                dg.clearRect(0, 0, W, H);
                dg.fillStyle = `rgba(4, 4, 8, ${amb.darkness})`;
                dg.fillRect(0, 0, W, H);
                dg.globalCompositeOperation = 'destination-out';
                const hole = (x, y, r, strength) => {
                    const gr = dg.createRadialGradient(x, y, 0, x, y, r);
                    gr.addColorStop(0, `rgba(0,0,0,${strength})`); gr.addColorStop(0.55, `rgba(0,0,0,${strength * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
                    dg.fillStyle = gr; dg.fillRect(x - r, y - r, r * 2, r * 2);
                };
                if (amb.lantern) hole(view.x * T + T / 2 + ox, view.y * T + T / 2 + oy, amb.lantern * T, 0.95);
                for (const l of lightsOf(map, objects)) hole(l.x * T + T / 2 + ox, l.y * T + T / 2 + oy, l.radius * T, 0.8);
                g.drawImage(dark, 0, 0);
            }
            // Coloured glow for lights that name a colour (fires, lanterns), with a gentle flicker.
            g.save(); g.globalCompositeOperation = 'lighter';
            for (const l of lightsOf(map, objects)) {
                if (!l.color) continue;
                const r = l.radius * T * (0.6 + 0.04 * Math.sin(time / 130 + l.x * 7 + l.y));
                const cx = l.x * T + T / 2 + ox, cy = l.y * T + T / 2 + oy;
                const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
                gr.addColorStop(0, l.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
            }
            g.restore();
            for (const p of particlesAt(amb.particles, mw, mh, time)) {
                g.fillStyle = `rgba(${p.colour[0]}, ${p.colour[1]}, ${p.colour[2]}, ${p.a})`;
                g.fillRect(p.x + ox, p.y + oy, p.size, p.size);
            }
            run('light', { map, time, ox, oy, view, dark: amb.darkness ? dg : null });
            if (amb.fog === 'bottom') {                      // the road fades into fog at the zone's edge
                const fy = mh + oy;
                const fg = g.createLinearGradient(0, fy - 4 * T, 0, fy);
                fg.addColorStop(0, 'rgba(150, 155, 170, 0)'); fg.addColorStop(1, 'rgba(150, 155, 170, 0.75)');
                g.fillStyle = fg; g.fillRect(0, fy - 4 * T, W, 4 * T);
            }
            const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
            vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
            g.fillStyle = vg; g.fillRect(0, 0, W, H);
            if (view.fade) { g.fillStyle = `rgba(0,0,0,${view.fade})`; g.fillRect(0, 0, W, H); }
        }

        /** HD-2D frame (ui/postfx.js): particles, hooks and fog stay here; darkness, coloured light, vignette
         *  and fade become a list of lights and a grade for the WebGL compositor. Returns { lights, grade, fade }. */
        // HD-2D battle stage (ui/battle-hd.js): a painted backdrop picked from the map the fight began on.
        const themes = new Map();
        function drawBattle(map, view, time, W, H) {
            const BH = ENSO.battleHD;
            if (!themes.has(view.mapId)) {
                const names = {};
                for (const [ch, def] of Object.entries({ ...world.tileset, ...(map.legend || {}) })) names[ch] = def && def.name;
                themes.set(view.mapId, BH.themeFor(map, names));
            }
            const theme = themes.get(view.mapId), amb = map.ambient || {};
            BH.backdrop(g, W, H, theme, time);
            if (amb.tint) { g.fillStyle = amb.tint; g.fillRect(0, 0, W, H); }
            for (const p of particlesAt(amb.particles, W, H, time)) {
                g.fillStyle = `rgba(${p.colour[0]}, ${p.colour[1]}, ${p.colour[2]}, ${p.a})`;
                g.fillRect(p.x, p.y, p.size, p.size);
            }
            if (!opts.post) {
                if (theme.night && theme.stage !== 'interior') { g.fillStyle = 'rgba(4, 4, 12, 0.25)'; g.fillRect(0, 0, W, H); }
                return undefined;
            }
            return { lights: BH.stageLights(theme, W, H, time), grade: ENSO.postfx.gradeFor(amb), fade: view.fade || 0 };
        }

        function postFrame(map, amb, objects, view, time, ox, oy, mw, mh, W, H) {
            const PF = ENSO.postfx;
            for (const p of particlesAt(amb.particles, mw, mh, time)) {
                g.fillStyle = `rgba(${p.colour[0]}, ${p.colour[1]}, ${p.colour[2]}, ${p.a})`;
                g.fillRect(p.x + ox, p.y + oy, p.size, p.size);
            }
            run('light', { map, time, ox, oy, view, dark: null });
            if (amb.fog === 'bottom') {
                const fy = mh + oy;
                const fg = g.createLinearGradient(0, fy - 4 * T, 0, fy);
                fg.addColorStop(0, 'rgba(150, 155, 170, 0)'); fg.addColorStop(1, 'rgba(150, 155, 170, 0.75)');
                g.fillStyle = fg; g.fillRect(0, fy - 4 * T, W, 4 * T);
            }
            const lights = [];
            const px = view.x * T + T / 2 + ox, py = view.y * T + T / 2 + oy;
            if (amb.darkness) lights.push({ x: px, y: py, r: (amb.lantern || 3) * T, color: [0.75, 0.82, 1.0], intensity: 0.9 });
            for (const l of lightsOf(map, objects)) {
                const cx = l.x * T + T / 2 + ox, cy = l.y * T + T / 2 + oy;
                if (cx < -l.radius * T || cy < -l.radius * T || cx > W + l.radius * T || cy > H + l.radius * T) continue;   // off screen
                const flicker = l.color ? 0.92 + 0.08 * Math.sin(time / 130 + l.x * 7 + l.y) : 1;
                lights.push({ x: cx, y: cy, r: l.radius * T * 1.4 * flicker, color: PF.parseColour(l.color || 'rgb(255, 214, 150)'), intensity: l.color ? 1.2 : 0.8 });
            }
            lights.push({ x: px, y: py - 6, r: T * 1.2, color: [0.6, 1.0, 0.85], intensity: 0.35 });      // the faintly glowing hands
            return { lights, grade: PF.gradeFor(amb), fade: view.fade || 0 };
        }

        return { draw, tile: T, addHook };
    }

    // ---------------------------------------------------------------------
    // GFX-3 (#106): depth, foreground, ambience and light hooks. Pure helpers are exported for tests.
    // ---------------------------------------------------------------------
    /** Foreground overhangs: the part of a tall tile that reaches up into the tile ABOVE it. They are drawn
     *  after people and the player, so someone standing just north of a tree is partly hidden by its crown.
     *  (g, px, py, T, c) where (px, py) is the tile's own top-left. */
    const OVERHANGS = {
        tree(g, px, py, T, c) {
            circle(g, px + T / 2, py + 2, T * 0.36, '#1d3023');
            circle(g, px + T / 2 - 4, py - 2, T * 0.2, '#28432e');
            if (hash(c.tx, c.ty, 2) < 0.5) circle(g, px + T / 2 + 5, py + 1, T * 0.14, '#24392a');
        },
        fruit_tree(g, px, py, T, c) {
            circle(g, px + T / 2, py + 3, T * 0.32, '#24402a');
            circle(g, px + T / 2 - 4, py - 1, T * 0.17, '#30553a');
            circle(g, px + 9 + Math.floor(hash(c.tx, c.ty, 7) * 14), py, 1.8, '#b0402e');
        },
        dead_tree(g, px, py, T) {
            g.strokeStyle = '#4a4038'; g.lineWidth = 2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(px + T / 2, py + 6); g.lineTo(px + T / 2 + 1, py - 5); g.moveTo(px + T / 2, py + 2); g.lineTo(px + T / 2 - 6, py - 3); g.stroke();
            g.lineCap = 'butt';
        }
    };
    /** Tiles that give off light wherever they are placed. */
    const TILE_LIGHTS = { fireplace: { radius: 2.2, color: 'rgba(255, 140, 60, 0.30)' }, oven: { radius: 1.8, color: 'rgba(255, 150, 60, 0.28)' } };
    /** Front-to-back drawing order for the things standing on a map: lower on screen = drawn later (in
     *  front). Ties keep their input order, and the player goes after an object on the same row. */
    function drawOrder(objects, player) {
        const list = objects.map((o, i) => ({ kind: 'object', o, y: o.y, i }));
        if (player) list.push({ kind: 'player', y: player.y, i: objects.length + 0.5 });
        return list.sort((a, b) => a.y - b.y || a.i - b.i);
    }
    /** Ambient particles for a map (`ambient.particles: { kind, count }`), as pure positions in pixels.
     *  Deterministic for a given time, so replays and captures look the same. */
    const PARTICLES = {
        dust: { colour: [220, 210, 190], size: 1, speed: 0.004, drift: 0.6, pulse: 0 },
        fireflies: { colour: [200, 255, 150], size: 2, speed: 0.012, drift: 1.6, pulse: 1 },
        embers: { colour: [255, 170, 90], size: 1, speed: 0.02, drift: 0.8, pulse: 0.6, rise: true },
        feathers: { colour: [30, 30, 36], size: 2, speed: 0.01, drift: 1.2, pulse: 0, fall: true },
        smoke: { colour: [170, 165, 160], size: 2, speed: 0.008, drift: 1, pulse: 0.3, rise: true }   // chimneys and malt steam
    };
    function particlesAt(spec, w, h, time) {
        const k = PARTICLES[spec && spec.kind];
        if (!k || !(w > 0) || !(h > 0)) return [];
        const out = [];
        for (let i = 0; i < (spec.count || 24); i++) {
            const bx = hash(i, 1, 77) * w, by = hash(i, 2, 77) * h, ph = hash(i, 3, 77) * Math.PI * 2;
            const t = time * k.speed / 16;
            const vy = k.rise ? -t * 6 : k.fall ? t * 6 : 0;
            const x = ((bx + Math.sin(t / 7 + ph) * 14 * k.drift) % w + w) % w;
            const y = ((by + vy + Math.cos(t / 9 + ph) * 8 * k.drift) % h + h) % h;
            const a = k.pulse ? 0.35 + 0.55 * k.pulse * (0.5 + 0.5 * Math.sin(time / 400 + ph * 3)) : 0.5;
            out.push({ x: Math.floor(x), y: Math.floor(y), size: k.size, a: +a.toFixed(3), colour: k.colour });
        }
        return out;
    }

    /** Draw an enemy (by enemy key) into a small canvas, for battle cards. */
    function drawCreature(c, enemyKey, time) {
        if (ENSO.battleHD) return ENSO.battleHD.drawFoe(c, enemyKey, time);   // 64px HD foes
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.save(); g.scale(c.width / 32, c.height / 32);
        (creatures[CREATURE_FOR[enemyKey]] || creatures.shade)(g, 0, 0, time || 0);
        g.restore();
    }

    ENSO.worldRender = { create, drawCreature, drawOrder, particlesAt, OVERHANGS, PARTICLES, TILE_LIGHTS };
    if (typeof module !== 'undefined' && module.exports) module.exports = ENSO.worldRender;
})(typeof window !== 'undefined' ? window : globalThis);
