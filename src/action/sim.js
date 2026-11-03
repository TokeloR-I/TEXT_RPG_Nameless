/* =========================================================================
 * Enso's Last Stand — ACTION SIM (combat v3): space and time for one map
 * docs/ACTION_COMBAT.md. Numbers: actionRules in src/data.js.
 *
 * The sim owns where things are and when they happen; the engine owns what
 * they do. Positions are map pixels (sub-tile), time runs in fixed 60 Hz steps
 * whatever the frame rate, and the sim has its own seeded RNG so AI rolls never
 * shift damage or loot rolls. Headless: no DOM, no timers.
 *
 *   const sim = new ActionSim({ engine, session, rules: data.actionRules, seed })
 *   sim.enterMap()                         after a map change (or a respawn)
 *   const out = sim.update(ms, input)      every frame; out = { fx, engineEvents, world }
 *   sim.view()                             what to draw: player, actors, projectiles, telegraphs
 *
 * input: { move: {x, y} (−1..1), aim: {x, y} (map px), sprint, guard (held),
 *          attack, dodge, interact (pressed since the last update), slot (0–5 or null) }
 *
 * What the sim decides: movement and collision (tiles, gate enemies, bodies),
 * the attack state machine (startup → active → recovery), hit tests (arc,
 * cone, circle, line, projectiles), dodge i-frames, guard arc, parry window,
 * stamina, and enemy AI (idle/wander → detect with range + line of sight →
 * engage → chase with grid pathfinding → wind up → strike → recover; leash home),
 * and the player's minions (Raise Skeleton): a body that rises where you aim,
 * follows you, fights enemies near you, and draws their attacks.
 * What it tells the engine: engage, cast, resolve, cancel, windup, strike,
 * minion strike, disengage, tick (engine/action.js).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const STEP = 1000 / 60;
    const MAX_STEPS = 5;
    const DEG = Math.PI / 180;
    const MINION_CRUMBLE_MS = 1600;   // a fallen or dismissed summon's bones fall apart (ui: AFX.crumble)

    function mulberry32(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
    const angleDiff = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
    /** 4-way facing for sprites and for the tile in front of the player (interact). */
    const facingOf = (ang) => { const a = ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return a < Math.PI / 4 || a >= 7 * Math.PI / 4 ? 'right' : a < 3 * Math.PI / 4 ? 'down' : a < 5 * Math.PI / 4 ? 'left' : 'up'; };
    const FACING_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    /** 8-way facing for the player's sprite (N S E W and the diagonals): 45° sectors centred on each direction. */
    const FACINGS8 = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
    const facing8Of = (ang) => FACINGS8[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];

    class ActionSim {
        constructor({ engine, session, rules, seed = 1 }) {
            this.engine = engine;
            this.session = session;
            this.rules = rules || (engine && engine.data.actionRules) || {};
            this.rng = mulberry32(hash(`${seed}:sim`));
            this.acc = 0;
            this.now = 0;
            this.steps = 0;
            this.input = {};
            this.fx = []; this.engineEvents = []; this.worldResults = [];
            this.enterMap();
        }

        // =====================================================================
        // Map
        // =====================================================================
        /** (Re)build the map's collision grid, the player body and every enemy group on it. */
        enterMap() {
            const s = this.session;
            const map = s.map;
            this.mapId = s.mapId;
            this.entry = { x: s.x, y: s.y };   // where the player came in: the respawn point (Thorne)
            this.T = map.tileSize || 32;
            this.w = (map.tiles[0] || '').length;
            this.h = map.tiles.length;
            this.buildSolids();
            const pr = this.rules.player || {};
            const old = this.player;
            this.player = {
                x: (s.x + 0.5) * this.T, y: (s.y + 0.5) * this.T, r: pr.radius || 5,
                angle: FACING_ANGLE[s.facing] || 0, facing: s.facing, facing8: s.facing, moving: false,
                stamina: old ? old.stamina : (this.rules.stamina || {}).max || 100, staminaAt: 0,
                state: 'idle', stateEnd: 0, attack: null, dodge: null, iframesUntil: 0, dodgeReadyAt: 0,
                guarding: false, guardSince: null, hurtUntil: 0, sprinting: false
            };
            this.projectiles = [];
            this.mines = [];
            this.groups = {};
            this.actors = [];
            this.minions = [];        // the player's summons: bodies for combat.minions (and world.followers between fights)
            this.pendingSummon = null;
            for (const enc of s.visibleObjects().filter((o) => o.kind === 'encounter')) this.addGroup(enc);
        }

        buildSolids() {
            this.solid = new Uint8Array(this.w * this.h);
            this.reach = null;
            for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.solid[y * this.w + x] = this.session.solidForAction(x, y) ? 1 : 0;
            // Cells a story change can open or close without a fight: locked ways on and story-conditional objects.
            const map = this.session.map, cells = new Set();
            for (const e of map.exits || []) if (e.requires) cells.add(e.y * this.w + e.x);
            for (const o of [...(map.interactables || []), ...(map.encounters || [])]) {
                if (!o.when && o.kind !== 'pickup' && o.kind !== 'forage') continue;
                for (let y = o.y; y < o.y + (o.h || 1); y++) for (let x = o.x; x < o.x + (o.w || 1); x++) cells.add(y * this.w + x);
            }
            this.storyCells = [...cells].filter((c) => c >= 0 && c < this.solid.length);
        }

        /** Cells the player can walk to from where they stand (4-way flood fill), built on first use after a rebuild. */
        reachable() {
            if (this.reach || !this.player) return this.reach;
            const W = this.w, H = this.h, r = new Uint8Array(W * H);
            const sx = Math.floor(this.player.x / this.T), sy = Math.floor(this.player.y / this.T);
            if (this.solidAt(sx, sy)) return null;
            const q = [sy * W + sx];
            r[q[0]] = 1;
            while (q.length) {
                const c = q.pop(), cx = c % W, cy = (c - cx) / W;
                for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
                    if (this.solidAt(nx, ny) || r[ny * W + nx]) continue;
                    r[ny * W + nx] = 1;
                    q.push(ny * W + nx);
                }
            }
            return (this.reach = r);
        }

        /**
         * An enemy may stand where the player can reach, or in a cell of its own gate that touches such a cell: gate
         * guards hold the near face of the gateway and never back off out of reach (the orchard cultists did).
         */
        actorMayStand(a, x, y) {
            const r = this.reachable();
            if (!r) return true;
            const tx = Math.floor(x / this.T), ty = Math.floor(y / this.T);
            if (r[ty * this.w + tx] === 1) return true;
            const gate = this.gateCellOf(a);
            if (!gate || !gate(tx, ty)) return false;
            return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = tx + dx, ny = ty + dy; return nx >= 0 && ny >= 0 && nx < this.w && ny < this.h && r[ny * this.w + nx] === 1; });
        }

        solidAt(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.solid[ty * this.w + tx] === 1; }
        solidPx(x, y) { return this.solidAt(Math.floor(x / this.T), Math.floor(y / this.T)); }
        solidPxFor(x, y, ignore) { const tx = Math.floor(x / this.T), ty = Math.floor(y / this.T); return this.solidAt(tx, ty) && !(ignore && ignore(tx, ty)); }
        /** A circle body overlaps a solid cell? (Checks the cells its box touches.) */
        bodyBlocked(x, y, r, ignoreGate = null) {
            const T = this.T;
            for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r - 0.01) / T); ty++)
                for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r - 0.01) / T); tx++)
                    if (this.solidAt(tx, ty) && !(ignoreGate && ignoreGate(tx, ty))) return true;
            return false;
        }

        enemyRules(key) { return { ...(this.rules.enemyDefaults || {}), ...((this.rules.enemies || {})[key] || {}) }; }

        addGroup(enc) {
            const T = this.T;
            const cx = (enc.x + (enc.w || 1) / 2) * T, cy = (enc.y + (enc.h || 1) / 2) * T;
            const g = { encounterId: enc.id, keys: [...enc.enemies], loot: enc.loot || null, home: { x: cx, y: cy }, engaged: false, gate: !!enc.gate, cells: [], name: enc.name };
            for (let y = enc.y; y < enc.y + (enc.h || 1); y++) for (let x = enc.x; x < enc.x + (enc.w || 1); x++) g.cells.push(y * this.w + x);
            this.groups[enc.id] = g;
            const n = enc.enemies.length;
            enc.enemies.forEach((key, i) => {
                const a = n === 1 ? 0 : (i / n) * 2 * Math.PI;
                const off = n === 1 ? 0 : Math.min(10, T * 0.6);
                const prof = this.enemyRules(key);
                const hx = cx + Math.cos(a) * off, hy = cy + Math.sin(a) * off;
                this.actors.push({
                    sid: `${enc.id}#${i}`, encounterId: enc.id, index: i, key, engineId: null, prof,
                    x: hx, y: hy, homeX: hx, homeY: hy, r: prof.radius || 6, angle: Math.PI / 2,
                    state: 'idle', stateEnd: 0, nextThinkAt: 0, attackReadyAt: 0, path: null, repathAt: 0,
                    wanderTo: null, hp: null, maxHp: null, stunned: false, speedMult: 1, dead: false, deadAt: 0,
                    windup: null, hurtUntil: 0, name: null, atkReady: {}, openWith: null, phaseIdx: 0, resolve: null, stormIdx: 0, markTurn: 0, roleIdx: (prof.roles ? i : null)
                });
            });
        }

        /** Gate cells stay solid for the player until the gate is beaten; its own enemies walk through them. */
        /** A cell of a gate whose guards are fighting you: your shots fly into the gateway they stand in. */
        engagedGateCell(tx, ty) { return Object.values(this.groups).some((g) => g.engaged && g.gate && g.cells.includes(ty * this.w + tx)); }
        gateCellOf(actor) { const g = this.groups[actor.encounterId]; return g ? (tx, ty) => g.cells.includes(ty * this.w + tx) : null; }

        // =====================================================================
        // The step loop
        // =====================================================================
        update(ms, input = {}) {
            this.fx = [];
            this.engineEvents = [];
            this.worldResults = [];
            // Presses are edges: keep them until the next step reads them.
            for (const k of ['attack', 'dodge', 'interact']) if (input[k]) this.input[k] = true;
            if (input.slot != null) this.input.slot = input.slot;
            Object.assign(this.input, { move: input.move || { x: 0, y: 0 }, aim: input.aim || null, sprint: !!input.sprint, guard: !!input.guard });
            // Drunk (too much beer, src/engine/kitchen.js): up is down and left is right until it wears off.
            if (this.engine.controlsInverted && this.engine.controlsInverted()) this.input.move = { x: -(this.input.move.x || 0), y: -(this.input.move.y || 0) };
            this.acc = Math.min(this.acc + Math.max(0, ms || 0), STEP * MAX_STEPS);
            while (this.acc >= STEP) {
                this.acc -= STEP;
                this.step();
                if (this.mapId !== this.session.mapId) break;   // the player walked off the map
            }
            return { fx: this.fx, engineEvents: this.engineEvents, world: this.worldResults };
        }

        get engaged() { return this.engine.mode === 'combat' && !!this.engine.combat && !!this.engine.combat.action; }

        step() {
            this.now += STEP;
            const e = this.engine;
            if (e.mode !== 'explore' && e.mode !== 'combat') return;   // a menu (level-up path, dialogue) holds the world
            if (this.engaged) this.collect(e.tick(STEP));
            else if (e.actionCalmTick) this.collect(e.actionCalmTick(STEP));   // pre-buffs and cooldowns run out of a fight too
            this.syncFromEngine();
            this.stepPlayer();
            for (const a of this.actors) this.stepActor(a);
            for (const m of this.minions) this.stepMinion(m);
            this.stepFollowerTimer();
            this.stepProjectiles();
            this.stepMines();
            if (!this.engaged && e.actionCalmRegen) this.collect(e.actionCalmRegen(STEP));   // out of a fight your skill resource refills
            this.separate();
            this.checkDrops();
            if (this.input.interact) { this.input.interact = false; this.interact(); }
            if (++this.steps % 15 === 0) this.syncEncounters();
        }

        /** A story flag can show or hide an encounter mid-map (the Warden after "Stand aside"), or open a locked way on
         *  (the orchard gate after the register): match the sim to it without leaving the map. */
        syncEncounters() {
            const visible = this.session.visibleObjects().filter((o) => o.kind === 'encounter');
            let solids = false;
            for (const enc of visible) if (!this.groups[enc.id] && !this.engine.isDefeated(enc.id)) { this.addGroup(enc); solids = solids || !!enc.gate; }
            const ids = new Set(visible.map((o) => o.id));
            for (const g of Object.values(this.groups)) {
                if (ids.has(g.encounterId) || g.engaged || g.cleared) continue;
                delete this.groups[g.encounterId];
                this.actors = this.actors.filter((a) => a.encounterId !== g.encounterId);
                solids = solids || g.gate;
            }
            if (solids || this.solidsStale()) this.buildSolids();
        }

        /** True when a story change since the last build moved a wall: a locked way on that now opens (the orchard
         *  gate once the Captain has the register) or a story-conditional person who came or went. */
        solidsStale() {
            return (this.storyCells || []).some((c) => (this.session.solidForAction(c % this.w, Math.floor(c / this.w)) ? 1 : 0) !== this.solid[c]);
        }

        collect(events) {
            if (!events || !events.length) return;
            this.engineEvents.push(...events);
            for (const ev of events) {
                if (ev.type === 'world.respawn') this.respawned = true;
                if (ev.type === 'action.cleared') this.groupCleared(ev.encounterId);
                if (ev.type === 'action.parry') { const a = this.actors.find((x) => x.engineId === ev.enemyId); if (a) this.stagger(a, (this.guardProfile().parry || {}).staggerMs || 900); }
            }
        }

        /** Engine → sim: HP, stuns, slows, and groups that left the fight (respawn, cleared). */
        syncFromEngine() {
            const v = this.engine.actionView ? this.engine.actionView() : null;
            const byId = {};
            if (v) for (const en of v.enemies) byId[en.id] = en;
            this.pview = v ? v.player : null;
            for (const a of this.actors) {
                if (a.dead || !a.engineId) continue;
                const en = byId[a.engineId];
                if (en) {
                    if (a.hp != null && en.hp < a.hp) { a.hurtUntil = this.now + 160; this.fx.push({ type: 'damage', x: a.x, y: a.y - 12, amount: a.hp - en.hp }); }
                    Object.assign(a, { hp: en.hp, maxHp: en.maxHp, stunned: en.stunned, speedMult: en.speedMult, name: en.name, statuses: en.statuses });
                    const b = this.bossOf(a);
                    if (b && b.phases && !a.illusionOf) {   // boss phases by HP: a new phase opens with its signature move
                        const idx = b.phases.reduce((k, x, i) => (en.hp / en.maxHp <= x.fromHpPct + 1e-9 ? i : k), 0);
                        if (idx > a.phaseIdx) {
                            for (let n = a.phaseIdx + 1; n <= idx; n++) if (b.resolve && b.resolve.atPhase === n + 1 && !a.resolveUsed) this.beginResolve(a, b.resolve);   // once per fight
                            a.phaseIdx = idx; const ph = b.phases[idx];
                            if (ph.openWith) { a.openWith = ph.openWith; a.atkReady[ph.openWith] = 0; }
                            if (ph.speed) a.prof = { ...a.prof, speed: ph.speed };
                            this.fx.push({ type: 'phase', x: a.x, y: a.y, phase: idx + 1 });
                        }
                    }
                    if (a.resolve) this.stepResolve(a);
                    const ill = b && b.illusion;
                    if (ill && !a.illusionOf && !a.illusionUsed && en.hp > 0 && en.hp / en.maxHp <= ill.atHpPct + 1e-9) this.castIllusion(a, ill);
                    if (a.illusionUntil && this.now >= a.illusionUntil) { a.illusionUntil = null; this.collect(this.engine.actionDispelIllusions(a.engineId).events); }
                    if (en.hp <= 0) this.kill(a);
                }
            }
            this.syncMinions(v);
            if (this.respawned) { this.respawned = false; this.onRespawn(); return; }
            for (const g of Object.values(this.groups)) {
                if (!g.engaged) continue;
                const inFight = v && v.groups.includes(g.encounterId);
                if (!inFight && this.engine.isDefeated(g.encounterId)) this.groupCleared(g.encounterId);
                else if (!inFight) this.resetGroup(g);
            }
        }

        kill(a) {
            if (a.dead) return;
            a.dead = true; a.deadAt = this.now; a.state = 'dead'; a.windup = null;
            if (a.illusionOf) { this.fx.push({ type: 'illusion_pop', x: a.x, y: a.y }); return; }   // a false Warden bursts into crows
            this.fx.push({ type: 'death', x: a.x, y: a.y, key: a.key });
        }

        groupCleared(id) {
            const g = this.groups[id];
            if (!g) return;
            g.engaged = false;
            g.cleared = true;
            for (const a of this.actors) if (a.encounterId === id) this.kill(a);
            if (g.gate) this.buildSolids();   // the passage opens
        }

        /** The group left the fight without being beaten: back home, whole, unaware. */
        resetGroup(g) {
            g.engaged = false;
            g.reengageAt = this.now + 1500;
            this.actors = this.actors.filter((x) => !(x.illusionOf && x.encounterId === g.encounterId));   // the false Wardens are gone
            for (const a of this.actors) if (a.encounterId === g.encounterId && !a.dead) {
                Object.assign(a, { engineId: null, hp: null, state: 'return', windup: null, path: null, stunned: false, speedMult: 1, atkReady: {}, openWith: null, phaseIdx: 0, resolve: null, resolveUsed: false, illusionUsed: false, illusionUntil: null, stormIdx: 0, markTurn: 0, prof: this.enemyRules(a.key) });
            }
        }

        /** The player fell: everything on this map goes home and the player stands at the map's safe spawn. */
        onRespawn() {
            for (const g of Object.values(this.groups)) if (g.engaged) this.resetGroup(g);
            for (const a of this.actors) if (!a.dead) { a.x = a.homeX; a.y = a.homeY; a.state = 'idle'; }
            this.projectiles = [];
            this.minions = [];
            this.mines = [];
            const s = this.session;
            s.x = this.entry.x; s.y = this.entry.y;
            const p = this.player;
            p.x = (s.x + 0.5) * this.T; p.y = (s.y + 0.5) * this.T;
            Object.assign(p, { state: 'idle', attack: null, dodge: null, iframesUntil: this.now + 1500, guarding: false });
            this.worldResults.push({ type: 'respawn', x: s.x, y: s.y });
        }

        // =====================================================================
        // Player
        // =====================================================================
        stepPlayer() {
            const p = this.player;
            const inp = this.input;
            const R = this.rules;
            const st = R.stamina || {};
            const dt = STEP / 1000;
            const stunned = !!(this.pview && this.pview.stunned);
            const slow = (this.pview ? this.pview.speedMult : 1) * (this.engine.playerMoveMult ? this.engine.playerMoveMult() : 1);   // food can speed you up
            // Commit an action's direction before starting its cast. Walking must not rotate a swing.
            if (!stunned && (p.state === 'idle' || p.state === 'move')) {
                if (inp.aim) p.angle = angleTo(p, inp.aim);
                else if (inp.move.x || inp.move.y) {
                    // Letting go of a diagonal never lifts both keys on the same frame: the one still held for a few
                    // frames must not snap the facing to a cardinal. A cardinal held past the grace turns as usual.
                    const ang = Math.atan2(inp.move.y, inp.move.x);
                    if (inp.move.x && inp.move.y) { p.angle = ang; p.diagonalUntil = this.now + ((R.player || {}).diagonalReleaseMs ?? 100); }
                    else if (!(this.now < (p.diagonalUntil || 0))) p.angle = ang;
                }
            }

            // stamina
            if (this.now >= p.staminaAt) p.stamina = Math.min(st.max || 100, p.stamina + (st.regenPerSec || 30) * dt);

            // dodge (cancels a cast that hasn't come out)
            const dodgeR = { ...(R.dodge || {}), ...(((R.classes || {})[this.engine.player.className] || {}).dodge || {}) };
            if (inp.dodge) {
                inp.dodge = false;
                if (!stunned && !(this.now < (p.rootUntil || 0)) && p.state !== 'dodge' && this.now >= p.dodgeReadyAt && p.stamina >= (dodgeR.stamina || 25)) {
                    if (p.attack && p.attack.castId && !p.attack.fired) this.engine.actionCancel(p.attack.castId);
                    const m = inp.move;
                    const dir = (m.x || m.y) ? Math.atan2(m.y, m.x) : p.angle;
                    p.stamina -= dodgeR.stamina || 25;
                    p.staminaAt = this.now + (st.regenDelayMs || 600);
                    p.dodge = { angle: dir, speed: (dodgeR.distance || 46) / ((dodgeR.ms || 220) / 1000), fromX: p.x, fromY: p.y };
                    p.state = 'dodge';
                    p.stateEnd = this.now + (dodgeR.ms || 220);
                    p.iframesUntil = this.now + (dodgeR.iframeMs || 200);
                    p.dodgeReadyAt = this.now + (dodgeR.ms || 220) + (dodgeR.cooldownMs || 350);
                    p.attack = null;
                    p.guarding = false;
                    this.fx.push({ type: 'dodge', x: p.x, y: p.y, angle: dir, distance: dodgeR.distance || 46 });
                }
            }

            // guard (held). A fresh press opens the parry window. A parry-only guard (Rogue's Deflect) costs stamina per press.
            const canAct = !stunned && (p.state === 'idle' || p.state === 'move');
            const gp = this.guardProfile();
            const wantGuard = inp.guard && canAct && p.stamina > 0;
            if (wantGuard && !p.guarding) {
                p.guardSince = this.now;
                if (gp.parryOnly && gp.stamina) { p.stamina = Math.max(0, p.stamina - gp.stamina); p.staminaAt = this.now + (st.regenDelayMs || 600); }
            }
            p.guarding = wantGuard;

            // attacks and skills
            if ((inp.attack || inp.slot != null) && canAct && !p.guarding) this.startAttack(inp.slot);
            inp.attack = false;
            inp.slot = null;

            // state timers
            if (p.state === 'dodge' && this.now >= p.stateEnd) { p.state = 'idle'; p.dodge = null; }
            if (p.state === 'attack') this.stepAttack();
            if (p.state === 'hurt' && this.now >= p.stateEnd) p.state = 'idle';

            // movement
            let vx = 0, vy = 0;
            const pr = R.player || {};
            if (p.state === 'dodge') { vx = Math.cos(p.dodge.angle) * p.dodge.speed; vy = Math.sin(p.dodge.angle) * p.dodge.speed; }
            else if (p.state === 'attack' && p.attack && p.attack.dash && this.now < p.attack.dash.until) { vx = Math.cos(p.attack.dash.angle) * p.attack.dash.speed; vy = Math.sin(p.attack.dash.angle) * p.attack.dash.speed; }   // Quick Slash
            else if (!stunned && p.state !== 'hurt' && !(this.now < (p.rootUntil || 0))) {
                const m = inp.move;
                const len = Math.hypot(m.x, m.y);
                if (len > 0) {
                    let speed = pr.speed || 64;
                    p.sprinting = inp.sprint && !p.guarding && p.state !== 'attack' && (!this.engaged || p.stamina > 1);
                    if (p.sprinting) {
                        speed *= pr.sprintMult || 1.5;
                        if (this.engaged) { p.stamina = Math.max(0, p.stamina - (st.sprintPerSec || 18) * dt); p.staminaAt = this.now + (st.regenDelayMs || 600); }
                    }
                    if (p.state === 'attack') speed *= pr.attackMoveMult || 0.35;
                    if (p.guarding) speed *= gp.moveMult ?? 0.45;
                    speed *= slow;
                    vx = (m.x / Math.max(1, len)) * speed; vy = (m.y / Math.max(1, len)) * speed;
                }
            }
            p.moving = !!(vx || vy);
            if (p.state === 'idle' && p.moving) p.state = 'move';
            if (p.state === 'move' && !p.moving) p.state = 'idle';
            const bx = p.x, by = p.y;
            this.moveBody(p, vx * dt, vy * dt, null, (R.player || {}).cornerSlidePx ?? 6);
            p.vx = (p.x - bx) / dt; p.vy = (p.y - by) / dt;   // for leading ground attacks
            p.facing = facingOf(p.angle);     // 4-way: the tile in front (E), exits and saves
            p.facing8 = facing8Of(p.angle);   // 8-way: what the sprite shows
            this.playerTile();
        }

        /** Keep the world session's tile and facing in step with the body (exits, boundaries, E, saves). */
        playerTile() {
            const p = this.player;
            const s = this.session;
            const tx = Math.floor(p.x / this.T), ty = Math.floor(p.y / this.T);
            s.facing = p.facing;
            if (tx === s.x && ty === s.y) return;
            if (this.engaged && (s.map.exits || []).some((e) => e.x === tx && e.y === ty && e.trigger === 'step')) {
                // Leaving mid-fight would strand the engine in combat: the way out is barred while an enemy is close.
                // Nobody near (they can't reach you, or hang back): they give up and you slip away.
                const near = this.actors.some((a) => !a.dead && a.engineId && dist(a, p) <= ((this.rules.combat || {}).exitBlockPx || 96));
                if (near) {
                    p.x = (s.x + 0.5) * this.T; p.y = (s.y + 0.5) * this.T;
                    this.fx.push({ type: 'notice', text: "You can't leave while they're on you." });
                    return;
                }
                for (const g of Object.values(this.groups)) if (g.engaged) this.leash(g);
            }
            const r = s.enterTile(tx, ty, p.facing);
            if (r.type !== 'none' && r.type !== 'moved') this.worldResults.push(r);
            if (r.type === 'transition') this.enterMap();
        }

        /** Axis by axis. `slide` px: a move blocked by a corner it only clips slips around it (walking along walls). */
        moveBody(b, dx, dy, ignore = null, slide = 0) {
            // an enemy standing in reach doesn't step out of it (one already outside, e.g. behind a locked door, can move)
            const ok = b.encounterId && this.actorMayStand(b, b.x, b.y) ? (x, y) => this.actorMayStand(b, x, y) : () => true;
            if (dx) { if (!this.bodyBlocked(b.x + dx, b.y, b.r, ignore) && ok(b.x + dx, b.y)) b.x += dx; else if (!dy && slide) this.slideAround(b, dx, 0, ignore, slide); }
            if (dy) { if (!this.bodyBlocked(b.x, b.y + dy, b.r, ignore) && ok(b.x, b.y + dy)) b.y += dy; else if (!dx && slide) this.slideAround(b, 0, dy, ignore, slide); }
        }

        /** Find the nearest perpendicular offset (up to `max` px) that clears the corner and step toward it. */
        slideAround(b, dx, dy, ignore, max) {
            const step = Math.abs(dx || dy);
            for (let k = 1; k <= max; k++) for (const sgn of [-1, 1]) {
                const ox = dy ? sgn * k : 0, oy = dx ? sgn * k : 0;
                if (this.bodyBlocked(b.x + ox + dx, b.y + oy + dy, b.r, ignore)) continue;
                const m = Math.min(step, k), nx = b.x + Math.sign(ox) * m, ny = b.y + Math.sign(oy) * m;
                if (!this.bodyBlocked(nx, ny, b.r, ignore)) { b.x = nx; b.y = ny; }
                return;
            }
        }

        startAttack(slot) {
            const p = this.player;
            const e = this.engine;
            const weapon = (((this.rules.classes || {})[e.player.className] || {}).weapon) || { kind: 'arc', reach: 20, arcDeg: 100, startupMs: 120, activeMs: 80, recoveryMs: 220 };
            if (!this.engaged) {
                // A shot opens the fight on whoever it is aimed at, as far as it flies; anything else engages the nearest group.
                const opener = this.openerRange(weapon, slot);
                if (!opener || !this.engageAimed(opener)) this.engageNearest();
            }
            if (!this.engaged && slot != null) { this.startCalmSkill(slot); return; }
            if (!this.engaged) {   // a swing at nothing: it looks right and costs nothing
                p.attack = { shape: { ...weapon, shape: weapon.kind }, castId: null, start: this.now, fired: true, cosmetic: true, isBasic: slot == null };
                p.state = 'attack';
                p.stateEnd = this.now + (weapon.startupMs || 120) + (weapon.activeMs || 0) + (weapon.recoveryMs || 200);
                this.fx.push({ type: 'swing', x: p.x, y: p.y, angle: p.angle, cls: e.player.className, shape: p.attack.shape });
                return;
            }
            // Shadowstep: pick who to step behind before paying anything (no one in reach = not cast)
            const pre = slot != null && e.actionSkillPreview ? e.actionSkillPreview(e.ensureSkillBar()[slot]) : null;
            let blink = null;
            if (pre && pre.ok && pre.shape.teleport) {
                blink = this.blinkTarget(pre.shape);
                if (!blink) { this.fx.push({ type: 'notice', text: `${pre.skill}: no enemy in reach to step behind.` }); return; }
            }
            const r = slot != null ? e.actionCast(null, { slot }) : e.actionCast('attack');
            this.collect(r.events);
            if (!r.ok) { this.fx.push({ type: 'refused', code: r.error.code, text: r.error.message }); return; }
            const shape = r.shape || {};
            if (shape.shape === 'summon') this.pendingSummon = { at: this.summonSpot(shape), riseMs: shape.castMs || 0, profile: shape.minion || null };
            if (r.resolved) this.layMines(r.skill, shape);   // Explosive Caltrops: the charges land where you aim
            // Haste (Swift Ghost, Time Mage): the weapon's swing runs faster too, not just skill cooldowns
            const haste = slot == null && e.rtHasteMult ? e.rtHasteMult(e.player) : 1;
            const startup = Math.round((shape.startupMs != null ? shape.startupMs : (shape.castMs || 150)) * haste);
            const recovery = Math.round((shape.recoveryMs != null ? shape.recoveryMs : 200) * haste);
            p.attack = { shape, castId: r.castId, skill: r.skill, start: this.now, fireAt: this.now + startup, fired: r.resolved, isBasic: slot == null, aim: this.input.aim ? { ...this.input.aim } : null };
            p.state = 'attack';
            p.stateEnd = this.now + startup + Math.round((shape.activeMs || 0) * haste) + recovery;
            this.fx.push({ type: r.resolved ? 'cast' : 'swing', x: p.x, y: p.y, angle: p.angle, cls: e.player.className, shape, skill: r.skill });
            if (shape.shape === 'dash') this.beginDash(p.attack, blink);
        }

        /**
         * A skill pressed with no fight on: it plays exactly as it would in one (the bolt flies, the buff glows, the
         * dash moves you, a summon rises and follows you) with nothing to hit. Only summons change anything (they
         * pay and join world.followers); nothing else is spent. Never a weapon swing.
         */
        startCalmSkill(slot) {
            const p = this.player;
            const e = this.engine;
            const name = e.ensureSkillBar()[slot];
            if (!name) { this.fx.push({ type: 'refused', code: 'EMPTY_SLOT', text: `Skill bar slot ${Number(slot) + 1} is empty.` }); return; }
            const pre = e.actionSkillPreview(name);
            if (!pre.ok) { this.fx.push({ type: 'refused', code: pre.error.code, text: pre.error.message }); return; }
            const shape = pre.shape;
            if (shape.teleport) { this.fx.push({ type: 'notice', text: `${name}: no enemy in reach to step behind.` }); return; }
            if (shape.shape === 'summon' && !pre.summon) { this.fx.push({ type: 'notice', text: `${name} only works in a fight.` }); return; }   // Raise Ghoul, March
            if (pre.summon) {
                const r = e.actionSummonFollower(name);
                this.collect(r.events);
                if (!r.ok) { this.fx.push({ type: 'refused', code: r.error.code, text: r.error.message }); return; }
                this.pendingSummon = { at: this.summonSpot(shape), riseMs: shape.castMs || 0, profile: shape.minion || null };
            } else if (e.actionPrebuff && (shape.shape || 'arc') === 'self') {
                // A self buff works for real: cast now, it lasts its usual time and comes into the next fight.
                const problem = e.actionPrebuffProblem(name);
                if (problem && problem.code !== 'FIGHT_ONLY') { this.fx.push({ type: 'refused', code: problem.code, text: problem.message }); return; }
                if (problem) this.fx.push({ type: 'notice', text: problem.message });
                else {
                    const r = e.actionPrebuff(name);
                    this.collect(r.events);
                    if (!r.ok) { this.fx.push({ type: 'refused', code: r.error.code, text: r.error.message }); return; }
                }
            }
            const startup = shape.startupMs != null ? shape.startupMs : (shape.castMs || 150);
            const recovery = shape.recoveryMs != null ? shape.recoveryMs : 200;
            const kind = shape.shape || 'arc';
            const atOnce = kind === 'self' || kind === 'summon';
            p.attack = { shape, castId: null, skill: name, start: this.now, fireAt: this.now + startup, fired: atOnce, cosmetic: true, isBasic: false, aim: this.input.aim ? { ...this.input.aim } : null };
            p.state = 'attack';
            p.stateEnd = this.now + startup + (shape.activeMs || 0) + recovery;
            this.fx.push({ type: atOnce ? 'cast' : 'swing', x: p.x, y: p.y, angle: p.angle, cls: e.player.className, shape, skill: name });
            if (kind === 'dash') this.beginDash(p.attack, null);
        }

        /**
         * Shadowstep's anchor (design §3): the Tab-locked enemy (the aim sits on it), else the nearest engaged enemy
         * within `aimConeDeg` of where you face, within `range` and in sight. Returns { actor, spot } or null.
         */
        blinkTarget(shape) {
            const p = this.player;
            const range = shape.range || 110;
            const inReach = this.liveActors().filter((a) => dist(p, a) <= range + a.r && this.lineOfSight(p, a));
            const aim = this.input.aim;
            const locked = aim && inReach.find((a) => Math.hypot(a.x - aim.x, a.y - aim.y) <= 2);
            const half = ((shape.aimConeDeg || 30) / 2) * DEG;
            const cone = inReach.filter((a) => angleDiff(p.angle, angleTo(p, a)) <= half).sort((a, b) => dist(p, a) - dist(p, b));
            for (const a of locked ? [locked] : cone) {
                const spot = this.behind(a, shape.behindPx || 16);
                if (spot) return { actor: a, spot };
            }
            return null;
        }

        /** A walkable point `px` behind an actor (opposite its facing), turning up to 90° either way to find room. */
        behind(a, px) {
            const r = this.player.r;
            for (const turn of [0, 30, -30, 60, -60, 90, -90]) {
                const ang = a.angle + Math.PI + turn * DEG;
                const d = px + a.r * 0.5;
                const x = a.x + Math.cos(ang) * d, y = a.y + Math.sin(ang) * d;
                if (!this.bodyBlocked(x, y, r) && this.lineOfSight(a, { x, y })) return { x, y };
            }
            return null;
        }

        /**
         * A dash skill moves you for real. Quick Slash: dashPx over dashMs along your facing, then its slash comes out.
         * Shadowstep: vanish, reappear behind the anchor facing its back, i-frames for iframeMs, then the strike.
         */
        beginDash(at, blink) {
            const p = this.player;
            const s = at.shape;
            if (s.teleport && blink) {
                const from = { x: p.x, y: p.y };
                p.x = blink.spot.x; p.y = blink.spot.y;
                p.angle = angleTo(p, blink.actor);
                p.iframesUntil = Math.max(p.iframesUntil, this.now + (s.iframeMs || 150));
                at.target = blink.actor;
                this.fx.push({ type: 'teleport', x: from.x, y: from.y, toX: p.x, toY: p.y });
                this.playerTile();
                return;
            }
            const ms = s.dashMs || 110;
            at.dash = { angle: p.angle, speed: (s.dashPx || 32) / (ms / 1000), until: this.now + ms };
            if (at.fireAt < this.now + ms) {   // the slash comes out at the end of the dash
                p.stateEnd += this.now + ms - at.fireAt;
                at.fireAt = this.now + ms;
            }
        }

        stepAttack() {
            const p = this.player;
            const at = p.attack;
            if (!at) { p.state = 'idle'; return; }
            if (!at.fired && this.now >= at.fireAt) {
                at.fired = true;
                if (this.pview && this.pview.stunned) { this.collect(this.engine.actionCancel(at.castId).events); }
                else this.fire(at);
            }
            if (this.now >= p.stateEnd) { p.state = 'idle'; p.attack = null; }
        }

        /** The attack comes out: the sim decides what it touched; projectiles fly and decide later. */
        fire(at) {
            const p = this.player;
            const s = at.shape;
            const kind = s.shape || s.kind || 'arc';
            if (kind === 'projectile') {
                this.projectiles.push({ owner: 'player', castId: at.castId, cosmetic: !!at.cosmetic, x: p.x, y: p.y, angle: p.angle, speed: s.speed || 200, range: s.range || 120, travelled: 0, r: s.radius || 4, kind: s.projectile || 'arcane',
                    burst: s.burstRadius || 0, burstKind: s.burstKind || 'fire' });   // a bomb or flask bursts where it lands (Saboteur)
                return;
            }
            if (at.cosmetic) {   // out of a fight: the shape shows, nothing is hit
                if (kind === 'circle') this.fx.push({ type: 'aoe', x: p.x, y: p.y, radius: s.radius || 40 });
                if (kind === 'ground') {
                    const aim = at.aim || { x: p.x + Math.cos(p.angle) * 40, y: p.y + Math.sin(p.angle) * 40 };
                    const d = Math.min(dist(p, aim), s.range || 90), ang = angleTo(p, aim);
                    this.fx.push({ type: 'aoe', x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d, radius: s.radius || 30 });
                }
                return;
            }
            if (kind === 'dash' && s.teleport) {   // Shadowstep lands on its anchor (gone already: a whiff)
                this.resolve(at.castId, at.target && !at.target.dead && at.target.engineId ? [at.target] : []);
                return;
            }
            let hits;
            if (kind === 'circle') hits = this.liveActors().filter((a) => dist(p, a) <= (s.radius || 40) + a.r);
            else if (kind === 'ground') {
                const aim = at.aim || { x: p.x + Math.cos(p.angle) * 40, y: p.y + Math.sin(p.angle) * 40 };
                const d = Math.min(dist(p, aim), s.range || 90), ang = angleTo(p, aim);
                const c = { x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d };
                hits = this.liveActors().filter((a) => dist(c, a) <= (s.radius || 30) + a.r);
                this.fx.push({ type: 'aoe', x: c.x, y: c.y, radius: s.radius || 30 });
            } else {
                const reach = s.reach || s.range || 20;
                const half = ((s.arcDeg || 100) / 2) * DEG;
                hits = this.liveActors().filter((a) => dist(p, a) <= reach + a.r && (dist(p, a) < a.r + p.r || angleDiff(p.angle, angleTo(p, a)) <= half) && this.lineOfSight(p, a));
            }
            if (kind === 'circle') this.fx.push({ type: 'aoe', x: p.x, y: p.y, radius: s.radius || 40 });
            hits.sort((a, b) => dist(p, a) - dist(p, b));
            this.resolve(at.castId, hits);
        }

        resolve(castId, hits) {
            const r = this.engine.actionResolve(castId, hits.map((a) => a.engineId));
            this.collect(r.events);
            for (const a of hits) if ((r.hit || []).includes(a.engineId)) {
                this.fx.push({ type: 'hit', x: a.x, y: a.y - 6, angle: angleTo(this.player, a) });
                this.bossHit(a);
                if (!a.prof.boss && a.state !== 'windup' && a.state !== 'active') this.knock(a, angleTo(this.player, a), 4);
            }
        }

        liveActors() { return this.actors.filter((a) => !a.dead && a.engineId && this.groups[a.encounterId].engaged); }

        knock(a, ang, px) { this.moveBody(a, Math.cos(ang) * px, Math.sin(ang) * px, this.gateCellOf(a)); }

        /** Pressing attack near an unaware group starts the fight with it (nearest within engageRadius). */
        /** How far an attack out of a fight can open one: a projectile's range (weapon or skill), else 0 (melee). */
        openerRange(weapon, slot) {
            if (slot == null) return weapon.kind === 'projectile' ? (weapon.range || 120) : 0;
            const e = this.engine;
            const name = e.ensureSkillBar()[slot];
            const pre = name && e.actionSkillPreview ? e.actionSkillPreview(name) : null;
            return pre && pre.ok && pre.shape && pre.shape.shape === 'projectile' ? (pre.shape.range || 120) : 0;
        }

        /**
         * Ranged opener (Tokelo, 2026-11-01): a shot out of a fight engages the unaware group it is aimed at, within
         * `range`, in sight and inside `actionRules.openerConeDeg` of the aim. Returns true if it engaged one.
         */
        engageAimed(range) {
            const p = this.player;
            const aim = this.input.aim;
            const ang = aim ? angleTo(p, aim) : p.angle;
            const half = ((this.rules.openerConeDeg || 30) / 2) * DEG;
            let best = null, bd = Infinity;
            for (const g of Object.values(this.groups)) {
                if (g.engaged || g.cleared || (g.reengageAt && this.now < g.reengageAt)) continue;
                for (const a of this.actors) {
                    if (a.encounterId !== g.encounterId || a.dead) continue;
                    const d = dist(p, a);
                    if (d > range + a.r || d >= bd || angleDiff(ang, angleTo(p, a)) > half || !this.lineOfSight(p, a)) continue;
                    bd = d; best = g;
                }
            }
            return best ? this.engageGroup(best) : false;
        }

        engageNearest() {
            const p = this.player;
            const r = this.rules.engageRadius || 120;
            let best = null, bd = Infinity;
            for (const g of Object.values(this.groups)) {
                if (g.engaged || g.cleared || (g.reengageAt && this.now < g.reengageAt)) continue;
                for (const a of this.actors) if (a.encounterId === g.encounterId && !a.dead) { const d = dist(p, a); if (d < bd) { bd = d; best = g; } }
            }
            if (best && bd <= r) this.engageGroup(best);
        }

        engageGroup(g) {
            if (g.engaged || g.cleared) return false;
            const r = this.engine.actionEngage(g.encounterId, g.keys, g.loot, { mapId: this.mapId, x: g.home.x, y: g.home.y });
            this.collect(r.events);
            if (!r.ok) { if (r.error && r.error.code === 'ALREADY_DEFEATED') this.groupCleared(g.encounterId); return false; }
            g.engaged = true;
            const members = this.actors.filter((a) => a.encounterId === g.encounterId);
            members.forEach((a, i) => { a.engineId = r.ids[i]; a.state = 'chase'; a.attackReadyAt = this.now + 400 + this.rng() * 500; a.hp = null; });
            this.fx.push({ type: 'engage', encounterId: g.encounterId, name: g.name });
            return true;
        }

        // =====================================================================
        // Enemies
        // =====================================================================
        stepActor(a) {
            if (a.dead) return;
            const p = this.player;
            const pr = a.prof;
            const g = this.groups[a.encounterId];
            const dt = STEP / 1000;
            const d = dist(a, p);
            if (!g.engaged) {
                if (a.state === 'return') { if (this.walkTo(a, { x: a.homeX, y: a.homeY }, dt, 1.2)) a.state = 'idle'; return; }
                // idle / wander near home
                if (this.now >= a.nextThinkAt) {
                    a.nextThinkAt = this.now + 1200 + this.rng() * 2200;
                    const w = pr.wander || 0;
                    a.wanderTo = w ? { x: a.homeX + (this.rng() * 2 - 1) * w, y: a.homeY + (this.rng() * 2 - 1) * w } : null;
                }
                if (a.wanderTo && this.walkTo(a, a.wanderTo, dt, 0.4)) a.wanderTo = null;
                const ready = !g.reengageAt || this.now >= g.reengageAt;
                if (ready && (this.engine.mode === 'explore' || this.engaged)) {
                    if (d <= (pr.detect || 90) && (!pr.sight || this.lineOfSight(a, p))) this.engageGroup(g);
                }
                return;
            }
            if (!a.engineId) return;
            const t = this.foeOf(a);   // the player, or a minion nearer to it (Thorne §2: nearest hostile body)
            const dt2 = dist(a, t);
            if (a.stunned && a.state !== 'windup' && a.state !== 'active') { a.state = 'stunned'; return; }
            if (a.state === 'stunned') a.state = 'chase';
            if (a.state === 'stagger') { if (this.now >= a.stateEnd) a.state = 'chase'; return; }
            // leash: far from home and the player is far too → the whole group gives up
            const home = { x: a.homeX, y: a.homeY };
            if (dist(a, home) > (pr.leash || 200) && dist(p, home) > (pr.leash || 200)) { this.leash(g); return; }
            if (a.state === 'windup') {
                if (a.windup.mark && !a.windup.mark.locked) this.trackMark(a);
                if (this.now < a.stateEnd - (a.windup.atk.lockMs != null ? a.windup.atk.lockMs : (pr.lockMs != null ? pr.lockMs : 200))) a.angle = angleTo(a, this.liveBody(a.windup.foe) || p);   // tracks, then locks (Thorne §4)
                if (this.now >= a.stateEnd) this.enemyActive(a);
                return;
            }
            if (a.state === 'active') {
                this.enemyLunge(a, dt);
                if (this.now >= a.stateEnd) this.enemyRecover(a);
                return;
            }
            if (a.state === 'recover') { if (this.now >= a.stateEnd) a.state = 'chase'; return; }
            // chase: pick an attack that fits the distance, else close in (or keep the preferred distance)
            a.angle = angleTo(a, t);
            const atk = this.now >= a.attackReadyAt && this.attackers() < ((this.rules.combat || {}).maxSimultaneousAttackers || 2) ? this.pickAttack(a, dt2, t) : null;
            if (atk) { this.enemyWindup(a, atk); return; }
            const [kmin, kmax] = this.keepRange(a);
            if (dt2 < kmin - 2) { this.walkTo(a, { x: a.x - Math.cos(a.angle) * 20, y: a.y - Math.sin(a.angle) * 20 }, dt, 0.8); return; }
            if (dt2 > kmax + t.r + a.r * 0.5 || (this.attackRanged(a) && !this.lineOfSight(a, t))) this.chase(a, dt, t);
        }

        attackers() { return this.actors.filter((x) => !x.dead && (x.state === 'windup' || x.state === 'active')).length; }

        leash(g) {
            this.collect(this.engine.actionDisengage(g.encounterId).events);
            this.resetGroup(g);
            this.fx.push({ type: 'disengage', encounterId: g.encounterId });
        }

        // ---- attack tables (actionRules.enemies[key].attacks[], bosses[key]) ----
        bossOf(a) { return (this.rules.bosses || {})[a.key] || null; }
        bossPhase(a) {
            const b = this.bossOf(a);
            if (a.illusionOf) a = a.illusionOf;   // a false Warden fights in the real one's phase (his 2-hit sweep)
            if (!b || !b.phases || a.hp == null || !a.maxHp) return null;
            let ph = null;   // a later phase keeps what an earlier one set (phase 3 still sweeps twice) unless it says otherwise
            for (const x of b.phases) if (a.hp / a.maxHp <= x.fromHpPct + 1e-9) ph = { ...(ph || {}), ...x };
            return ph;
        }
        /** Every attack this enemy can use right now: its table, or the boss's current phase. */
        attacksOf(a) {
            const b = this.bossOf(a);
            if (b && b.attacks && a.illusionOf) return ((b.illusion || {}).attacks || ['halberd_sweep']).filter((n) => b.attacks[n]).map((n) => ({ name: n, ...b.attacks[n] }));   // a false Warden swings, it doesn't call crows
            if (b && b.attacks) {
                let names = Object.keys(b.attacks), drop = [];
                for (const x of b.phases || []) if (a.hp != null && a.maxHp && a.hp / a.maxHp <= x.fromHpPct + 1e-9) { if (x.attacks) names = x.attacks; if (x.drop) drop = drop.concat(x.drop); }
                const over = (this.bossPhase(a) || {}).attackOverrides || {};   // a phase can speed a move up (phase 3 crows)
                return names.filter((n) => !drop.includes(n) && b.attacks[n]).map((n) => ({ name: n, ...b.attacks[n], ...(over[n] || {}) }));
            }
            const pr = a.prof;
            if (Array.isArray(pr.attacks) && pr.attacks.length) return pr.attacks.map((x, i) => ({ name: x.name || `${x.skill || 'attack'}#${i}`, ...x }));
            return [{ name: 'primary', shape: pr.shape, reach: pr.reach, arcDeg: pr.arcDeg, width: pr.width, lunge: pr.lunge, windupMs: pr.windupMs, activeMs: pr.activeMs, recoveryMs: pr.recoveryMs, projSpeed: pr.projSpeed, projectile: pr.projectile }];
        }
        keepRange(a) {
            const b = this.bossOf(a), k = (b && b.keepDistance) || a.prof.keepDistance;
            if (Array.isArray(k)) return k;
            if (typeof k === 'number') return [k, Math.max(k, a.prof.reach || 18)];
            return [0, (a.prof.reach || 18) * 0.8];
        }
        attackRanged(a) { return this.attacksOf(a).every((x) => x.shape === 'projectile' || x.shape === 'ground'); }
        /** The attack to start at distance d, or null. Phase openers first; then attacks whose useAt fits; then any in reach. */
        pickAttack(a, d, p = this.player) {
            const list = this.attacksOf(a).filter((x) => !(a.atkReady[x.name] > this.now));
            if (a.roleIdx != null) {
                const roles = a.prof.roles || [];
                const mine = roles[a.roleIdx % roles.length];
                const own = list.filter((x) => !x.role || x.role === mine);
                if (own.length) list.splice(0, list.length, ...own);
            }
            if (a.openWith) { const o = list.find((x) => x.name === a.openWith); a.openWith = null; if (o) return o; }
            const fits = (x) => {
                const reach = (x.reach || 18) + (x.lunge ? 0 : 0);
                if (x.shape === 'ground') return d <= Math.max(140, reach);
                if (x.shape === 'arena') return true;
                if (x.shape === 'mark') return d <= (x.reachPx || 200);
                if (x.shape === 'projectile') return d <= reach && this.lineOfSight(a, p);
                if (x.useWhen === 'playerBeyond80For1500ms') return d > 80;
                if (x.useAt) return d >= x.useAt[0] - p.r && d <= x.useAt[1] + p.r + a.r * 0.5;
                return d <= reach + p.r + a.r * 0.5;
            };
            const ok = list.filter(fits);
            if (!ok.length) return null;
            // cooldown-bound attacks (crows) take their turn when ready; otherwise the first fitting entry. A boss
            // with `alternateSpecials` follows a special with one of his base blows when one fits, so his phase 2
            // and 3 kits sit on top of his base pattern instead of replacing it (Tokelo, 2026-11-02).
            const special = ok.filter((x) => x.cooldownMs >= 5000);
            const plain = ok.filter((x) => !(x.cooldownMs >= 5000));
            const b = this.bossOf(a);
            if (b && b.alternateSpecials && a.lastWasSpecial && plain.length) return plain[0];
            if (b && b.alternateSpecials && special.length > 1) return special.slice().sort((x, y) => (a.atkReady[x.name] || 0) - (a.atkReady[y.name] || 0))[0];   // the one waiting longest
            return special.length ? special[0] : ok[0];
        }

        enemyWindup(a, atk, step = 0) {
            const r = this.engine.actionEnemyWindup(a.engineId, { skill: atk.skill });
            this.collect(r.events);
            if (!r.ok) { a.attackReadyAt = this.now + 300; return; }
            const b = this.bossOf(a);
            if (step === 0 && atk.chain && !atk.combo) {   // a crow storm chain: 2-3 patterns back to back, then the usual recovery
                const c = atk.chain, n = c.min + Math.floor(this.rng() * (c.max - c.min + 1));
                atk = { ...atk, combo: Array.from({ length: n }, (_, i) => ({
                    ...(i ? { windupMs: c.windupMs, markRider: c.markRider || null } : {}),
                    ...(i < n - 1 ? { recoveryMs: c.gapMs } : {})
                })) };
            }
            const st = atk.combo ? { ...atk, ...atk.combo[step] } : atk;
            let windup = st.windupMs || a.prof.windupMs || 520;
            if (b && b.minWindupMs) windup = Math.max(b.minWindupMs, windup);
            if (a.resolve && this.now < a.resolve.until) windup = Math.round(windup * (a.resolve.cfg.windupMult || 1));   // Guardian's Resolve: deliberate blows
            a.state = 'windup';
            a.visualStateStart = this.now;
            a.stateEnd = this.now + windup;
            const foe = st.shape === 'mark' || st.markRider ? this.markTarget(a) : this.foeOf(a);
            a.angle = angleTo(a, foe);
            if (step === 0 && atk.cooldownMs) a.atkReady[atk.name] = this.now + atk.cooldownMs;
            if (step === 0) a.lastWasSpecial = atk.cooldownMs >= 5000;
            if (atk.quietMs) {   // counted from the last storm of a chain   // a crow storm: no other crow special right after it (your window to hit back)
                for (const x of this.attacksOf(a)) if (x.cooldownMs >= 5000 && x.name !== atk.name) a.atkReady[x.name] = Math.max(a.atkReady[x.name] || 0, this.now + windup + atk.quietMs);
            }
            a.windup = { skill: r.skill, atk: st, base: atk, step, start: this.now, end: a.stateEnd, foe };
            if (st.shape === 'ground') a.windup.circles = this.groundTargets(a, st);
            if (st.shape === 'mark' || st.markRider) { a.windup.mark = { x: foe.x, y: foe.y, locked: false, target: foe === this.player ? 'player' : foe.sid }; this.fx.push({ type: 'crow_mark', x: foe.x, y: foe.y, target: a.windup.mark.target }); }
            if (st.shape === 'arena') a.windup.storm = this.nextStorm(a);
        }

        /** Crow shadows: one on the player, the rest where they're heading (Thorne §5). */
        groundTargets(a, st) {
            const p = (a.windup && this.liveBody(a.windup.foe)) || this.foeOf(a);
            const ph = this.bossPhase(a);
            const n = (ph && ph.summonCrowsCount) || st.count || 1;
            const lead = (st.leadMs || 300) / 1000;
            const out = [{ x: p.x, y: p.y }];
            for (let i = 1; i < n; i++) {
                const k = i % 2 ? 1 : 2;
                const j = (this.rng() * 2 - 1) * 16;
                out.push({ x: p.x + (p.vx || 0) * lead * k + j, y: p.y + (p.vy || 0) * lead * k + (this.rng() * 2 - 1) * 16 });
            }
            return out;
        }

        // ---- Crow Warden phases 2 and 3 (Tokelo, 2026-11-02; docs/design/CROW_WARDEN_PHASES.md) ----
        /** Guardian's Resolve: the engine takes 20% off everything he's dealt; the sim slows him and his wind-ups. */
        beginResolve(a, cfg) {
            a.resolveUsed = true;
            a.resolve = { cfg, until: this.now + cfg.ms, vulnerableUntil: this.now + cfg.ms + (cfg.vulnerableMs || 0), broken: false };
            if (this.engine.actionBossStance) this.collect(this.engine.actionBossStance(a.engineId, { name: "Guardian's Resolve", damageTaken: cfg.damageTaken, ms: cfg.ms }).events);
            this.fx.push({ type: 'resolve', x: a.x, y: a.y });
            this.fx.push({ type: 'notice', text: "Guardian's Resolve: the Warden braces. He takes less damage for a few seconds." });
        }
        stepResolve(a) {
            const r = a.resolve;
            if (this.now < r.until) { a.speedMult = (a.speedMult || 1) * (r.cfg.speedMult || 1); return; }
            if (!r.ended) { r.ended = true; this.fx.push({ type: 'resolve_end', x: a.x, y: a.y }); this.fx.push({ type: 'notice', text: 'His guard drops! Hit him now to stagger him.' }); }
            if (this.now >= r.vulnerableUntil || r.broken) a.resolve = null;
        }
        resolveState(a) {
            const r = a.resolve;
            if (!r) return null;
            return this.now < r.until ? 'stance' : (!r.broken && this.now < r.vulnerableUntil ? 'vulnerable' : null);
        }
        /** A hit landed on `a` (player or summon). Right after Guardian's Resolve the first one staggers him. */
        bossHit(a) {
            if (!a || a.dead || this.resolveState(a) !== 'vulnerable') return;
            a.resolve.broken = true;
            this.stagger(a, a.resolve.cfg.staggerMs || 1500);
            this.fx.push({ type: 'notice', text: 'The Warden staggers!' });
        }

        /**
         * Crow's Illusion (Tokelo, 2026-11-02): once, at `atHpPct`, he bursts into crows and steps out as one of
         * count + 1 identical Wardens on a ring around the arena's middle. The copies have 2 HP and hit as hard as he
         * does; hit one and it bursts. They scatter after `ms`, or when he falls.
         */
        castIllusion(a, cfg) {
            a.illusionUsed = true;
            const r = this.engine.actionSpawnIllusions(a.engineId, { count: cfg.count || 4, hp: cfg.hp || 2 });
            this.collect(r.events);
            if (!r.ok) return;
            const ar = (this.bossOf(a) || {}).arena || {};
            const c = ar.home || { x: a.homeX, y: a.homeY };
            const n = r.ids.length + 1, ring = cfg.ringPx || 80, off = this.rng() * 2 * Math.PI;
            const spots = [];
            for (let i = 0; i < n; i++) {
                const ang = off + (i / n) * 2 * Math.PI;
                let x = c.x + Math.cos(ang) * ring, y = c.y + Math.sin(ang) * ring;
                if (this.bodyBlocked(x, y, a.r)) { x = c.x + Math.cos(ang) * ring * 0.5; y = c.y + Math.sin(ang) * ring * 0.5; }
                if (this.bodyBlocked(x, y, a.r)) { x = a.x; y = a.y; }
                spots.push({ x, y });
            }
            for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }   // which spot is real is a coin toss
            this.fx.push({ type: 'illusion_pop', x: a.x, y: a.y });
            Object.assign(a, { x: spots[0].x, y: spots[0].y, state: 'recover', stateEnd: this.now + (cfg.revealMs || 600), windup: null });
            delete this.engine.combat.action.windups[a.engineId];
            a.attackReadyAt = this.now + (cfg.revealMs || 600) + 400;
            r.ids.forEach((id, i) => {
                const sp = spots[i + 1];
                this.actors.push({
                    sid: `${a.encounterId}#illusion${id}`, encounterId: a.encounterId, index: a.index, key: a.key, engineId: id, prof: a.prof, illusionOf: a,
                    x: sp.x, y: sp.y, homeX: a.homeX, homeY: a.homeY, r: a.r, angle: a.angle,
                    state: 'recover', stateEnd: this.now + (cfg.revealMs || 600), nextThinkAt: 0, attackReadyAt: this.now + (cfg.revealMs || 600) + 400 + this.rng() * 900, path: null, repathAt: 0,
                    wanderTo: null, hp: null, maxHp: null, stunned: false, speedMult: 1, dead: false, deadAt: 0,
                    windup: null, hurtUntil: 0, name: a.name, atkReady: {}, openWith: null, phaseIdx: a.phaseIdx, resolve: null, stormIdx: 0, markTurn: 0, roleIdx: null
                });
            });
            for (const s of spots) this.fx.push({ type: 'illusion_pop', x: s.x, y: s.y });
            a.illusionUntil = cfg.ms ? this.now + cfg.ms : null;
            this.fx.push({ type: 'notice', text: "Crow's Illusion: which Warden is real?" });
        }

        /** Marked Prey picks its prey: with summons out it alternates between one of them (the one on him) and you. */
        markTarget(a) {
            const mins = this.liveMinions().filter((m) => m.state !== 'rise');
            if (!mins.length) return this.player;
            const pickMinion = a.markTurn++ % 2 === 0;
            if (!pickMinion) return this.player;
            const f = this.foeOf(a);
            return f !== this.player ? f : mins.slice().sort((x, y) => dist(a, x) - dist(a, y))[0];
        }
        /** The mark follows its prey until lockMs before the dive, then stays where it was. */
        trackMark(a) {
            const w = a.windup, m = w.mark;
            const lock = w.atk.markRider ? (w.atk.markRider.lockMs ?? 450) : w.atk.lockMs != null ? w.atk.lockMs : 500;
            const prey = this.liveBody(w.foe);
            if (this.now >= a.stateEnd - lock || !prey) { m.locked = true; return; }
            m.x = prey.x; m.y = prey.y;
        }
        /** The arena the crow storms cover: the boss's `arena` rectangle, else the map. */
        arenaRect(a) {
            const ar = (this.bossOf(a) || {}).arena;
            if (ar && ar.x1 > ar.x0) return { x0: ar.x0, y0: ar.y0, x1: ar.x1, y1: ar.y1 };
            return { x0: 0, y0: 0, x1: this.w * this.T, y1: this.h * this.T };
        }
        /** The next crow storm in the fixed cycle, as hitbox shapes (circles and bands). */
        nextStorm(a) {
            const list = (this.bossOf(a) || {}).crowStorms || [];
            if (!list.length) return { name: null, shapes: [] };
            const pat = list[a.stormIdx % list.length];
            a.stormIdx++;
            const R = this.arenaRect(a), W = R.x1 - R.x0, H = R.y1 - R.y0;
            const shapes = [];
            for (const z of pat.zones) {
                if (z.kind === 'band') shapes.push({ kind: 'line', x: R.x0, y: R.y0 + z.fy * H, angle: 0, length: W, width: z.h * H });
                else if (z.kind === 'column') shapes.push({ kind: 'line', x: R.x0 + z.fx * W, y: R.y0, angle: Math.PI / 2, length: H, width: z.w * W });
                else if (z.kind === 'spot') shapes.push({ kind: 'circle', x: R.x0 + z.fx * W, y: R.y0 + z.fy * H, radius: z.r * W });
                else if (z.kind === 'ring') for (let i = 0; i < (z.count || 8); i++) {
                    const ang = (i / (z.count || 8)) * 2 * Math.PI;
                    shapes.push({ kind: 'circle', x: a.x + Math.cos(ang) * z.r * W, y: a.y + Math.sin(ang) * z.r * W, radius: (z.size || 0.04) * W });
                }
            }
            return { name: pat.name, index: (a.stormIdx - 1) % list.length, shapes };
        }

        /** The telegraph IS the hitbox (Thorne): what the player sees during the wind-up is what hits. */
        enemyShape(a) {
            const st = (a.windup && a.windup.atk) || this.attacksOf(a)[0];
            const kind = st.shape || 'arc';
            if (kind === 'mark') { const m = (a.windup && a.windup.mark) || { x: a.x, y: a.y }; return { kind: 'circle', x: m.x, y: m.y, radius: st.radius || 22 }; }
            if (kind === 'arena') {
                const shapes = ((a.windup && a.windup.storm && a.windup.storm.shapes) || []).slice();
                const m = a.windup && a.windup.mark;
                if (m && st.markRider) shapes.push({ kind: 'circle', x: m.x, y: m.y, radius: st.markRider.radius || 22 });   // the crow on you lands with the storm
                return { kind: 'multi', shapes };
            }
            if (kind === 'ground') return { kind: 'multi', shapes: (a.windup && a.windup.circles || []).map((c) => ({ kind: 'circle', x: c.x, y: c.y, radius: st.radius || 20 })) };
            if (kind === 'projectile') return { kind: 'line', x: a.x, y: a.y, angle: a.angle, length: st.reach || 100, width: st.width || 6 };
            if (kind === 'line') return { kind: 'line', x: a.x, y: a.y, angle: a.angle, length: (st.reach || 20) + (st.lunge && !(st.reach > st.lunge) ? st.lunge : 0), width: st.width || 10 };
            if (kind === 'circle') return { kind: 'circle', x: a.x, y: a.y, radius: st.radius || st.reach || 24 };
            return { kind: 'arc', x: a.x, y: a.y, angle: a.angle, arc: (st.arcDeg || 100) * DEG, reach: (st.reach || 18) + 4 };
        }

        enemyActive(a) {
            const w = a.windup;
            const st = w.atk;
            a.state = 'active';
            a.visualStateStart = this.now;
            a.stateEnd = this.now + (st.activeMs != null ? st.activeMs : 110);
            w.shape = this.enemyShape(a);   // from where it stands now (a lunge started from here)
            if (st.shape === 'projectile') {
                this.projectiles.push({ owner: 'enemy', actor: a, atk: st, x: a.x, y: a.y, angle: a.angle, speed: st.projSpeed || a.prof.projSpeed || 140, range: (st.reach || 100) + 20, travelled: 0, r: st.radius || (st.width ? st.width / 2 : 4), kind: st.projectile || a.prof.projectile || (st.skill === 'Chain Lock' ? 'feather' : 'shadow') });
                return;
            }
            const touches = (b) => (w.shape.kind === 'multi' ? w.shape.shapes.some((c) => this.inShape(c, b)) : this.inShape(w.shape, b));
            this.strikeBodies(a, touches, st);
            if (w.mark) for (let i = 0; i < (st.count || 3); i++) this.fx.push({ type: 'crow_dive', x: w.mark.x + (i - 1) * 6, y: w.mark.y + (i % 2 ? -4 : 3), delayMs: i * 60 });
            if (st.shape === 'arena') this.fx.push({ type: 'crow_storm', name: w.storm && w.storm.name });
            if (w.shape.kind === 'multi' || w.shape.kind === 'circle') for (const c of (w.shape.shapes || [w.shape])) this.fx.push({ type: 'aoe', x: c.x, y: c.y, radius: c.radius });
        }

        /** After the blow: the next hit of a combo, or recovery and a gap before the next attack. */
        enemyRecover(a) {
            const w = a.windup;
            const b = this.bossOf(a);
            const ph = this.bossPhase(a);
            const base = w ? w.base : {};
            const combo = base.combo || (ph && ph.sweepCombo && base.name === 'halberd_sweep' ? Array.from({ length: ph.sweepCombo.hits }, (_, i) => (i ? { windupMs: ph.sweepCombo.gapMs } : {})) : null);
            if (combo && w.step + 1 < combo.length && !a.dead && a.engineId) { this.enemyWindup(a, { ...base, combo }, w.step + 1); return; }
            let rec = (w && w.atk.recoveryMs != null ? w.atk.recoveryMs : a.prof.recoveryMs) || 600;
            for (const x of (b && b.phases) || []) if (x.recoveryMult && a.hp / a.maxHp <= x.fromHpPct + 1e-9) rec = Math.max(500, rec * x.recoveryMult);
            a.state = 'recover';
            a.visualStateStart = this.now;
            a.stateEnd = this.now + rec;
            const gap = a.illusionOf && b.illusion && b.illusion.attackGapMs != null ? b.illusion.attackGapMs : b && b.attackGapMs != null ? b.attackGapMs : 200 + this.rng() * 700;
            a.attackReadyAt = a.stateEnd + gap;
        }

        enemyLunge(a, dt) {
            const st = a.windup && a.windup.atk;
            if (!st || !st.lunge || !st.activeMs) return;
            const v = st.lunge / (st.activeMs / 1000);
            this.moveBody(a, Math.cos(a.angle) * v * dt, Math.sin(a.angle) * v * dt, this.gateCellOf(a));
        }

        inShape(s, b) {
            if (s.kind === 'circle') return Math.hypot(b.x - s.x, b.y - s.y) <= s.radius + b.r;
            if (s.kind === 'line') {
                const dx = b.x - s.x, dy = b.y - s.y;
                const along = dx * Math.cos(s.angle) + dy * Math.sin(s.angle);
                const across = Math.abs(-dx * Math.sin(s.angle) + dy * Math.cos(s.angle));
                return along >= -b.r && along <= s.length + b.r && across <= s.width / 2 + b.r;
            }
            const d = Math.hypot(b.x - s.x, b.y - s.y);
            return d <= s.reach + b.r && (d < b.r * 2 || angleDiff(s.angle, Math.atan2(b.y - s.y, b.x - s.x)) <= s.arc / 2);
        }

        /** An enemy blow reaches the player's space: dodge i-frames, guard arc and parry window decide. */
        strikePlayer(a, touching, st = {}) {
            const p = this.player;
            const R = this.rules;
            if (!touching || this.now < p.iframesUntil) {
                const r = this.engine.actionEnemyStrike(a.engineId, { hit: false, targetId: this.engine.player.id });
                this.collect(r.events);
                if (touching) this.fx.push({ type: 'perfect_dodge', x: p.x, y: p.y });
                return;
            }
            // The class's guard profile (actionRules.classes[cls].guard over actionRules.guard): its arc (the Mage and
            // Necromancer wards are 360°), its parry window (none for a ward: `parry: null`) and parryOnly (Deflect:
            // outside the window the hit lands in full).
            const g = this.guardProfile();
            const arc = g.arcDeg || 140;
            const facingIt = arc >= 360 || angleDiff(p.angle, angleTo(p, a)) <= (arc / 2) * DEG;
            const raised = p.guarding && facingIt && st.guardable !== false && p.stamina > 0;
            const parried = raised && !!g.parry && st.parryable !== false && p.guardSince != null && this.now - p.guardSince <= (g.parry.windowMs || 160);
            const guarded = raised && (!g.parryOnly || parried);
            const r = this.engine.actionEnemyStrike(a.engineId, { hit: true, guarded, parried, damageMult: st.damageMult || 1, targetId: this.engine.player.id });
            this.collect(r.events);
            if (!r.ok) return;
            if (r.result === 'evaded') { this.fx.push({ type: 'evade', x: p.x, y: p.y, why: r.why }); return; }   // Evasion or a blinded swing: no flinch
            if (r.result === 'parried') { this.fx.push({ type: 'parry', x: p.x, y: p.y }); return; }
            if (r.result === 'guarded') {
                p.stamina = Math.max(0, p.stamina - (st.blockCost || g.staminaPerHit || 14) * (g.staminaMult ?? 1));
                p.staminaAt = this.now + ((R.stamina || {}).regenDelayMs || 600);
                this.fx.push({ type: 'guard', x: p.x, y: p.y, angle: p.angle });
                return;
            }
            if (r.result === 'hit') {
                const pr = R.player || {};
                if (p.state !== 'attack' || !p.attack || p.attack.fired) { p.state = 'hurt'; p.stateEnd = this.now + (st.staggers ? (pr.staggerMs || 400) : (pr.hurtMs || 220)); }
                const away = angleTo(a, p);
                const kb = st.knockbackPx || 5;
                this.moveBody(p, Math.cos(away) * kb, Math.sin(away) * kb);
                if (st.onHit) {   // Chain Lock: rooted and pulled in
                    p.rootUntil = this.now + (st.onHit.ms || 1000);
                    if (st.onHit.pullPx) this.moveBody(p, -Math.cos(away) * st.onHit.pullPx, -Math.sin(away) * st.onHit.pullPx);
                    this.fx.push({ type: 'notice', text: 'Chained! You can\'t move.' });
                }
                this.fx.push({ type: 'player_hit', x: p.x, y: p.y });
            }
        }

        /** The player's guard: the class's `guard` block over `actionRules.guard`, and its parry (null = cannot parry). */
        guardProfile() {
            const R = this.rules;
            const cls = (((R.classes || {})[this.engine.player.className] || {}).guard) || {};
            const parry = cls.parry === null ? null : { ...(R.parry || {}), ...(cls.parry || {}) };
            return { ...(R.guard || {}), ...cls, parry };
        }

        stagger(a, ms) { a.state = 'stagger'; a.stateEnd = this.now + ms; a.windup = null; this.fx.push({ type: 'stagger', x: a.x, y: a.y }); }

        /** Walk toward a point (straight). Returns true on arrival. */
        walkTo(a, to, dt, mult = 1) {
            const d = dist(a, to);
            if (d < 1.5) return true;
            const v = (a.prof.speed || 42) * mult * (a.speedMult || 1) * dt;
            const ang = angleTo(a, to);
            const bx = a.x, by = a.y;
            this.moveBody(a, Math.cos(ang) * Math.min(v, d), Math.sin(ang) * Math.min(v, d), this.gateCellOf(a));
            a.angle = ang;
            return a.x === bx && a.y === by;   // stuck counts as there
        }

        /** Chase the player: straight when the way is clear, else follow a grid path (refreshed every 250 ms). */
        chase(a, dt, p = this.player) {
            if (this.lineOfSight(a, p, true)) { a.path = null; this.walkTo(a, p, dt); return; }
            if (!a.path || this.now >= a.repathAt) { a.path = this.findPath(a, p); a.repathAt = this.now + 250 + this.rng() * 100; }
            if (!a.path || !a.path.length) return;
            const next = a.path[0];
            if (dist(a, next) < 3) { a.path.shift(); return; }
            this.walkTo(a, next, dt);
        }

        /** BFS over walkable cells (8-way, no corner cutting), capped. Returns tile centres to walk, or null. */
        findPath(a, target) {
            const T = this.T, W = this.w, H = this.h;
            const sx = Math.floor(a.x / T), sy = Math.floor(a.y / T), tx = Math.floor(target.x / T), ty = Math.floor(target.y / T);
            const gate = this.gateCellOf(a);
            const free = (x, y) => !this.solidAt(x, y) || (gate && gate(x, y));
            const start = sy * W + sx, goal = ty * W + tx;
            const prev = new Int32Array(W * H).fill(-1);
            prev[start] = start;
            const q = [start];
            let found = false;
            for (let qi = 0; qi < q.length && qi < 2000; qi++) {
                const c = q[qi];
                if (c === goal) { found = true; break; }
                const cx = c % W, cy = (c - cx) / W;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H || !free(nx, ny)) continue;
                    if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;
                    const n = ny * W + nx;
                    if (prev[n] !== -1) continue;
                    prev[n] = c;
                    q.push(n);
                }
            }
            if (!found) return null;
            const path = [];
            for (let c = goal; c !== start; c = prev[c]) path.push({ x: (c % W + 0.5) * T, y: (Math.floor(c / W) + 0.5) * T });
            return path.reverse();
        }

        /** Nothing solid between two points (stepping 4 px). `wide`: clear for a body too (chase straight). */
        lineOfSight(a, b, wide = false) {
            const d = dist(a, b);
            const n = Math.ceil(d / 4);
            // a gate's guards see and shoot out of their own gate, and can be seen (and hit) standing in it
            const ga = a.encounterId ? this.gateCellOf(a) : null, gb = !wide && b.encounterId ? this.gateCellOf(b) : null;
            const gate = ga && gb ? (tx, ty) => ga(tx, ty) || gb(tx, ty) : ga || gb;
            for (let i = 1; i < n; i++) {
                const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
                if (wide ? this.bodyBlocked(x, y, a.r || 4, gate) : this.solidPxFor(x, y, gate)) return false;
            }
            return true;
        }

        // =====================================================================
        // Minions (Raise Skeleton): bodies for the engine's combat.minions
        // =====================================================================
        /** Does this skill summon (an effect of type 'summon')? Data decides, never the skill's name. */
        isSummonSkill(name) {
            const sk = name && this.engine.data.skillDefinitions[name];
            return !!(sk && (sk.effects || []).some((x) => x.type === 'summon'));
        }

        /** Where a summon rises: the aim point, at most `range` px away, on walkable ground (else nearer you). */
        summonSpot(shape) {
            const p = this.player;
            const aim = this.input.aim || { x: p.x + Math.cos(p.angle) * 24, y: p.y + Math.sin(p.angle) * 24 };
            const ang = angleTo(p, aim);
            const r = (shape.minion && shape.minion.radius) || 5;
            for (let d = Math.min(dist(p, aim), shape.range || 40); d >= 0; d -= 4) {
                const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
                if (!this.bodyBlocked(x, y, r)) return { x, y };
            }
            return { x: p.x, y: p.y };
        }

        /**
         * A minion's body profile (follow distances, speed, attack): the `minion` block of the summon skill that makes
         * this summon type, else the first one any summon skill has (Raise Ghoul has none of its own yet).
         */
        minionProfile(type) {
            const by = (this.rules.skillShapes || {}).bySkill || {};
            const defs = this.engine.data.skillDefinitions;
            let first = null;
            for (const sh of Object.values(by)) if (sh.minions && sh.minions[type]) return sh.minions[type];   // March's champion
            for (const [name, sh] of Object.entries(by)) {
                if (!sh.minion) continue;
                const fx = (defs[name] || {}).effects || [];
                if (sh.minion.attack && fx.some((x) => x.type === 'summon')) first = first || sh.minion;   // a raised fighter's profile is the fallback (not the ghoul's or a shadow's)
                if (fx.some((x) => x.summon_type === type && (x.type === 'summon' || x.type === 'ghoul_shield' || x.type === 'shadow_summon'))) return sh.minion;
            }
            return first || { radius: 5, speed: 64, followMin: 24, followMax: 40, engageRadius: 110, teleportBeyond: 220, attack: { shape: 'arc', reach: 16, arcDeg: 70, windupMs: 350, activeMs: 80, recoveryMs: 450, cooldownMs: 1500 } };
        }

        liveMinions() { return this.minions.filter((m) => !m.dead); }
        /** The body if it's still standing (a minion that died mid-windup stops being a target). */
        liveBody(b) { return b && !b.dead ? b : null; }

        /** Engine → sim: a new minion rises (where you aimed), a fallen one crumbles, HP and statuses follow. */
        syncMinions(v) {
            const list = v ? v.minions || [] : (this.engine.actionFollowers ? this.engine.actionFollowers() : []);
            this.minionFocusId = v ? v.minionFocusId || null : null;
            const ids = new Set(list.map((m) => m.id));
            for (const m of this.minions) if (!m.dead && !ids.has(m.engineId)) {
                m.dead = true; m.deadAt = this.now; m.state = 'dead';   // the bones fall apart (ui: AFX.crumble)
                if (m.ghoul && m.ghoul.phase === 'charging' && !m.burst) this.fx.push({ type: 'aoe', x: m.x, y: m.y, radius: m.prof.burstRadius || 40 });   // it burst where it stood
                this.fx.push({ type: 'crumble', x: m.x, y: m.y, key: m.key });
            }
            this.minions = this.minions.filter((m) => !m.dead || this.now - m.deadAt < MINION_CRUMBLE_MS);
            for (const en of list) {
                let m = this.minions.find((x) => x.engineId === en.id && !x.dead);
                if (!m) {
                    const ps = this.pendingSummon;
                    this.pendingSummon = null;
                    const prof = { ...this.minionProfile(en.summonType), ...((ps && ps.profile) || {}) };
                    const p = this.player;
                    const n = this.liveMinions().length;
                    const at = ps ? ps.at : { x: p.x + Math.cos(p.angle + Math.PI / 2 + n) * 16, y: p.y + Math.sin(p.angle + Math.PI / 2 + n) * 16 };
                    const spot = this.bodyBlocked(at.x, at.y, prof.radius || 5) ? { x: p.x, y: p.y } : at;
                    m = {
                        sid: `minion:${en.id}`, engineId: en.id, key: en.summonType || 'skeleton', name: en.name, prof,
                        x: spot.x, y: spot.y, r: prof.radius || 5, angle: p.angle,
                        state: 'rise', stateEnd: this.now + ((ps && ps.riseMs) || 0), visualStateStart: this.now,
                        readyAt: 0, path: null, repathAt: 0, targetId: null, hp: en.hp, maxHp: en.maxHp, hurtUntil: 0, dead: false, deadAt: 0
                    };
                    this.minions.push(m);
                    this.fx.push({ type: 'summon', x: m.x, y: m.y, key: m.key, ms: (ps && ps.riseMs) || 0 });
                }
                if (m.hp != null && en.hp < m.hp) { m.hurtUntil = this.now + 160; this.fx.push({ type: 'damage', x: m.x, y: m.y - 12, amount: m.hp - en.hp, ally: true }); }
                Object.assign(m, { hp: en.hp, maxHp: en.maxHp, stunned: en.stunned, speedMult: en.speedMult, statuses: en.statuses, taunting: en.taunting, name: en.name, ghoul: en.ghoul || null });
            }
        }

        /** Ms of calm your summons have left before they fall apart (null in a fight or with none). */
        followerTimeLeft() {
            if (this.engaged || this.calmSince == null) return null;
            return Math.max(0, ((this.rules.summons || {}).lingerOutOfCombatMs ?? 60000) - (this.now - this.calmSince));
        }

        /** Out of a fight your summons follow you for actionRules.summons.lingerOutOfCombatMs, then crumble. A fight resets it. */
        stepFollowerTimer() {
            if (this.engaged || !this.liveMinions().length) { this.calmSince = null; return; }
            if (this.calmSince == null) this.calmSince = this.now;
            if (this.followerTimeLeft() > 0 || !this.engine.actionDismissFollowers) return;
            this.calmSince = null;
            this.collect(this.engine.actionDismissFollowers().events);
        }

        /**
         * Who an enemy goes for: a taunting minion (Shield of the Dead), else the nearest hostile body, the player or a
         * minion (a tie goes to the player, Thorne §2). It keeps its pick until another body is clearly (8 px) nearer.
         */
        foeOf(a) {
            const p = this.player;
            const mins = this.liveMinions().filter((m) => m.state !== 'rise');
            if (!mins.length) return p;
            const taunter = mins.find((m) => m.taunting);
            if (taunter) return taunter;
            const cur = a.foe && (a.foe === p || mins.includes(a.foe)) ? a.foe : p;
            let best = cur, bd = dist(a, cur);
            for (const b of [p, ...mins]) { const d = dist(a, b) + (b === p ? 0 : 0.01); if (d < bd - 8) { best = b; bd = d; } }
            a.foe = best;
            return best;
        }

        /** An enemy blow comes out: its intended body if the shape reaches it, else any body it reaches, else a miss. */
        strikeBodies(a, touches, st) {
            const want = this.liveBody(a.windup && a.windup.foe) || this.player;
            const hit = [this.player, ...this.liveMinions().filter((m) => m.state !== 'rise')].filter(touches);
            const body = hit.includes(want) ? want : hit[0];
            if (body && body !== this.player) this.strikeMinion(a, body, st);
            else this.strikePlayer(a, body === this.player, st);
        }

        /** A blow lands on a minion: no guard or parry, just damage (the engine's rules) and a small shove. */
        strikeMinion(a, m, st = {}) {
            const r = this.engine.actionEnemyStrike(a.engineId, { hit: true, damageMult: st.damageMult || 1, targetId: m.engineId });
            this.collect(r.events);
            if (!r.ok || r.result !== 'hit') return;
            const away = angleTo(a, m);
            this.moveBody(m, Math.cos(away) * (st.knockbackPx || 4), Math.sin(away) * (st.knockbackPx || 4));
            this.fx.push({ type: 'hit', x: m.x, y: m.y - 6, angle: away, ally: true });
        }

        /** The engaged enemy a minion should fight: Grave Command's focus, else the nearest one near its owner. */
        minionTarget(m) {
            const p = this.player;
            const reach = m.prof.engageRadius || 110;
            const near = this.liveActors().filter((a) => dist(p, a) <= reach + a.r);
            const focus = this.minionFocusId && near.find((a) => a.engineId === this.minionFocusId);
            if (focus) return focus;
            const cur = near.find((a) => a.engineId === m.targetId);
            if (cur) return cur;
            near.sort((x, y) => dist(m, x) - dist(m, y));
            return near[0] || null;
        }

        /** Rise → follow you → close on an enemy near you → wind up → club → recover. Teleports back if left behind. */
        stepMinion(m) {
            if (m.dead) return;
            const p = this.player;
            const pr = m.prof;
            const atk = pr.attack || {};
            const dt = STEP / 1000;
            if (m.state === 'rise') { if (this.now >= m.stateEnd) { m.state = 'idle'; m.visualStateStart = this.now; } return; }
            if (m.ghoul && m.ghoul.phase === 'charging') { if (!m.burst) this.stepGhoulCharge(m, STEP / 1000); return; }   // Raise Ghoul: no leash while it charges
            if (dist(m, p) > (pr.teleportBeyond || 220)) {
                const back = { x: p.x - Math.cos(p.angle) * (pr.followMin || 24), y: p.y - Math.sin(p.angle) * (pr.followMin || 24) };
                const spot = this.bodyBlocked(back.x, back.y, m.r) ? { x: p.x, y: p.y } : back;
                this.fx.push({ type: 'teleport', x: m.x, y: m.y, toX: spot.x, toY: spot.y });
                Object.assign(m, { x: spot.x, y: spot.y, state: 'idle', windup: null, path: null });
                return;
            }
            if (m.stunned && m.state !== 'active') { m.state = 'stunned'; m.windup = null; return; }
            if (m.state === 'stunned') m.state = 'idle';
            if (m.state === 'windup') {
                const t = m.windup.target;
                if (t && !t.dead) m.angle = angleTo(m, t);
                if (this.now >= m.stateEnd) this.minionStrike(m);
                return;
            }
            if (m.state === 'recover') { if (this.now >= m.stateEnd) m.state = 'idle'; return; }
            const t = this.engaged && !m.ghoul ? this.minionTarget(m) : null;   // a guarding ghoul only sticks to you
            m.targetId = t ? t.engineId : null;
            if (t) {
                m.angle = angleTo(m, t);
                const reach = (atk.reach || 16) + t.r + m.r * 0.5;
                if (dist(m, t) <= reach) {
                    if (this.now >= m.readyAt) {
                        m.state = 'windup'; m.visualStateStart = this.now; m.stateEnd = this.now + (atk.windupMs || 350);
                        m.windup = { target: t, start: this.now, end: m.stateEnd };
                        m.readyAt = this.now + (atk.cooldownMs || 1500);
                    } else m.state = 'idle';
                    return;
                }
                this.chase(m, dt, t);
                m.state = 'move';
                return;
            }
            // no fight near: keep 24-40 px from the owner
            const d = dist(m, p);
            if (d > (pr.followMax || 40)) { this.chase(m, dt, p); m.state = 'move'; }
            else if (d > (pr.followMin || 24) && p.moving) { this.walkTo(m, p, dt, 0.8); m.state = 'move'; }
            else m.state = 'idle';
        }

        /** Raise Ghoul's charge: sprint at the nearest engaged enemy and burst on contact (everyone in burstRadius). */
        stepGhoulCharge(m, dt) {
            const pr = m.prof;
            const foes = this.liveActors().sort((x, y) => dist(m, x) - dist(m, y));
            const t = foes[0];
            if (!t) { m.state = 'idle'; return; }
            m.angle = angleTo(m, t);
            m.state = 'move';
            if (dist(m, t) > t.r + m.r + 4) {
                const mult = (pr.chargeSpeed || 120) / (pr.speed || 64);
                if (this.lineOfSight(m, t, true)) { m.path = null; this.walkTo(m, t, dt, mult); } else this.chase(m, dt, t);
                return;
            }
            const radius = pr.burstRadius || 40;
            const hits = foes.filter((a) => dist(m, a) <= radius + a.r);
            const r = this.engine.actionGhoulBurst(m.engineId, hits.map((a) => a.engineId));
            this.collect(r.events);
            m.burst = true;
            this.fx.push({ type: 'aoe', x: m.x, y: m.y, radius });
            if (r.ok) for (const a of hits) if ((r.hit || []).includes(a.engineId)) this.fx.push({ type: 'hit', x: a.x, y: a.y - 6, angle: angleTo(m, a) });
        }

        /** The club comes down: the arc in front decides who it touches (the target first); the engine does the rest. */
        minionStrike(m) {
            const atk = m.prof.attack || {};
            const half = ((atk.arcDeg || 70) / 2) * DEG;
            const reach = atk.reach || 16;
            const touches = (a) => dist(m, a) <= reach + a.r && (dist(m, a) < a.r + m.r || angleDiff(m.angle, angleTo(m, a)) <= half);
            const want = m.windup && m.windup.target;
            const hits = this.liveActors().filter(touches).sort((x, y) => dist(m, x) - dist(m, y));
            const t = want && hits.includes(want) ? want : hits[0] || null;
            const r = this.engine.actionMinionStrike(m.engineId, t ? t.engineId : null);
            this.collect(r.events);
            this.fx.push({ type: 'swing', x: m.x, y: m.y, angle: m.angle, minion: true, shape: { shape: 'arc', reach, arcDeg: atk.arcDeg || 70 } });
            if (r.ok && t && r.result === 'hit') {
                this.fx.push({ type: 'hit', x: t.x, y: t.y - 6, angle: angleTo(m, t) });
                this.bossHit(t);
                if (!t.prof.boss && t.state !== 'windup' && t.state !== 'active') this.knock(t, angleTo(m, t), 3);
            }
            m.windup = null;
            m.state = 'recover'; m.visualStateStart = this.now;
            m.stateEnd = this.now + (atk.activeMs || 80) + (atk.recoveryMs || 450);
        }

        // =====================================================================
        // Projectiles, bodies, pickups, interact
        // =====================================================================
        stepProjectiles() {
            const dt = STEP / 1000;
            const keep = [];
            for (const pj of this.projectiles) {
                const step = pj.speed * dt;
                pj.x += Math.cos(pj.angle) * step; pj.y += Math.sin(pj.angle) * step; pj.travelled += step;
                const wall = this.solidPxFor(pj.x, pj.y, pj.owner === 'player' ? (tx, ty) => this.engagedGateCell(tx, ty) : this.gateCellOf(pj.actor));
                if (pj.owner === 'player' && pj.cosmetic) {   // cast out of a fight: flies to its range or a wall
                    if (wall || pj.travelled >= pj.range) { this.fx.push(pj.burst ? { type: 'aoe', x: pj.x, y: pj.y, radius: pj.burst, damageType: pj.burstKind } : { type: 'fizzle', x: pj.x, y: pj.y }); continue; }
                } else if (pj.owner === 'player') {
                    const hit = this.liveActors().find((a) => Math.hypot(a.x - pj.x, a.y - pj.y) <= a.r + pj.r);
                    if (pj.burst && (hit || wall || pj.travelled >= pj.range)) {   // bomb or flask: everyone in the blast, nearest first
                        const at = wall && !hit ? { x: pj.x - Math.cos(pj.angle) * pj.speed * dt, y: pj.y - Math.sin(pj.angle) * pj.speed * dt } : { x: pj.x, y: pj.y };
                        const hits = this.liveActors().filter((a) => dist(at, a) <= pj.burst + a.r).sort((a, b) => dist(at, a) - dist(at, b));
                        this.fx.push({ type: 'aoe', x: at.x, y: at.y, radius: pj.burst, damageType: pj.burstKind });
                        this.resolve(pj.castId, hits);
                        continue;
                    }
                    if (hit) { this.resolve(pj.castId, [hit]); continue; }
                    if (wall || pj.travelled >= pj.range) { this.collect(this.engine.actionResolve(pj.castId, []).events); this.fx.push({ type: 'fizzle', x: pj.x, y: pj.y }); continue; }
                } else {
                    const a = pj.actor;
                    if (a.dead || !a.engineId || !a.windup) continue;
                    const p = this.player;
                    if (Math.hypot(p.x - pj.x, p.y - pj.y) <= p.r + pj.r) { this.strikePlayer(a, true, pj.atk); continue; }
                    const m = this.liveMinions().find((x) => Math.hypot(x.x - pj.x, x.y - pj.y) <= x.r + pj.r);
                    if (m) { this.strikeMinion(a, m, pj.atk); continue; }
                    if (wall || pj.travelled >= pj.range) { this.strikePlayer(a, false, pj.atk); continue; }
                }
                keep.push(pj);
            }
            this.projectiles = keep;
        }

        // =====================================================================
        // Explosive Caltrops (Saboteur, ninja rework 2026-11-02): spiked charges on the ground
        // =====================================================================
        /** A skill with a lay_mines effect resolved: scatter its charges around the aim point (walkable spots only). */
        layMines(skill, shape) {
            const def = skill && this.engine.data.skillDefinitions[skill];
            const fx = def && (def.effects || []).find((x) => x.type === 'lay_mines');
            if (!fx || !this.engaged) return;
            const p = this.player;
            const aim = this.input.aim || { x: p.x + Math.cos(p.angle) * 40, y: p.y + Math.sin(p.angle) * 40 };
            const d = Math.min(dist(p, aim), shape.range || 110), ang = angleTo(p, aim);
            const c = { x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d };
            const n = this.engine.mineCount ? this.engine.mineCount(fx) : (fx.count || 3);
            this.mines = this.mines || [];
            for (let i = 0; i < n; i++) {
                const a = ang + (i * Math.PI * 2) / Math.max(1, n - 1);
                const r = i === 0 ? 0 : (fx.spreadPx || 22);
                const spot = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
                if (this.bodyBlocked(spot.x, spot.y, 2)) continue;
                this.mines.push({ id: `mine${this.now}_${i}`, skill, x: spot.x, y: spot.y, armAt: this.now + 250, until: this.now + (fx.seconds || 20) * 1000, trigger: fx.triggerPx || 14, blast: fx.blastPx || 28 });
            }
            this.fx.push({ type: 'mines', x: c.x, y: c.y, count: n });
        }

        /** Charges blow up under the first enemy to step close; they wink out when their time is up or the fight ends. */
        stepMines() {
            if (!this.mines || !this.mines.length) return;
            if (!this.engaged) { this.mines = []; return; }
            const keep = [];
            for (const m of this.mines) {
                if (this.now >= m.until) continue;
                const foes = this.now >= m.armAt ? this.liveActors() : [];
                const stepped = foes.find((a) => dist(m, a) <= m.trigger + a.r);
                if (!stepped) { keep.push(m); continue; }
                const hits = foes.filter((a) => dist(m, a) <= m.blast + a.r).sort((a, b) => (a === stepped ? -1 : b === stepped ? 1 : dist(m, a) - dist(m, b)));
                const r = this.engine.actionMineBlast(m.skill, hits.map((a) => a.engineId));
                this.collect(r.events);
                this.fx.push({ type: 'aoe', x: m.x, y: m.y, radius: m.blast, damageType: 'fire' });
                if (r.ok) for (const a of hits) if ((r.hit || []).includes(a.engineId)) { this.fx.push({ type: 'hit', x: a.x, y: a.y - 6, angle: angleTo(m, a) }); this.bossHit(a); }
            }
            this.mines = keep;
        }

        /** Bodies don't overlap: enemies push apart and off the player. */
        separate() {
            const live = this.actors.filter((a) => !a.dead);
            const p = this.player;
            for (let i = 0; i < live.length; i++) {
                const a = live[i];
                for (let j = i + 1; j < live.length; j++) this.pushApart(a, live[j], 0.5);
                if (p.state !== 'dodge') this.pushApart(p, a, a.prof.boss ? 1 : 0.7);
                for (const m of this.liveMinions()) this.pushApart(m, a, a.prof.boss ? 1 : 0.6);
            }
            for (const m of this.liveMinions()) if (p.state !== 'dodge') this.pushApart(m, p, 1);   // a minion steps out of your way
        }

        pushApart(a, b, share) {
            const d = dist(a, b), min = a.r + b.r;
            if (d >= min || d === 0) return;
            const k = (min - d), ang = angleTo(a, b);
            this.moveBody(a, -Math.cos(ang) * k * share, -Math.sin(ang) * k * share, a.encounterId ? this.gateCellOf(a) : null);
            this.moveBody(b, Math.cos(ang) * k * (1 - share), Math.sin(ang) * k * (1 - share), b.encounterId ? this.gateCellOf(b) : null);
        }

        /** Walking over loot picks it up (it stays until collected: no duplicates, no losses). */
        checkDrops() {
            if (!this.engine.getWorldDrops || this.now - (this.dropCheckAt || 0) < 100) return;
            this.dropCheckAt = this.now;
            for (const d of this.engine.getWorldDrops(this.mapId)) {
                if (Math.hypot(d.x - this.player.x, d.y - this.player.y) > 12) continue;
                const r = this.engine.act({ type: 'collect_drop', dropId: d.id });
                this.collect(r.events);
                if (r.ok) this.fx.push({ type: 'pickup', x: d.x, y: d.y });
            }
        }

        interact() {
            if (this.engaged) {   // in a fight E picks up what's near; talking waits
                for (const d of this.engine.getWorldDrops(this.mapId)) if (Math.hypot(d.x - this.player.x, d.y - this.player.y) <= 24) this.collect(this.engine.act({ type: 'collect_drop', dropId: d.id }).events);
                return;
            }
            this.worldResults.push({ type: 'interact' });   // the front end runs session.interact() (dialogue, pickups, doors)
        }

        // =====================================================================
        // View (what to draw)
        // =====================================================================
        view() {
            const p = this.player;
            const at = p.attack;
            return {
                mapId: this.mapId, now: this.now,
                player: {
                    x: p.x, y: p.y, angle: p.angle, facing: p.facing, facing8: p.facing8, state: p.state, moving: p.moving, sprinting: p.sprinting,
                    stamina: p.stamina, staminaMax: (this.rules.stamina || {}).max || 100, guarding: p.guarding, iframes: this.now < p.iframesUntil,
                    attack: at ? { skill: at.skill || null, shape: at.shape, progress: Math.min(1, (this.now - at.start) / Math.max(1, p.stateEnd - at.start)), isBasic: at.isBasic } : null
                },
                actors: this.actors.filter((a) => !a.dead || this.now - a.deadAt < 700).map((a) => ({
                    sid: a.sid, engineId: a.engineId, encounterId: a.encounterId, key: a.key, name: a.name, x: a.x, y: a.y, r: a.r, angle: a.angle, facing: facingOf(a.angle),
                    state: a.dead ? 'dead' : this.now < a.hurtUntil ? 'hurt' : a.state,
                    // Presentation timing follows the actual simulation phase, including boss/combo durations.
                    t: a.dead ? this.now - a.deadAt : this.now < a.hurtUntil ? 160 - (a.hurtUntil - this.now) : Math.max(0, this.now - (a.visualStateStart == null ? this.now : a.visualStateStart)),
                    attack: a.windup && ['windup', 'active', 'recover'].includes(a.state) ? {
                        skill: a.windup.skill, name: a.windup.atk.name || a.windup.base.name,
                        shape: a.windup.atk.shape, phase: a.state,
                        duration: Math.max(1, a.stateEnd - a.visualStateStart),
                        progress: Math.max(0, Math.min(1, (this.now - a.visualStateStart) / Math.max(1, a.stateEnd - a.visualStateStart)))
                    } : null,
                    hp: a.illusionOf ? a.illusionOf.hp : a.hp, maxHp: a.illusionOf ? a.illusionOf.maxHp : a.maxHp, boss: !!a.prof.boss, resolve: a.resolve ? this.resolveState(a) : null,
                    mark: a.state === 'windup' && a.windup && a.windup.mark ? { x: a.windup.mark.x, y: a.windup.mark.y, locked: a.windup.mark.locked, target: a.windup.mark.target } : null,
                    storm: a.state === 'windup' && a.windup && a.windup.storm ? a.windup.storm.name : null,
                    engaged: !!this.groups[a.encounterId].engaged, statuses: (a.illusionOf ? a.illusionOf.statuses : a.statuses) || [], stunned: a.stunned, phase: (a.illusionOf ? a.illusionOf.phaseIdx : a.phaseIdx) + 1, phases: this.bossOf(a) && this.bossOf(a).phases ? this.bossOf(a).phases.length : null,
                    telegraph: a.state === 'windup' && a.windup ? { ...this.enemyShape(a), progress: (this.now - a.windup.start) / Math.max(1, a.windup.end - a.windup.start), boss: !!a.prof.boss, skill: a.windup.skill } : null
                })),
                minions: (this.minions || []).map((m) => ({
                    sid: m.sid, engineId: m.engineId, key: m.key, name: m.name, x: m.x, y: m.y, r: m.r, angle: m.angle, facing: facingOf(m.angle),
                    state: m.dead ? 'dead' : this.now < m.hurtUntil ? 'hurt' : m.state === 'recover' && this.now - m.visualStateStart < ((m.prof.attack || {}).activeMs || 80) ? 'active' : m.state,
                    t: m.dead ? this.now - m.deadAt : Math.max(0, this.now - (m.visualStateStart == null ? this.now : m.visualStateStart)),
                    riseMs: m.state === 'rise' ? Math.max(1, m.stateEnd - m.visualStateStart) : null,
                    hp: m.hp, maxHp: m.maxHp, statuses: m.statuses || [], stunned: !!m.stunned, taunting: !!m.taunting,
                    timeLeftMs: m.dead || !this.followerTimeLeft ? null : this.followerTimeLeft()   // out of a fight: time before it crumbles
                })),
                projectiles: this.projectiles.map((pj) => ({ x: pj.x, y: pj.y, angle: pj.angle, kind: pj.kind, owner: pj.owner })),
                mines: (this.mines || []).map((m) => ({ x: m.x, y: m.y, armed: this.now >= m.armAt, leftMs: m.until - this.now })),
                engaged: this.engaged
            };
        }
    }

    const api = { ActionSim, STEP, facingOf, facing8Of };
    ENSO.actionSim = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
