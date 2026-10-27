/* =========================================================================
 * Enso's Last Stand — HD BATTLE SCENE (HD-2D overhaul)
 * The battle backdrop (a painted, layered stage chosen from the map the fight started on) and
 * detailed foe sprites drawn at 64px with form shading and a rim light, in place of the 32px map
 * creatures. ui/world-render.js draws the backdrop when view.battle is set and uses these painters
 * for battle cards when this file is loaded. Light comes from the upper left, like ui/tiles-hd.js.
 * Presentation only.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const hash = (x, y, s = 0) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const oval = (g, x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
    const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const line = (g, c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
    /** A body part with form shading: base, a darker belly lower right, a light crown upper left. */
    function shaded(g, x, y, rx, ry, base, dark, light, rot = 0) {
        oval(g, x, y, rx, ry, base, rot);
        g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.clip();
        oval(g, x + rx * 0.35, y + ry * 0.45, rx * 0.95, ry * 0.75, dark, rot);
        oval(g, x - rx * 0.35, y - ry * 0.45, rx * 0.55, ry * 0.4, light, rot);
        g.restore();
    }
    const shadow = (g, x, y, rx) => oval(g, x, y, rx, rx * 0.26, 'rgba(0,0,0,0.38)');
    const eye = (g, x, y, c, r = 1.6) => { oval(g, x, y, r + 0.8, r + 0.8, 'rgba(0,0,0,0.6)'); oval(g, x, y, r, r, c); rect(g, x - r * 0.5, y - r * 0.6, 1, 1, '#fff8e0'); };

    // ---- foes (64 x 64, feet on y 58) --------------------------------------------------------
    const creatures = {
        rat(g, t) {
            const b = Math.sin(t / 160) * 1.2, tw = Math.sin(t / 240);
            shadow(g, 32, 57, 20);
            line(g, '#6a4a3e', 3, [14, 48, 6, 44 + tw * 2, 4, 34 + tw * 3]);
            line(g, '#8a6a5a', 1.5, [14, 48, 6, 44 + tw * 2, 4, 34 + tw * 3]);
            shaded(g, 30, 42 + b, 17, 11, '#8a4e32', '#5e3220', '#b0704a');
            for (let i = 0; i < 7; i++) line(g, '#a8683e', 1, [20 + i * 3, 33 + b, 22 + i * 3, 36 + b]);   // bristles along the spine
            rect(g, 20, 51, 4, 6, '#5a3020'); rect(g, 38, 51, 4, 6, '#5a3020');
            rect(g, 19, 56, 6, 2, '#d8a088'); rect(g, 37, 56, 6, 2, '#d8a088');
            shaded(g, 47, 39 + b, 9, 8, '#9a5a3a', '#6a3a24', '#c08060', -0.3);
            poly(g, '#9a5a3a', [53, 36 + b, 61, 41 + b, 53, 45 + b]);
            oval(g, 61, 41 + b, 2, 1.6, '#d8909a');
            oval(g, 43, 31 + b, 4, 5, '#b07a60'); oval(g, 43, 31 + b, 2.2, 3, '#e0a0a8');
            eye(g, 51, 37 + b, '#f0c050');
            line(g, '#e8e0d0', 1, [56, 44 + b, 56, 47 + b]); line(g, '#e8e0d0', 1, [58, 44 + b, 58, 46 + b]);
            line(g, 'rgba(240,230,210,0.6)', 0.6, [58, 41 + b, 63, 38 + b]); line(g, 'rgba(240,230,210,0.6)', 0.6, [58, 42 + b, 64, 43 + b]);
        },
        wolf(g, t) {
            const b = Math.sin(t / 220) * 1.2, br = Math.sin(t / 500) * 0.6;
            shadow(g, 32, 58, 24);
            line(g, '#4a4a52', 6, [12, 36 + b, 4, 26 + b * 2, 6, 18]);
            line(g, '#6a6a74', 3, [12, 35 + b, 5, 26 + b * 2]);
            for (const [x, d] of [[16, 0], [24, 1], [40, 0], [48, 1]]) {
                rect(g, x, 42, 5, 15, d ? '#3c3c44' : '#4a4a52'); rect(g, x - 1, 55, 7, 3, '#2a2a30');
            }
            shaded(g, 31, 36 + b, 21, 12 + br, '#5c5c66', '#3a3a42', '#8a8a96');
            for (let i = 0; i < 6; i++) poly(g, '#7a7a86', [20 + i * 4, 26 + b, 23 + i * 4, 22 + b, 25 + i * 4, 27 + b]);   // ruff
            shaded(g, 50, 27 + b, 10, 9, '#6a6a74', '#44444c', '#9a9aa6');
            poly(g, '#5c5c66', [55, 24 + b, 64, 30 + b, 62, 34 + b, 54, 33 + b]);
            rect(g, 61, 29 + b, 3, 2, '#1a1a1e');
            poly(g, '#5c5c66', [44, 21 + b, 46, 10 + b, 51, 19 + b]); poly(g, '#c8a0a0', [45.5, 19 + b, 46.5, 13 + b, 49, 19 + b]);
            poly(g, '#4a4a52', [50, 20 + b, 53, 9 + b, 56, 20 + b]);
            line(g, '#f0ece0', 1, [57, 34 + b, 57, 37 + b]); line(g, '#f0ece0', 1, [60, 34 + b, 60, 36 + b]);
            eye(g, 54, 26 + b, '#f0d060', 1.4);
        },
        goblin(g, t) {
            const b = Math.sin(t / 180) * 1.2;
            shadow(g, 32, 58, 15);
            rect(g, 25, 46, 5, 11, '#3a5a2a'); rect(g, 34, 46, 5, 11, '#2e4a22');
            rect(g, 23, 55, 8, 3, '#3a2a1a'); rect(g, 33, 55, 8, 3, '#3a2a1a');
            poly(g, '#6a4a2a', [20, 46 + b, 44, 46 + b, 41, 30 + b, 23, 30 + b]);                         // tunic
            poly(g, '#4e341c', [32, 46 + b, 44, 46 + b, 41, 30 + b, 34, 30 + b]);
            rect(g, 21, 39 + b, 22, 3, '#2a1a10'); rect(g, 30, 39 + b, 4, 3, '#b08a40');
            line(g, '#4e7a34', 5, [23, 33 + b, 16, 40 + b]);                                               // arm and club
            line(g, '#5a3a20', 4, [16, 40 + b, 10, 22 + b]); oval(g, 10, 21 + b, 4, 5, '#6a4a2a');
            rect(g, 8, 18 + b, 1.5, 3, '#a8a8b0'); rect(g, 12, 23 + b, 1.5, 3, '#a8a8b0');
            line(g, '#4e7a34', 5, [41, 33 + b, 46, 41 + b]);
            shaded(g, 32, 22 + b, 11, 10, '#5a8a3e', '#3a6028', '#8aba62');
            poly(g, '#5a8a3e', [21, 20 + b, 8, 13 + b, 22, 25 + b]); poly(g, '#3a6028', [43, 20 + b, 56, 13 + b, 42, 25 + b]);
            poly(g, '#c87a7a', [19, 20 + b, 12, 16 + b, 20, 23 + b]);
            eye(g, 28, 21 + b, '#f0e040', 1.5); eye(g, 36, 21 + b, '#f0e040', 1.5);
            line(g, '#2a3a1a', 1, [26, 18 + b, 30, 19 + b]); line(g, '#2a3a1a', 1, [34, 19 + b, 38, 18 + b]);
            rect(g, 28, 27 + b, 8, 1.5, '#2a1a10'); rect(g, 29, 27 + b, 1.5, 2, '#f0ece0'); rect(g, 34, 27 + b, 1.5, 2, '#f0ece0');
        },
        gnawer(g, t) {
            const b = Math.sin(t / 200) * 1.4;
            shadow(g, 32, 58, 24);
            line(g, '#c8c0a8', 3, [10, 46, 3, 38 + b, 6, 28 + b]);
            for (let i = 0; i < 4; i++) oval(g, 8 - i * 0.5, 43 - i * 4 + b * (i / 3), 2, 1.6, '#e0d8c0');   // tail vertebrae
            shaded(g, 31, 40 + b, 21, 13, '#6a5a52', '#423630', '#9a8878');
            for (let i = 0; i < 5; i++) {                                                                  // exposed ribs
                line(g, '#e8e0cc', 2, [20 + i * 5, 34 + b, 18 + i * 5, 44 + b]);
                line(g, '#8a8070', 1, [21 + i * 5, 35 + b, 19 + i * 5, 45 + b]);
            }
            rect(g, 16, 50, 5, 7, '#4a3e38'); rect(g, 40, 50, 5, 7, '#4a3e38');
            line(g, '#e0d8c0', 1.5, [15, 57, 13, 59]); line(g, '#e0d8c0', 1.5, [44, 57, 46, 59]);
            shaded(g, 49, 32 + b, 11, 10, '#e0d6bc', '#a89c84', '#fff8e8', -0.2);                           // skull
            poly(g, '#e0d6bc', [55, 30 + b, 64, 36 + b, 55, 42 + b]);
            oval(g, 50, 30 + b, 3.5, 3.5, '#1a1410'); oval(g, 50, 30 + b, 1.4, 1.4, '#e05030');
            for (let i = 0; i < 4; i++) poly(g, '#f8f0dc', [55 + i * 2.2, 39 + b, 56 + i * 2.2, 44 + b, 57 + i * 2.2, 39 + b]);
            poly(g, '#a89c84', [44, 24 + b, 40, 14 + b, 47, 22 + b]);
        },
        cultist(g, t) {
            const b = Math.sin(t / 300) * 1, sw = Math.sin(t / 420) * 1.5;
            shadow(g, 32, 58, 16);
            poly(g, '#3a2440', [17 + sw, 58, 47 + sw, 58, 41, 22 + b, 23, 22 + b]);                       // robe
            poly(g, '#26162c', [34 + sw, 58, 47 + sw, 58, 41, 22 + b, 35, 22 + b]);
            poly(g, '#5a3a62', [17 + sw, 58, 26, 58, 26, 26 + b, 23, 22 + b]);
            line(g, '#8a2a2a', 2, [24, 36 + b, 40, 36 + b]);
            line(g, '#c8a050', 1, [32, 26 + b, 32, 50 + b]);
            oval(g, 32, 50 + b, 2.5, 2.5, '#c8a050');
            poly(g, '#2e1c34', [22, 26 + b, 32, 5 + b, 42, 26 + b]);                                       // hood
            poly(g, '#4a3052', [22, 26 + b, 32, 5 + b, 30, 26 + b]);
            oval(g, 32, 20 + b, 6, 6.5, '#0c060e');
            eye(g, 29.5, 20 + b, '#c86aff', 1.1); eye(g, 34.5, 20 + b, '#c86aff', 1.1);
            line(g, '#3a2440', 5, [24, 30 + b, 16, 38 + b]); line(g, '#3a2440', 5, [40, 30 + b, 47, 37 + b]);
            oval(g, 15, 39 + b, 2.5, 2.5, '#c8b8a8'); oval(g, 48, 38 + b, 2.5, 2.5, '#c8b8a8');
            const gl = 0.5 + 0.4 * Math.sin(t / 250);
            oval(g, 48, 33 + b, 4 + gl, 4 + gl, `rgba(190, 110, 255, ${0.25 + gl * 0.3})`); oval(g, 48, 33 + b, 1.6, 1.6, '#f0d8ff');
        },
        ghoul(g, t) {
            const b = Math.sin(t / 260) * 1.6, sw = Math.sin(t / 350);
            shadow(g, 32, 58, 18);
            rect(g, 24, 44, 6, 13, '#5a6a50'); rect(g, 35, 44, 6, 13, '#4a5a42');
            poly(g, '#3a3028', [19, 48 + b, 45, 48 + b, 43, 28 + b, 21, 28 + b]);                          // rags
            for (let i = 0; i < 6; i++) poly(g, '#3a3028', [19 + i * 4.4, 48 + b, 21 + i * 4.4, 53 + b + hash(i, 1) * 3, 23 + i * 4.4, 48 + b]);
            shaded(g, 32, 31 + b, 13, 10, '#6e7e62', '#48563e', '#98a888');
            line(g, '#6e7e62', 5, [20, 30 + b, 12, 44 + b + sw * 2]); line(g, '#48563e', 5, [44, 30 + b, 52, 45 + b - sw * 2]);
            for (const [x, y] of [[12, 44 + sw * 2], [52, 45 - sw * 2]]) for (let k = -1; k <= 1; k++) line(g, '#d8d0b8', 1, [x, y + b, x + k * 2, y + 4 + b]);
            line(g, '#7a7a82', 2, [12, 40 + b, 4, 50 + b]); line(g, '#7a7a82', 2, [52, 41 + b, 60, 51 + b]);     // shackle chains
            for (let i = 0; i < 4; i++) { oval(g, 10 - i * 2, 42 + i * 2.5 + b, 1.4, 1, '#a8a8b0'); oval(g, 54 + i * 2, 43 + i * 2.5 + b, 1.4, 1, '#a8a8b0'); }
            rect(g, 10, 40 + b, 5, 3, '#5a5a62'); rect(g, 49, 41 + b, 5, 3, '#5a5a62');
            shaded(g, 33, 17 + b, 9, 9.5, '#8a9a7c', '#5e6e52', '#b4c4a4');
            line(g, '#2a2a22', 1.5, [26, 10 + b, 28, 6 + b]); line(g, '#2a2a22', 1.5, [33, 8 + b, 34, 4 + b]); line(g, '#2a2a22', 1.5, [39, 10 + b, 41, 7 + b]);
            oval(g, 29.5, 16 + b, 2.6, 3, '#101410'); oval(g, 36.5, 16 + b, 2.6, 3, '#101410');
            oval(g, 29.5, 16 + b, 1, 1, '#c0f0a0'); oval(g, 36.5, 16 + b, 1, 1, '#c0f0a0');
            rect(g, 29, 22 + b, 8, 3, '#1a1410'); for (let i = 0; i < 4; i++) rect(g, 29.5 + i * 2, 22 + b, 1, 1.5, '#d8d0b8');
        },
        constable(g, t) {
            const b = Math.sin(t / 240) * 0.8;
            shadow(g, 32, 58, 15);
            rect(g, 25, 44, 6, 13, '#2a2e3a'); rect(g, 34, 44, 6, 13, '#22252e');
            rect(g, 24, 55, 8, 3, '#1a1a1e'); rect(g, 33, 55, 8, 3, '#1a1a1e');
            poly(g, '#2e3e5a', [20, 47 + b, 44, 47 + b, 42, 24 + b, 22, 24 + b]);                          // coat
            poly(g, '#22304a', [32, 47 + b, 44, 47 + b, 42, 24 + b, 33, 24 + b]);
            poly(g, '#4a5e80', [20, 47 + b, 25, 47 + b, 25, 26 + b, 22, 24 + b]);
            for (let i = 0; i < 3; i++) oval(g, 30.5, 29 + i * 5 + b, 1, 1, '#e0c070');
            rect(g, 21, 38 + b, 22, 3, '#4a3020'); rect(g, 30, 38 + b, 4, 3, '#d8b050');
            poly(g, '#d0d4dc', [24, 25 + b, 40, 25 + b, 32, 31 + b]);                                      // gorget
            line(g, '#2e3e5a', 5, [42, 27 + b, 47, 37 + b]); oval(g, 47, 38 + b, 2.2, 2.2, '#d8b8a0');
            line(g, '#6a5440', 3, [48, 58, 48, 6]); line(g, '#8a7458', 1, [47, 58, 47, 6]);                // pike
            poly(g, '#b8bcc8', [45, 8, 48, 0, 51, 8, 48, 11]); poly(g, '#e8ecf4', [46, 8, 48, 1.5, 48, 10]);
            line(g, '#2e3e5a', 5, [22, 27 + b, 18, 38 + b]); oval(g, 18, 39 + b, 2.2, 2.2, '#d8b8a0');
            shaded(g, 32, 17 + b, 7, 7.5, '#d8b8a0', '#b0907a', '#f0d8c4');
            poly(g, '#8a8a92', [23, 14 + b, 32, 4 + b, 41, 14 + b, 43, 16 + b, 21, 16 + b]);              // kettle helm
            poly(g, '#c0c0c8', [25, 13 + b, 32, 5.5 + b, 32, 13 + b]);
            rect(g, 28, 17 + b, 2, 2, '#1a1a1e'); rect(g, 34, 17 + b, 2, 2, '#1a1a1e');
            rect(g, 29, 22 + b, 6, 1, '#7a5040');
        },
        warden(g, t) {
            const b = Math.sin(t / 280) * 1, fl = Math.sin(t / 150);
            shadow(g, 32, 58, 18);
            poly(g, '#1e1e26', [15, 58, 49, 58, 43, 22 + b, 21, 22 + b]);                                  // cloak
            poly(g, '#14141a', [34, 58, 49, 58, 43, 22 + b, 35, 22 + b]);
            poly(g, '#34343e', [15, 58, 22, 58, 24, 26 + b, 21, 22 + b]);
            for (let i = 0; i < 7; i++) poly(g, '#14141a', [15 + i * 5, 57, 17 + i * 5, 61, 19.5 + i * 5, 57]);   // feathered hem
            poly(g, '#3a3a46', [24, 26 + b, 40, 26 + b, 38, 44 + b, 26, 44 + b]);                         // breastplate
            poly(g, '#5a5a68', [24, 26 + b, 32, 26 + b, 30, 44 + b, 26, 44 + b]);
            line(g, '#8a2a2a', 2, [26, 34 + b, 38, 34 + b]);
            line(g, '#5a4430', 3, [12, 60, 12, 2]);                                                        // halberd
            poly(g, '#a8acb8', [12, 6, 4, 2, 2, 12, 12, 14]); poly(g, '#d8dce8', [12, 7, 6, 4, 5, 10, 12, 12]);
            poly(g, '#a8acb8', [11, 2, 12, -4, 13, 2]);
            line(g, '#1e1e26', 5, [22, 28 + b, 13, 32 + b]);
            poly(g, '#2a2a34', [23, 18 + b, 32, 4 + b, 41, 18 + b, 39, 26 + b, 25, 26 + b]);              // crow-beaked helm
            poly(g, '#44444e', [23, 18 + b, 32, 4 + b, 31, 26 + b, 25, 26 + b]);
            poly(g, '#1a1a20', [29, 19 + b, 32, 31 + b, 35, 19 + b]);
            const glow = 0.7 + 0.3 * fl;
            oval(g, 28.5, 16 + b, 2.5 + glow, 2 + glow, `rgba(255, 60, 40, ${0.25 * glow})`); oval(g, 35.5, 16 + b, 2.5 + glow, 2 + glow, `rgba(255, 60, 40, ${0.25 * glow})`);
            rect(g, 27.5, 15 + b, 2, 2, '#ff5040'); rect(g, 34.5, 15 + b, 2, 2, '#ff5040');
            for (const [x, y, ph] of [[48, 10, 0], [54, 20, 2]]) {                                          // crows circling the shoulder
                const fy = y + Math.sin(t / 200 + ph) * 3, w = Math.sin(t / 90 + ph) * 3;
                poly(g, '#08080c', [x - 5, fy - w, x, fy + 1, x + 5, fy - w, x, fy - 1]);
                rect(g, x + 1, fy - 1, 1, 1, '#e03030');
            }
        },
        shade(g, t) {
            const b = Math.sin(t / 300) * 2.5;
            shadow(g, 32, 58, 13);
            g.save(); g.globalAlpha = 0.85;
            poly(g, '#3e4a3c', [16, 56 + b, 48, 56 + b, 41, 20 + b, 23, 20 + b]);
            for (let i = 0; i < 5; i++) poly(g, '#2a3428', [16 + i * 7, 56 + b, 19 + i * 7, 62 + b * 0.5, 23 + i * 7, 56 + b]);
            g.restore();
            shaded(g, 32, 17 + b, 10, 10.5, '#8a9a80', '#5e6e56', '#b4c4a8');
            oval(g, 28, 16 + b, 2.5, 3, '#141814'); oval(g, 36, 16 + b, 2.5, 3, '#141814');
        }
    };
    const CREATURE_FOR = {
        rust_rat: 'rat', cellar_vermin: 'rat', hungry_wolf: 'wolf',
        weak_goblin: 'goblin', bone_gnawer: 'gnawer', cult_acolyte: 'cultist', shackled_ghoul_stronger: 'ghoul',
        watch_constable: 'constable', crow_touched_warden: 'warden'
    };
    /** Draw a foe into a canvas of any size (the painters work in a 64 x 64 box). */
    function drawFoe(c, enemyKey, time) {
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.save(); g.scale(c.width / 64, c.height / 64);   // painted facing right; world.css mirrors foe cards to face the party
        const art = ENSO.enemySprites;
        if (!art || !art.draw(g, enemyKey, { facing: 'E', state: 'idle', now: time || 0 }))
            (creatures[CREATURE_FOR[enemyKey]] || creatures.shade)(g, time || 0);
        g.restore();
    }

    // ---- backdrop -----------------------------------------------------------------------------
    /** Which stage a map fights on, from its tiles and light (pure). */
    function themeFor(map, tileNames = {}) {
        const count = {};
        for (const row of map.tiles) for (const ch of row) { const n = tileNames[ch] || ch; count[n] = (count[n] || 0) + 1; }
        const top = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([n]) => n);
        const has = (n) => (count[n] || 0) > 0;
        const amb = map.ambient || {};
        const night = (amb.darkness || 0) >= 0.2;
        if (top[0] === 'stone_floor' || top[0] === 'floor') return { stage: 'crypt', night: true, warm: (amb.darkness || 0) < 0.6 };
        if (top[0] === 'wood_floor') return { stage: 'interior', night: true };
        const trees = (count.tree || 0) / (map.tiles.length * map.tiles[0].length);
        if (has('cobble') || has('house_wall') || has('timber_wall')) return { stage: 'village', night };
        return { stage: trees > 0.3 ? 'forest' : 'field', night };
    }

    const SKY = {
        day: ['#7aa0c8', '#b8cce0', '#e8d8b8'], night: ['#0c1024', '#1e2648', '#3a3c5a'],
        crypt: ['#08080c', '#14121a', '#201c26'], interior: ['#120c08', '#2a1c12', '#3a2818']
    };
    const GROUND = {
        field: ['#3e6a32', '#5a8a44'], forest: ['#2e5228', '#4a7238'], village: ['#7d6d5c', '#978570'],
        crypt: ['#2a2830', '#46424e'], interior: ['#3a2618', '#5e4028']
    };
    const dim = (hex, k) => {
        const n = parseInt(hex.slice(1), 16);
        const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
        return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
    };

    /** Paint the battle stage into g (W x H). The horizon sits at 52% so the foes stand on the ground. */
    function backdrop(g, W, H, theme, time) {
        const { stage, night } = theme;
        const hy = Math.round(H * 0.52);
        const k = night && stage !== 'crypt' && stage !== 'interior' ? 0.55 : 1;
        const sky = stage === 'crypt' ? SKY.crypt : stage === 'interior' ? SKY.interior : night ? SKY.night : SKY.day;
        const sg = g.createLinearGradient(0, 0, 0, hy);
        sg.addColorStop(0, sky[0]); sg.addColorStop(0.7, sky[1]); sg.addColorStop(1, sky[2]);
        g.fillStyle = sg; g.fillRect(0, 0, W, hy + 1);

        if (stage === 'crypt') {
            for (let i = 0; i < 6; i++) {                                                   // receding pillars and arches
                const x = (i + 0.5) * W / 6, pw = W * 0.05;
                rect(g, x - pw / 2, H * 0.06, pw, hy - H * 0.06, '#1e1c24');
                rect(g, x - pw / 2, H * 0.06, pw * 0.3, hy - H * 0.06, '#2c2934');
                for (let y = H * 0.1; y < hy; y += H * 0.06) rect(g, x - pw / 2, y, pw, 1, '#121016');
            }
            g.strokeStyle = '#18161e'; g.lineWidth = W * 0.012;
            for (let i = 0; i < 5; i++) { const x = (i + 1) * W / 6; g.beginPath(); g.arc(x, H * 0.16, W / 12, Math.PI, 0); g.stroke(); }
            for (const x of [W * 0.18, W * 0.82]) {                                         // braziers
                rect(g, x - W * 0.012, hy - H * 0.12, W * 0.024, H * 0.12, '#2a2620');
                const f = Math.sin(time / 90 + x) * H * 0.006, bw = W * 0.022, by = hy - H * 0.12;
                rect(g, x - bw, by - H * 0.008, bw * 2, H * 0.012, '#3a342c');
                g.fillStyle = theme.warm ? '#e8702a' : '#c84020';
                g.beginPath(); g.moveTo(x - bw, by - H * 0.008); g.quadraticCurveTo(x - bw * 0.4, by - H * 0.07 + f, x + bw * 0.1, by - H * 0.1 + f); g.quadraticCurveTo(x + bw * 0.3, by - H * 0.05, x + bw, by - H * 0.008); g.fill();
                g.fillStyle = theme.warm ? '#ffd070' : '#ff9050';
                g.beginPath(); g.moveTo(x - bw * 0.5, by - H * 0.008); g.quadraticCurveTo(x - bw * 0.1, by - H * 0.045 - f, x + bw * 0.05, by - H * 0.065 - f); g.quadraticCurveTo(x + bw * 0.2, by - H * 0.03, x + bw * 0.5, by - H * 0.008); g.fill();
            }
        } else if (stage === 'interior') {
            for (let x = 0; x < W; x += W / 14) rect(g, x, 0, 2, hy, '#1a1008');            // plank wall
            rect(g, 0, H * 0.14, W, H * 0.025, '#2a1a0e');
            for (const x of [W * 0.3, W * 0.7]) {                                           // shuttered windows with moonlight
                rect(g, x - W * 0.05, H * 0.2, W * 0.1, H * 0.16, '#2a3450');
                rect(g, x - 1, H * 0.2, 2, H * 0.16, '#1a1008'); rect(g, x - W * 0.05, H * 0.28, W * 0.1, 2, '#1a1008');
            }
            for (let i = 0; i < 4; i++) rect(g, W * (0.08 + i * 0.27), hy - H * 0.08, W * 0.07, H * 0.08, '#2a1c10');   // barrels and crates
        } else {
            if (night) for (let i = 0; i < 70; i++) {                                       // stars
                const a = 0.4 + 0.5 * Math.abs(Math.sin(time / 900 + i));
                rect(g, hash(i, 1, 5) * W, hash(i, 2, 5) * hy * 0.7, 1, 1, `rgba(230, 236, 255, ${a})`);
            } else for (let i = 0; i < 4; i++) {                                            // drifting clouds
                const cx = ((hash(i, 3, 5) * W + time / 120 * (0.5 + hash(i, 4, 5))) % (W * 1.3)) - W * 0.15, cy = H * (0.08 + hash(i, 5, 5) * 0.2);
                for (let j = 0; j < 4; j++) oval(g, cx + j * W * 0.03, cy - (j % 2) * H * 0.012, W * 0.05, H * 0.025, 'rgba(255, 250, 240, 0.55)');
            }
            if (night) { oval(g, W * 0.78, H * 0.13, W * 0.028, W * 0.028, '#f4ecd0'); oval(g, W * 0.786, H * 0.124, W * 0.024, W * 0.024, sky[0]); }
            // far hills, then a ridge of trees or rooftops, each nearer layer darker and sharper
            const hills = (yb, amp, col, seed) => {
                g.fillStyle = col; g.beginPath(); g.moveTo(0, hy);
                for (let x = 0; x <= W; x += W / 40) g.lineTo(x, yb - amp * (0.5 + 0.5 * Math.sin(x / W * 7 + seed) * Math.cos(x / W * 3 + seed * 2)));
                g.lineTo(W, hy); g.fill();
            };
            hills(hy - H * 0.06, H * 0.12, dim('#6a7a98', k * 0.9), 1);
            hills(hy - H * 0.02, H * 0.08, dim('#4a6050', k * 0.85), 4);
            if (stage === 'village') {
                for (let i = 0; i < 9; i++) {
                    const x = (i + hash(i, 6, 5) * 0.5) * W / 9, w = W * (0.06 + hash(i, 7, 5) * 0.03), h = H * (0.08 + hash(i, 8, 5) * 0.06);
                    rect(g, x, hy - h, w, h, dim('#c4b392', k * 0.7));
                    rect(g, x + w * 0.2, hy - h * 0.6, w * 0.18, h * 0.22, night ? '#ffc070' : '#3a3040');
                    poly(g, dim('#843424', k * 0.8), [x - w * 0.12, hy - h, x + w / 2, hy - h - H * 0.06, x + w * 1.12, hy - h]);
                }
            }
            const treeCol = dim(stage === 'forest' ? '#1c321e' : '#2a4a2a', k);
            const trees = stage === 'forest' ? 22 : stage === 'village' ? 6 : 10;
            for (let i = 0; i < trees; i++) {
                const x = hash(i, 9, 5) * W, s = H * (stage === 'forest' ? 0.1 + hash(i, 10, 5) * 0.08 : 0.06 + hash(i, 10, 5) * 0.05);
                rect(g, x - s * 0.07, hy - s * 0.7, s * 0.14, s * 0.7, dim('#3a2a1a', k));
                for (let j = 0; j < 6; j++) {                                               // leaf clumps: dark core, lit crowns upper left
                    const a = hash(i, 20 + j, 5) * Math.PI * 2, rr = s * (0.22 + hash(i, 30 + j, 5) * 0.14);
                    const cx = x + Math.cos(a) * s * 0.3, cy = hy - s * 0.95 + Math.sin(a) * s * 0.3;
                    oval(g, cx, cy, rr, rr * 0.9, treeCol);
                }
                for (let j = 0; j < 4; j++) {
                    const cx = x - s * 0.18 + hash(i, 40 + j, 5) * s * 0.3, cy = hy - s * 1.15 + hash(i, 50 + j, 5) * s * 0.25;
                    oval(g, cx, cy, s * 0.14, s * 0.11, dim(stage === 'forest' ? '#345a30' : '#3f6a36', k * 0.95));
                    oval(g, cx - s * 0.04, cy - s * 0.03, s * 0.06, s * 0.045, dim('#6e9a52', k * 0.85));
                }
            }
        }

        // ground: a perspective plane that brightens toward the viewer, with texture that grows with depth
        const gc = GROUND[stage] || GROUND.field;
        const gg = g.createLinearGradient(0, hy, 0, H);
        gg.addColorStop(0, dim(gc[0], k * 0.7)); gg.addColorStop(1, dim(gc[1], k));
        g.fillStyle = gg; g.fillRect(0, hy, W, H - hy);
        for (let i = 0; i < 260; i++) {
            const d = hash(i, 11, 5), y = hy + d * d * (H - hy), s = 1 + d * 4;
            const x = hash(i, 12, 5) * W;
            if (stage === 'crypt' || stage === 'village') rect(g, x, y, s * 6, Math.max(1, s * 0.4), 'rgba(0,0,0,0.22)');
            else if (stage === 'interior') rect(g, 0, y, W, 1, 'rgba(0,0,0,0.12)');
            else { line(g, dim('#79a85a', k), Math.max(1, s * 0.4), [x, y, x - s * 0.3, y - s * 1.6]); line(g, dim('#30522a', k), Math.max(1, s * 0.4), [x + s, y, x + s * 1.2, y - s * 1.2]); }
        }
        if (stage === 'crypt' || stage === 'village') {                                     // flagstone seams converging on a vanishing point
            g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
            for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(W / 2 + i * W * 0.02, hy); g.lineTo(W / 2 + i * W * 0.16, H); g.stroke(); }
        }
        const haze = g.createLinearGradient(0, hy - H * 0.08, 0, hy + H * 0.1);              // atmospheric haze on the horizon
        const hc = stage === 'crypt' ? '30, 24, 40' : stage === 'interior' ? '60, 40, 24' : night ? '60, 70, 110' : '230, 220, 200';
        haze.addColorStop(0, `rgba(${hc}, 0)`); haze.addColorStop(0.5, `rgba(${hc}, 0.35)`); haze.addColorStop(1, `rgba(${hc}, 0)`);
        g.fillStyle = haze; g.fillRect(0, hy - H * 0.08, W, H * 0.18);
        // foreground framing: out-of-focus silhouettes in the bottom corners (the DoF pass softens them)
        if (stage === 'field' || stage === 'forest' || stage === 'village') {
            const fc = dim(stage === 'village' ? '#2a3a22' : '#1c321e', k * 0.7);
            for (const [x0, dir] of [[0, 1], [W, -1]]) for (let i = 0; i < 14; i++) {
                const x = x0 + dir * hash(i, 60, 5) * W * 0.2, h = H * (0.08 + hash(i, 61, 5) * 0.12);
                poly(g, fc, [x - W * 0.012, H, x + dir * W * 0.02 * hash(i, 62, 5), H - h, x + W * 0.012, H]);
            }
        } else {
            for (const x of [W * 0.02, W * 0.98]) rect(g, x - W * 0.04, 0, W * 0.08, H, stage === 'crypt' ? '#0a090e' : '#140c06');
        }
    }

    /** Lights for the post pass (ui/postfx.js format): a key light over the field plus the stage's own. */
    function stageLights(theme, W, H, time) {
        const hy = H * 0.52, out = [];
        if (theme.stage === 'crypt') {
            for (const x of [W * 0.18, W * 0.82]) out.push({ x, y: hy - H * 0.16, r: W * 0.28 * (0.94 + 0.06 * Math.sin(time / 110 + x)), color: theme.warm ? [1, 0.7, 0.4] : [1, 0.45, 0.3], intensity: 1.1 });
            out.push({ x: W * 0.5, y: H * 0.7, r: W * 0.45, color: [0.6, 0.65, 0.9], intensity: 0.5 });
        } else if (theme.stage === 'interior') {
            for (const x of [W * 0.3, W * 0.7]) out.push({ x, y: H * 0.3, r: W * 0.25, color: [0.6, 0.7, 1], intensity: 0.6 });
            out.push({ x: W * 0.5, y: H * 0.75, r: W * 0.5, color: [1, 0.75, 0.45], intensity: 0.7 });
        } else if (theme.night) {
            out.push({ x: W * 0.78, y: H * 0.13, r: W * 0.4, color: [0.7, 0.8, 1], intensity: 0.6 });
            out.push({ x: W * 0.5, y: H * 0.75, r: W * 0.55, color: [0.75, 0.82, 1], intensity: 0.8 });
        } else {
            out.push({ x: W * 0.2, y: H * 0.05, r: W * 0.7, color: [1, 0.92, 0.75], intensity: 0.5 });
        }
        return out;
    }

    const api = { creatures, CREATURE_FOR, drawFoe, themeFor, backdrop, stageLights };
    ENSO.battleHD = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
