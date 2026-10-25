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
 * engage → chase with grid pathfinding → wind up → strike → recover; leash home).
 * What it tells the engine: engage, cast, resolve, cancel, windup, strike,
 * disengage, tick (engine/action.js).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const STEP = 1000 / 60;
    const MAX_STEPS = 5;
    const DEG = Math.PI / 180;

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

    class ActionSim {
        constructor({ engine, session, rules, seed = 1 }) {
            this.engine = engine;
            this.session = session;
            this.rules = rules || (engine && engine.data.actionRules) || {};
            this.rng = mulberry32(hash(`${seed}:sim`));
            this.acc = 0;
            this.now = 0;
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
                angle: FACING_ANGLE[s.facing] || 0, facing: s.facing, moving: false,
                stamina: old ? old.stamina : (this.rules.stamina || {}).max || 100, staminaAt: 0,
                state: 'idle', stateEnd: 0, attack: null, dodge: null, iframesUntil: 0, dodgeReadyAt: 0,
                guarding: false, guardSince: null, hurtUntil: 0, sprinting: false
            };
            this.projectiles = [];
            this.groups = {};
            this.actors = [];
            for (const enc of s.visibleObjects().filter((o) => o.kind === 'encounter')) this.addGroup(enc);
        }

        buildSolids() {
            this.solid = new Uint8Array(this.w * this.h);
            for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.solid[y * this.w + x] = this.session.solidForAction(x, y) ? 1 : 0;
        }

        solidAt(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h || this.solid[ty * this.w + tx] === 1; }
        solidPx(x, y) { return this.solidAt(Math.floor(x / this.T), Math.floor(y / this.T)); }
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
                    windup: null, hurtUntil: 0, name: null, atkReady: {}, openWith: null, phaseIdx: 0, roleIdx: (prof.roles ? i : null)
                });
            });
        }

        /** Gate cells stay solid for the player until the gate is beaten; its own enemies walk through them. */
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
            this.syncFromEngine();
            this.stepPlayer();
            for (const a of this.actors) this.stepActor(a);
            this.stepProjectiles();
            this.separate();
            this.checkDrops();
            if (this.input.interact) { this.input.interact = false; this.interact(); }
        }

        collect(events) {
            if (!events || !events.length) return;
            this.engineEvents.push(...events);
            for (const ev of events) {
                if (ev.type === 'world.respawn') this.respawned = true;
                if (ev.type === 'action.cleared') this.groupCleared(ev.encounterId);
                if (ev.type === 'action.parry') { const a = this.actors.find((x) => x.engineId === ev.enemyId); if (a) this.stagger(a, (this.rules.parry || {}).staggerMs || 900); }
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
                    if (b && b.phases) {   // boss phases by HP: a new phase opens with its signature move
                        const idx = b.phases.reduce((k, x, i) => (en.hp / en.maxHp <= x.fromHpPct + 1e-9 ? i : k), 0);
                        if (idx > a.phaseIdx) { a.phaseIdx = idx; const ph = b.phases[idx]; if (ph.openWith) { a.openWith = ph.openWith; a.atkReady[ph.openWith] = 0; } if (ph.speed) a.prof = { ...a.prof, speed: ph.speed }; this.fx.push({ type: 'phase', x: a.x, y: a.y, phase: idx + 1 }); }
                    }
                    if (en.hp <= 0) this.kill(a);
                }
            }
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
            for (const a of this.actors) if (a.encounterId === g.encounterId && !a.dead) {
                Object.assign(a, { engineId: null, hp: null, state: 'return', windup: null, path: null, stunned: false, speedMult: 1, atkReady: {}, openWith: null, phaseIdx: 0, prof: this.enemyRules(a.key) });
            }
        }

        /** The player fell: everything on this map goes home and the player stands at the map's safe spawn. */
        onRespawn() {
            for (const g of Object.values(this.groups)) if (g.engaged) this.resetGroup(g);
            for (const a of this.actors) if (!a.dead) { a.x = a.homeX; a.y = a.homeY; a.state = 'idle'; }
            this.projectiles = [];
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
            const slow = this.pview ? this.pview.speedMult : 1;
            if (inp.aim) p.angle = angleTo(p, inp.aim);

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

            // guard (held). A fresh press opens the parry window.
            const canAct = !stunned && (p.state === 'idle' || p.state === 'move');
            const wantGuard = inp.guard && canAct && p.stamina > 0;
            if (wantGuard && !p.guarding) p.guardSince = this.now;
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
                    if (p.guarding) speed *= (R.guard || {}).moveMult || 0.45;
                    speed *= slow;
                    vx = (m.x / Math.max(1, len)) * speed; vy = (m.y / Math.max(1, len)) * speed;
                    if (!inp.aim) p.angle = Math.atan2(m.y, m.x);
                }
            }
            p.moving = !!(vx || vy);
            if (p.state === 'idle' && p.moving) p.state = 'move';
            if (p.state === 'move' && !p.moving) p.state = 'idle';
            const bx = p.x, by = p.y;
            this.moveBody(p, vx * dt, vy * dt);
            p.vx = (p.x - bx) / dt; p.vy = (p.y - by) / dt;   // for leading ground attacks
            p.facing = facingOf(p.angle);
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
                // Leaving mid-fight would strand the engine in combat: the way out is barred until you shake them off.
                p.x = (s.x + 0.5) * this.T; p.y = (s.y + 0.5) * this.T;
                this.fx.push({ type: 'notice', text: "You can't leave while they're on you." });
                return;
            }
            const r = s.enterTile(tx, ty, p.facing);
            if (r.type !== 'none' && r.type !== 'moved') this.worldResults.push(r);
            if (r.type === 'transition') this.enterMap();
        }

        moveBody(b, dx, dy, ignore = null) {
            if (dx && !this.bodyBlocked(b.x + dx, b.y, b.r, ignore)) b.x += dx;
            if (dy && !this.bodyBlocked(b.x, b.y + dy, b.r, ignore)) b.y += dy;
        }

        startAttack(slot) {
            const p = this.player;
            const e = this.engine;
            if (!this.engaged) this.engageNearest();
            const weapon = (((this.rules.classes || {})[e.player.className] || {}).weapon) || { kind: 'arc', reach: 20, arcDeg: 100, startupMs: 120, activeMs: 80, recoveryMs: 220 };
            if (!this.engaged) {   // a swing at nothing: it looks right and costs nothing
                p.attack = { shape: { ...weapon, shape: weapon.kind }, castId: null, start: this.now, fired: true, cosmetic: true, isBasic: slot == null };
                p.state = 'attack';
                p.stateEnd = this.now + (weapon.startupMs || 120) + (weapon.activeMs || 0) + (weapon.recoveryMs || 200);
                this.fx.push({ type: 'swing', x: p.x, y: p.y, angle: p.angle, cls: e.player.className, shape: p.attack.shape });
                return;
            }
            const r = slot != null ? e.actionCast(null, { slot }) : e.actionCast('attack');
            this.collect(r.events);
            if (!r.ok) { this.fx.push({ type: 'refused', code: r.error.code, text: r.error.message }); return; }
            const shape = r.shape || {};
            const startup = shape.startupMs != null ? shape.startupMs : (shape.castMs || 150);
            const recovery = shape.recoveryMs != null ? shape.recoveryMs : 200;
            p.attack = { shape, castId: r.castId, skill: r.skill, start: this.now, fireAt: this.now + startup, fired: r.resolved, isBasic: slot == null, aim: this.input.aim ? { ...this.input.aim } : null };
            p.state = 'attack';
            p.stateEnd = this.now + startup + (shape.activeMs || 0) + recovery;
            this.fx.push({ type: r.resolved ? 'cast' : 'swing', x: p.x, y: p.y, angle: p.angle, cls: e.player.className, shape, skill: r.skill });
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
                this.projectiles.push({ owner: 'player', castId: at.castId, x: p.x, y: p.y, angle: p.angle, speed: s.speed || 200, range: s.range || 120, travelled: 0, r: s.radius || 4, kind: s.projectile || 'arcane' });
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
                if (!a.prof.boss && a.state !== 'windup' && a.state !== 'active') this.knock(a, angleTo(this.player, a), 4);
            }
        }

        liveActors() { return this.actors.filter((a) => !a.dead && a.engineId && this.groups[a.encounterId].engaged); }

        knock(a, ang, px) { this.moveBody(a, Math.cos(ang) * px, Math.sin(ang) * px, this.gateCellOf(a)); }

        /** Pressing attack near an unaware group starts the fight with it (nearest within engageRadius). */
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
            if (a.stunned && a.state !== 'windup' && a.state !== 'active') { a.state = 'stunned'; return; }
            if (a.state === 'stunned') a.state = 'chase';
            if (a.state === 'stagger') { if (this.now >= a.stateEnd) a.state = 'chase'; return; }
            // leash: far from home and the player is far too → the whole group gives up
            const home = { x: a.homeX, y: a.homeY };
            if (dist(a, home) > (pr.leash || 200) && dist(p, home) > (pr.leash || 200)) { this.leash(g); return; }
            if (a.state === 'windup') {
                if (this.now < a.stateEnd - (a.windup.atk.lockMs != null ? a.windup.atk.lockMs : (pr.lockMs != null ? pr.lockMs : 200))) a.angle = angleTo(a, p);   // tracks, then locks (Thorne §4)
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
            a.angle = angleTo(a, p);
            const atk = this.now >= a.attackReadyAt && this.attackers() < ((this.rules.combat || {}).maxSimultaneousAttackers || 2) ? this.pickAttack(a, d) : null;
            if (atk) { this.enemyWindup(a, atk); return; }
            const [kmin, kmax] = this.keepRange(a);
            if (d < kmin - 2) { this.walkTo(a, { x: a.x - Math.cos(a.angle) * 20, y: a.y - Math.sin(a.angle) * 20 }, dt, 0.8); return; }
            if (d > kmax + p.r + a.r * 0.5 || (this.attackRanged(a) && !this.lineOfSight(a, p))) this.chase(a, dt);
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
            if (!b || !b.phases || a.hp == null || !a.maxHp) return null;
            let ph = null;
            for (const x of b.phases) if (a.hp / a.maxHp <= x.fromHpPct + 1e-9) ph = x;
            return ph;
        }
        /** Every attack this enemy can use right now: its table, or the boss's current phase. */
        attacksOf(a) {
            const b = this.bossOf(a);
            if (b && b.attacks) {
                let names = Object.keys(b.attacks), drop = [];
                for (const x of b.phases || []) if (a.hp != null && a.maxHp && a.hp / a.maxHp <= x.fromHpPct + 1e-9) { if (x.attacks) names = x.attacks; if (x.drop) drop = drop.concat(x.drop); }
                return names.filter((n) => !drop.includes(n) && b.attacks[n]).map((n) => ({ name: n, ...b.attacks[n] }));
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
        pickAttack(a, d) {
            const p = this.player;
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
                if (x.shape === 'projectile') return d <= reach && this.lineOfSight(a, p);
                if (x.useWhen === 'playerBeyond80For1500ms') return d > 80;
                if (x.useAt) return d >= x.useAt[0] - p.r && d <= x.useAt[1] + p.r + a.r * 0.5;
                return d <= reach + p.r + a.r * 0.5;
            };
            const ok = list.filter(fits);
            if (!ok.length) return null;
            // cooldown-bound attacks (crows) take their turn when ready; otherwise the first fitting entry
            const special = ok.filter((x) => x.cooldownMs >= 5000);
            return special.length ? special[0] : ok[0];
        }

        enemyWindup(a, atk, step = 0) {
            const r = this.engine.actionEnemyWindup(a.engineId, { skill: atk.skill });
            this.collect(r.events);
            if (!r.ok) { a.attackReadyAt = this.now + 300; return; }
            const b = this.bossOf(a);
            const st = atk.combo ? { ...atk, ...atk.combo[step] } : atk;
            let windup = st.windupMs || a.prof.windupMs || 520;
            if (b && b.minWindupMs) windup = Math.max(b.minWindupMs, windup);
            a.state = 'windup';
            a.stateEnd = this.now + windup;
            a.angle = angleTo(a, this.player);
            if (step === 0 && atk.cooldownMs) a.atkReady[atk.name] = this.now + atk.cooldownMs;
            a.windup = { skill: r.skill, atk: st, base: atk, step, start: this.now, end: a.stateEnd };
            if (st.shape === 'ground') a.windup.circles = this.groundTargets(a, st);
        }

        /** Crow shadows: one on the player, the rest where they're heading (Thorne §5). */
        groundTargets(a, st) {
            const p = this.player;
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

        /** The telegraph IS the hitbox (Thorne): what the player sees during the wind-up is what hits. */
        enemyShape(a) {
            const st = (a.windup && a.windup.atk) || this.attacksOf(a)[0];
            const kind = st.shape || 'arc';
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
            a.stateEnd = this.now + (st.activeMs != null ? st.activeMs : 110);
            w.shape = this.enemyShape(a);   // from where it stands now (a lunge started from here)
            if (st.shape === 'projectile') {
                this.projectiles.push({ owner: 'enemy', actor: a, atk: st, x: a.x, y: a.y, angle: a.angle, speed: st.projSpeed || a.prof.projSpeed || 140, range: (st.reach || 100) + 20, travelled: 0, r: st.radius || (st.width ? st.width / 2 : 4), kind: st.projectile || a.prof.projectile || (st.skill === 'Chain Lock' ? 'feather' : 'shadow') });
                return;
            }
            const hit = w.shape.kind === 'multi' ? w.shape.shapes.some((c) => this.inShape(c, this.player)) : this.inShape(w.shape, this.player);
            this.strikePlayer(a, hit, st);
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
            a.stateEnd = this.now + rec;
            a.attackReadyAt = a.stateEnd + (b && b.attackGapMs != null ? b.attackGapMs : 200 + this.rng() * 700);
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
                const r = this.engine.actionEnemyStrike(a.engineId, { hit: false });
                this.collect(r.events);
                if (touching) this.fx.push({ type: 'perfect_dodge', x: p.x, y: p.y });
                return;
            }
            const facingIt = angleDiff(p.angle, angleTo(p, a)) <= (((R.guard || {}).arcDeg || 140) / 2) * DEG;
            const guarded = p.guarding && facingIt && st.guardable !== false && p.stamina > 0;
            const parried = guarded && st.parryable !== false && p.guardSince != null && this.now - p.guardSince <= ((R.parry || {}).windowMs || 160);
            const r = this.engine.actionEnemyStrike(a.engineId, { hit: true, guarded, parried, damageMult: st.damageMult || 1 });
            this.collect(r.events);
            if (!r.ok) return;
            if (r.result === 'parried') { this.fx.push({ type: 'parry', x: p.x, y: p.y }); return; }
            if (r.result === 'guarded') {
                p.stamina = Math.max(0, p.stamina - (st.blockCost || (R.guard || {}).staminaPerHit || 14));
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
        chase(a, dt) {
            const p = this.player;
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
            const gate = wide && a.encounterId ? this.gateCellOf(a) : null;
            for (let i = 1; i < n; i++) {
                const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
                if (wide ? this.bodyBlocked(x, y, a.r || 4, gate) : this.solidPx(x, y)) return false;
            }
            return true;
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
                const wall = this.solidPx(pj.x, pj.y);
                if (pj.owner === 'player') {
                    const hit = this.liveActors().find((a) => Math.hypot(a.x - pj.x, a.y - pj.y) <= a.r + pj.r);
                    if (hit) { this.resolve(pj.castId, [hit]); continue; }
                    if (wall || pj.travelled >= pj.range) { this.collect(this.engine.actionResolve(pj.castId, []).events); this.fx.push({ type: 'fizzle', x: pj.x, y: pj.y }); continue; }
                } else {
                    const a = pj.actor;
                    if (a.dead || !a.engineId || !a.windup) continue;
                    const p = this.player;
                    if (Math.hypot(p.x - pj.x, p.y - pj.y) <= p.r + pj.r) { this.strikePlayer(a, true, pj.atk); continue; }
                    if (wall || pj.travelled >= pj.range) { this.strikePlayer(a, false, pj.atk); continue; }
                }
                keep.push(pj);
            }
            this.projectiles = keep;
        }

        /** Bodies don't overlap: enemies push apart and off the player. */
        separate() {
            const live = this.actors.filter((a) => !a.dead);
            const p = this.player;
            for (let i = 0; i < live.length; i++) {
                const a = live[i];
                for (let j = i + 1; j < live.length; j++) this.pushApart(a, live[j], 0.5);
                if (p.state !== 'dodge') this.pushApart(p, a, a.prof.boss ? 1 : 0.7);
            }
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
                    x: p.x, y: p.y, angle: p.angle, facing: p.facing, state: p.state, moving: p.moving, sprinting: p.sprinting,
                    stamina: p.stamina, staminaMax: (this.rules.stamina || {}).max || 100, guarding: p.guarding, iframes: this.now < p.iframesUntil,
                    attack: at ? { skill: at.skill || null, shape: at.shape, progress: Math.min(1, (this.now - at.start) / Math.max(1, p.stateEnd - at.start)), isBasic: at.isBasic } : null
                },
                actors: this.actors.filter((a) => !a.dead || this.now - a.deadAt < 700).map((a) => ({
                    sid: a.sid, engineId: a.engineId, encounterId: a.encounterId, key: a.key, name: a.name, x: a.x, y: a.y, r: a.r, angle: a.angle, facing: facingOf(a.angle),
                    state: a.dead ? 'dead' : this.now < a.hurtUntil ? 'hurt' : a.state, t: a.dead ? this.now - a.deadAt : 0, hp: a.hp, maxHp: a.maxHp, boss: !!a.prof.boss,
                    engaged: !!this.groups[a.encounterId].engaged, statuses: a.statuses || [], stunned: a.stunned, phase: a.phaseIdx + 1, phases: this.bossOf(a) && this.bossOf(a).phases ? this.bossOf(a).phases.length : null,
                    telegraph: a.state === 'windup' && a.windup ? { ...this.enemyShape(a), progress: (this.now - a.windup.start) / Math.max(1, a.windup.end - a.windup.start), boss: !!a.prof.boss, skill: a.windup.skill } : null
                })),
                projectiles: this.projectiles.map((pj) => ({ x: pj.x, y: pj.y, angle: pj.angle, kind: pj.kind, owner: pj.owner })),
                engaged: this.engaged
            };
        }
    }

    const api = { ActionSim, STEP, facingOf };
    ENSO.actionSim = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
