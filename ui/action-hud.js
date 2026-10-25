/* =========================================================================
 * Enso's Last Stand — ACTION HUD (Pixie, UI/UX lead; combat v3, docs/ACTION_COMBAT.md)
 * The one persistent action-RPG interface (direction doc §9): it is the same HUD while exploring and
 * while fighting, there is no battle layout to switch to.
 *
 *   ENSO.actionHud.viewModel(engine, simView, now)  pure, no DOM: builds the model from the engine
 *                                                    (rules) and the action sim's view (space).
 *   ENSO.actionHud.create(root, opts)                mounts the HUD into `root` (a positioned element,
 *                                                    normally #world-stage) and returns
 *                                                    { update(model, now), destroy(), onSlot(fn), onAttack(fn), el }.
 *
 * update() is cheap enough to call every animation frame: the DOM is built once, and each frame only
 * writes the widths, classes and texts that changed (every write goes through a per-element cache).
 * Bars are quantised to whole art pixels of the 480×270 stage, which keeps the pixel look and means
 * most frames write nothing at all.
 *
 * Nothing here decides rules: castability and refusal reasons come from getAvailableActions(), every
 * timer from getRealtimeState(), positions and stamina from the sim.
 *
 * Keys (direction doc §3): LMB or 1 = basic attack, 2–6 = engine skill-bar slots 0–4, R = slot 5.
 * slotForKey(ev) gives the same mapping to the input code, so the HUD's key hints never disagree.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    const clamp01 = (v) => (num(v) ? Math.max(0, Math.min(1, v)) : 0);

    /** Key hint per engine skill-bar slot (index = engine slot). */
    const SLOT_KEYS = ['2', '3', '4', '5', '6', 'R'];
    const BASIC_KEY = '1';
    const CATEGORY_GLYPH = { buff: '▲', debuff: '▼', dot: '✸', control: '◆', mark: '◎', cooldown: '⧗', other: '•' };
    const TARGET_GLYPH = { self: '◈', ally: '◈', enemy_single: '✦', enemy_all: '✺', enemy_aoe: '✺', all: '✺' };
    const NOTICE_MS = 3600;
    const NOTICE_MAX = 4;

    /**
     * Which action a key press means: 'basic', an engine slot 0–5, or null.
     * '1' / Digit1 / Numpad1 = basic; '2'..'6' (and digit/numpad codes) = slots 0–4; R = slot 5.
     */
    function slotForKey(ev) {
        if (!ev) return null;
        const code = ev.code || '';
        const m = /^(?:Digit|Numpad)([1-6])$/.exec(code);
        const d = m ? m[1] : /^[1-6]$/.test(ev.key || '') ? ev.key : null;
        if (d === '1') return 'basic';
        if (d) return Number(d) - 2;
        if (code === 'KeyR' || ev.key === 'r' || ev.key === 'R') return 5;
        return null;
    }

    /** "1.4" under 10 s, whole seconds above, '' when nothing is left. */
    function secondsText(ms) {
        if (!num(ms) || ms <= 0) return '';
        return ms < 10000 ? (Math.ceil(ms / 100) / 10).toFixed(1) : String(Math.ceil(ms / 1000));
    }

    /** A slot's short face label: one word -> its first 3 letters, more -> initials (max 3). */
    function abbrev(name) {
        if (!name) return '';
        const words = String(name).split(/\s+/).filter((w) => w && !/^(of|the|a|an)$/i.test(w));
        if (words.length <= 1) { const w = words[0] || String(name); return w.charAt(0).toUpperCase() + w.slice(1, 3).toLowerCase(); }
        return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase()).join('');
    }

    /** { remainingMs, totalMs } -> { remainingMs, totalMs, frac } (frac = share still to run), or null. */
    function timer(t, fallbackTotal) {
        if (!t || !num(t.remainingMs) || t.remainingMs <= 0) return null;
        const total = num(t.totalMs) && t.totalMs > 0 ? t.totalMs : (num(fallbackTotal) && fallbackTotal > 0 ? fallbackTotal : t.remainingMs);
        return { remainingMs: t.remainingMs, totalMs: total, frac: clamp01(t.remainingMs / total) };
    }

    /** Status chips for the HUD: seconds left on the fight clock, stacks, category glyph. */
    function statusChips(list, defs, fightNow) {
        return (list || []).map((s) => {
            const def = (defs && defs[s.name]) || {};
            const cat = CATEGORY_GLYPH[def.category] ? def.category : CATEGORY_GLYPH[s.category] ? s.category : 'other';
            const stacks = num(s.stacks) && s.stacks > 1 ? s.stacks : 0;
            let msLeft = null, frac = null;
            if (num(s.rtEndsAt) && num(fightNow)) {
                msLeft = Math.max(0, s.rtEndsAt - fightNow);
                frac = num(s.rtTotalMs) && s.rtTotalMs > 0 ? clamp01(msLeft / s.rtTotalMs) : null;
            }
            const seconds = msLeft == null ? null : Math.ceil(msLeft / 1000);
            const left = seconds != null ? `${seconds}s` : num(s.duration) ? `${s.duration}t` : '';
            return {
                id: s.name, name: s.name, category: cat, glyph: CATEGORY_GLYPH[cat], stacks, seconds, frac, left,
                title: `${s.name} (${cat}${stacks ? `, ${stacks} stacks` : ''}${seconds != null ? `, ${seconds}s left` : ''})`
            };
        });
    }

    /** The class resource's short label and colour family. */
    function resourceKind(type) {
        const t = String(type || '').toLowerCase();
        if (/mana|focus|essence/.test(t)) return 'mana';
        if (/rage|fury|blood/.test(t)) return 'rage';
        if (/momentum|energy|combo/.test(t)) return 'energy';
        return 'soul';
    }

    /**
     * Build the HUD model. `engine` needs getState(); getRealtimeState(), getSkillBar(),
     * getAvailableActions(), trackedObjective() are used when present. `simView` may be null.
     * `now` is the UI clock (ms), used only for notice timing.
     */
    function viewModel(engine, simView, now = 0) {
        const st = engine.getState();
        const p = st.player || {};
        const rt = typeof engine.getRealtimeState === 'function' ? engine.getRealtimeState() : null;
        const avail = typeof engine.getAvailableActions === 'function' ? engine.getAvailableActions() : null;
        const inCombat = st.mode === 'combat' || !!rt;
        const sim = simView || {};
        const fightNow = rt && num(rt.now) ? rt.now : null;
        const defs = (ENSO.data && ENSO.data.statusDefinitions) || null;

        const actions = (inCombat && avail && avail.actions) || [];
        const opt = new Map(actions.filter((a) => a.type === 'skill' && !a.isBasic).map((a) => [a.skillId, a]));
        const known = new Map((p.skills || []).map((s) => [s.name, s]));
        const bar = (typeof engine.getSkillBar === 'function' ? engine.getSkillBar() : null) || (avail && avail.skillBar) || (rt && rt.skillBar) || [];
        const res = p.resource || { type: '', current: 0, max: 0 };
        const gcd = inCombat && rt ? timer(rt.gcd) : null;

        const slots = SLOT_KEYS.map((key, slot) => {
            const entry = bar.find((b) => b && b.slot === slot) || { slot, skillId: null };
            if (!entry.skillId) return { slot, key, skillId: null, empty: true, state: 'empty', abbr: '', glyph: '', cost: null, enabled: false, reason: null, cd: null, gcd: null, title: `${key} · empty slot (set it in the menu)` };
            const id = entry.skillId;
            const o = opt.get(id) || null;
            const sk = known.get(id) || {};
            const cost = o && num(o.cost) ? o.cost : num(sk.cost) ? sk.cost : 0;
            const resource = (o && o.resource) || res.type || '';
            const targeting = (o && o.targeting) || sk.target || '';
            let enabled = true, reason = null, cd = null;
            if (inCombat) {
                const rtcd = rt && rt.cooldowns ? rt.cooldowns[id] : null;
                cd = timer(rtcd, o && o.cooldownMs) || (o && o.reason && o.reason.code === 'ON_COOLDOWN' && num(o.readyInMs) ? timer({ remainingMs: o.readyInMs }, o.cooldownMs) : null);
                if (o) { enabled = !!o.enabled; reason = o.enabled ? null : (o.reason || null); }
                else { enabled = false; reason = { code: 'UNAVAILABLE', message: `${id} can't be used right now.` }; }
            }
            const code = reason && reason.code;
            const state = enabled ? 'ready' : cd || code === 'ON_COOLDOWN' ? 'cooldown' : code === 'GLOBAL_COOLDOWN' ? 'gcd' : code === 'NOT_ENOUGH_RESOURCE' ? 'nores' : 'disabled';
            const costText = cost ? `${cost} ${resource}` : 'free';
            const cdText = o && num(o.cooldownMs) ? ` · ${secondsText(o.cooldownMs)}s cooldown` : '';
            return {
                slot, key, skillId: id, empty: false, state, enabled, reason, cost: cost || null, resource,
                abbr: abbrev(id), glyph: TARGET_GLYPH[targeting] || '✦', cd, gcd: state === 'cooldown' ? null : gcd,
                title: `${key} · ${id} · ${costText}${cdText}${reason ? ` — ${reason.message}` : ''}`
            };
        });

        const atk = actions.find((a) => a.type === 'attack') || null;
        const firstFree = (p.skills || [])[0];
        const basicName = atk ? atk.skillId : firstFree && !firstFree.cost ? firstFree.name : 'Basic Attack';
        const basicReason = atk && !atk.enabled ? (atk.reason || null) : null;
        const swing = inCombat && rt ? timer(rt.basic) : null;
        const basic = {
            key: BASIC_KEY, skillId: basicName, abbr: abbrev(basicName), glyph: '⚔', swing,
            enabled: !basicReason, reason: basicReason,
            state: basicReason ? (swing ? 'cooldown' : 'disabled') : 'ready',
            title: `LMB / ${BASIC_KEY} · ${basicName} · free${basicReason ? ` — ${basicReason.message}` : ''}`
        };

        // When every usable control is refused for the same non-timer reason (stunned, silenced, …), say it once.
        const blocked = [basic, ...slots.filter((s) => !s.empty)].map((s) => s.reason);
        const sameCode = blocked.length && blocked.every((r) => r && r.code && r.code === blocked[0].code) ? blocked[0] : null;
        const barNote = sameCode && !/COOLDOWN/.test(sameCode.code) && sameCode.code !== 'NOT_ENOUGH_RESOURCE' ? sameCode.message : null;

        let quest = sim.quest || null;
        if (!quest && engine.story && typeof engine.trackedObjective === 'function') {
            const o = engine.trackedObjective();
            if (o) quest = { title: o.title, text: o.text, where: null, kind: o.kind };
        }

        const stamina = sim.stamina && num(sim.stamina.max) && sim.stamina.max > 0 ? { cur: Math.max(0, sim.stamina.cur), max: sim.stamina.max } : null;
        const lock = sim.lockTargetId != null ? (sim.enemies || []).find((e) => e.id === sim.lockTargetId) || null : null;
        const boss = sim.boss ? { name: sim.boss.name, hp: Math.max(0, sim.boss.hp), maxHp: sim.boss.maxHp, phase: sim.boss.phase || 1, phases: sim.boss.phases || null } : null;

        return {
            now,
            inCombat,
            player: {
                name: p.name || '', level: p.level || 1,
                portrait: { appearance: sim.appearance ?? p.appearance ?? 0, className: sim.className || p.className, cosmetics: sim.cosmetics || p.cosmetics || {} },
                hp: Math.max(0, p.hp || 0), maxHp: p.maxHp || 1,
                resource: { name: res.type || '', cur: res.current || 0, max: res.max || 0, kind: resourceKind(res.type) }
            },
            stamina,
            dodgeReadyInMs: num(sim.dodgeReadyInMs) ? sim.dodgeReadyInMs : 0,
            guarding: !!sim.guarding,
            statuses: statusChips(p.statusEffects, defs, fightNow),
            basic,
            slots,
            barNote,
            boss,
            lock: lock && !(boss && lock.boss) ? { id: lock.id, name: lock.name, hp: Math.max(0, lock.hp), maxHp: lock.maxHp || 1 } : lock ? { id: lock.id, name: lock.name, boss: true } : null,
            prompt: sim.prompt ? { key: sim.prompt.key || 'E', verb: sim.prompt.verb || '', name: sim.prompt.name || '' } : null,
            quest,
            notices: (sim.notices || []).filter((n) => n && n.id != null).map((n) => ({ id: String(n.id), text: n.text, kind: n.kind || 'loot' }))
        };
    }

    // ------------------------------------------------------------------ DOM part (browser only)

    /** Fraction quantised to whole art pixels of a `px`-wide bar, as a CSS percentage string. */
    const qpct = (frac, px) => `${(Math.round(clamp01(frac) * px) / px) * 100}%`;

    function create(root, opts = {}) {
        const doc = root.ownerDocument;
        const h = (tag, cls, parent, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };
        const cache = new WeakMap();
        const put = (el, k, v) => { let c = cache.get(el); if (!c) cache.set(el, c = {}); if (c[k] === v) return false; c[k] = v; return true; };
        const text = (el, v) => { v = v == null ? '' : String(v); if (put(el, 't', v)) el.textContent = v; };
        const width = (el, v) => { if (put(el, 'w', v)) el.style.width = v; };
        const height = (el, v) => { if (put(el, 'h', v)) el.style.height = v; };
        const cssVar = (el, n, v) => { if (put(el, n, v)) el.style.setProperty(n, v); };
        const cls = (el, c, on) => { if (put(el, `c:${c}`, !!on)) el.classList.toggle(c, !!on); };
        const show = (el, on) => { if (put(el, 'show', !!on)) el.hidden = !on; };
        const attr = (el, n, v) => { if (put(el, `a:${n}`, v)) el.setAttribute(n, v); };

        const slotFns = [], attackFns = [];
        const box = h('div', 'ahud', null);
        box.setAttribute('aria-label', 'Action HUD');

        // ---- top-right: quest tracker
        const quest = h('div', 'ahud-quest', box);
        const qTitle = h('div', 'ahud-quest-title', quest);
        const qText = h('div', 'ahud-quest-text', quest);
        // ---- top-centre: boss bar, lock-on plate
        const top = h('div', 'ahud-top', box);
        const boss = h('div', 'ahud-boss', top);
        const bossHead = h('div', 'ahud-boss-head', boss);
        const bossName = h('span', 'ahud-boss-name', bossHead);
        const bossPips = h('span', 'ahud-boss-pips', bossHead);
        const bossBar = h('div', 'ahud-bar ahud-boss-bar', boss);
        const bossChip = h('span', 'chipfill', bossBar); const bossFill = h('span', 'fill', bossBar);
        const lock = h('div', 'ahud-lock', top);
        h('span', 'ahud-lock-mark', lock, '◎');
        const lockName = h('span', 'ahud-lock-name', lock);
        const lockBar = h('div', 'ahud-bar ahud-lock-bar', lock);
        const lockFill = h('span', 'fill', lockBar);
        // ---- right: notices
        const notices = h('div', 'ahud-notices', box);
        notices.setAttribute('role', 'status'); notices.setAttribute('aria-live', 'polite');
        // ---- top-left: portrait + compact vitals, statuses below
        const left = h('div', 'ahud-left', box);
        const vit = h('div', 'ahud-vitals', left);
        const portrait = h('canvas', 'ahud-portrait', vit);
        portrait.width = portrait.height = 32;
        portrait.setAttribute('aria-hidden', 'true');
        let portraitKey = null;
        const vName = h('div', 'ahud-name', vit);
        const vNameT = h('span', '', vName); const vLv = h('span', 'lv', vName);
        const mkRow = (k, kind) => {
            const row = h('div', `ahud-row ${kind}`, vit);
            const label = h('span', 'k', row, k);
            const b = h('div', `ahud-bar ${kind}`, row);
            const chip = h('span', 'chipfill', b); const fill = h('span', 'fill', b);
            const val = h('span', 'v', row);
            return { row, label, b, chip, fill, val };
        };
        const hp = mkRow('HP', 'hp');
        const rs = mkRow('', 'res');
        const stam = h('div', 'ahud-bar stam', vit);
        const stamFill = h('span', 'fill', stam);
        const statuses = h('div', 'ahud-status', left);
        // ---- bottom-centre: prompt + skill bar
        const centre = h('div', 'ahud-centre', box);
        const note = h('div', 'ahud-note', centre);
        const prompt = h('div', 'ahud-prompt', centre);
        const pKey = h('kbd', '', prompt); const pVerb = h('span', 'verb', prompt); const pName = h('span', 'name', prompt);
        const barEl = h('div', 'ahud-skills', centre);
        const mkSlot = (isBasic) => {
            const s = h('div', `ahud-slot${isBasic ? ' basic' : ''}`, barEl);
            s.setAttribute('role', 'button');
            s.tabIndex = 0;
            const glyph = h('span', 'glyph', s);
            const ab = h('span', 'abbr', s);
            const shutter = h('span', 'shutter', s);
            const sweep = h('span', 'sweep', s);
            const secs = h('span', 'secs', s);
            const key = h('span', 'key', s);
            const cost = h('span', 'cost', s);
            return { s, glyph, ab, shutter, sweep, secs, key, cost };
        };
        const basicEl = mkSlot(true);
        h('span', 'ahud-sep', barEl);
        const slotEls = SLOT_KEYS.map(() => mkSlot(false));
        // The bar is the only part that takes the pointer: a click fires the slot and never reaches the world.
        const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
        basicEl.s.addEventListener('pointerdown', (e) => { stop(e); attackFns.forEach((f) => f()); });
        slotEls.forEach((el, i) => el.s.addEventListener('pointerdown', (e) => { stop(e); slotFns.forEach((f) => f(i)); }));
        [basicEl, ...slotEls].forEach((el, i) => el.s.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            stop(e);
            if (e.repeat) return;
            (i === 0 ? attackFns : slotFns).forEach((f) => i === 0 ? f() : f(i - 1));
        }));
        barEl.addEventListener('contextmenu', stop);
        // Dodge: a small cell at the end of the bar, so Space is always taught and its cooldown always shown.
        h('span', 'ahud-sep', barEl);
        const dodge = h('div', 'ahud-slot dodge is-ready', barEl);
        dodge.setAttribute('title', 'Space · Dodge');
        h('span', 'glyph', dodge, '»'); const dodgeSh = h('span', 'shutter', dodge); h('span', 'key', dodge, 'SPC');
        let dodgeTotal = 0;

        root.appendChild(box);
        if (opts.className) box.classList.add(opts.className);

        const chipEls = new Map();
        const noticeEls = new Map();   // id -> { el, born }
        const seenNotices = new Set();
        let stamSeenAt = -Infinity;

        function bar(row, cur, max, px) {
            const f = max ? cur / max : 0;
            width(row.fill, qpct(f, px));
            width(row.chip, qpct(f, px));   // the chip trails behind the fill (CSS transition delay)
        }

        function paintSlot(el, s, isBasic) {
            text(el.key, isBasic ? '1' : s.key);
            text(el.ab, s.abbr);
            text(el.glyph, s.glyph || '');
            attr(el.s, 'title', s.title);
            attr(el.s, 'aria-label', s.title);
            attr(el.s, 'aria-disabled', String(!s.enabled));
            el.s.tabIndex = s.empty ? -1 : 0;
            cls(el.s, 'empty', s.empty);
            for (const st of ['ready', 'cooldown', 'gcd', 'nores', 'disabled']) cls(el.s, `is-${st}`, s.state === st);
            const t = isBasic ? s.swing : s.cd;
            height(el.shutter, t ? qpct(t.frac, isBasic ? 26 : 22) : '0%');
            text(el.secs, t && t.remainingMs >= 1000 ? secondsText(t.remainingMs) : '');
            const g = !isBasic && s.gcd && !s.empty ? s.gcd.frac : 0;
            cssVar(el.sweep, '--sweep', `${Math.round(g * 16) / 16}`);
            show(el.cost, !isBasic && !!s.cost);
            if (!isBasic) text(el.cost, s.cost || '');
        }

        function paintNotices(list, now) {
            for (const n of list) {
                if (seenNotices.has(n.id)) continue;
                seenNotices.add(n.id);
                const el = h('div', `ahud-notice n-${n.kind}`, null);
                h('i', '', el, { loot: '◆', xp: '✦', quest: '❖', level: '▲' }[n.kind] || '◆');
                h('span', '', el, n.text);
                notices.insertBefore(el, notices.firstChild);
                noticeEls.set(n.id, { el, born: now });
            }
            let i = 0;
            for (const [id, n] of noticeEls) {
                const age = now - n.born;
                const keep = noticeEls.size - i <= NOTICE_MAX;
                if (age > NOTICE_MS || !keep) { n.el.remove(); noticeEls.delete(id); continue; }
                cls(n.el, 'out', age > NOTICE_MS - 500);
                i++;
            }
            if (seenNotices.size > 200) { const keepIds = new Set(list.map((n) => n.id)); for (const id of seenNotices) if (!keepIds.has(id)) seenNotices.delete(id); }
        }

        function paintStatuses(list) {
            const live = new Set();
            for (const c of list) {
                live.add(c.id);
                let e = chipEls.get(c.id);
                if (!e) {
                    const el = h('span', 'ahud-chip', statuses);
                    e = { el, g: h('i', '', el), n: h('span', 'n', el), x: h('b', 'x', el), t: h('span', 't', el), d: h('span', 'drain', el) };
                    chipEls.set(c.id, e);
                }
                attr(e.el, 'class', `ahud-chip st-${c.category}${c.frac != null && c.frac < 0.25 ? ' ending' : ''}`);
                attr(e.el, 'title', c.title);
                text(e.g, c.glyph); text(e.n, c.name); text(e.x, c.stacks ? `×${c.stacks}` : ''); text(e.t, c.left);
                width(e.d, c.frac == null ? '0%' : qpct(c.frac, 16));
            }
            for (const [id, e] of chipEls) if (!live.has(id)) { e.el.remove(); chipEls.delete(id); }
        }

        function update(m, now = 0) {
            if (!m) return;
            cls(box, 'in-combat', m.inCombat);
            // vitals
            const identity = m.player.portrait || {};
            const nextPortrait = JSON.stringify(identity);
            if (nextPortrait !== portraitKey && ENSO.sprites && ENSO.sprites.drawPortrait) {
                const context = portrait.getContext('2d');
                context.clearRect(0, 0, 32, 32);
                if (ENSO.sprites.drawPortrait(context, 0, 0, identity, 32) === true) portraitKey = nextPortrait;
            }
            text(vNameT, m.player.name); text(vLv, `Lv ${m.player.level}`);
            bar(hp, m.player.hp, m.player.maxHp, 64);
            text(hp.val, `${m.player.hp}/${m.player.maxHp}`);
            const k = m.player.maxHp ? m.player.hp / m.player.maxHp : 0;
            cls(hp.row, 'mid', k <= 0.5 && k > 0.25); cls(hp.row, 'low', k <= 0.25);
            cls(box, 'danger', k <= 0.25 && m.player.hp > 0);
            text(rs.label, m.player.resource.name);
            attr(rs.row, 'data-res', m.player.resource.kind);
            show(rs.row, m.player.resource.max > 0);
            bar(rs, m.player.resource.cur, m.player.resource.max, 64);
            text(rs.val, `${m.player.resource.cur}/${m.player.resource.max}`);
            // stamina: fully visible when not full or used in the last 1.2 s, else a faint line
            if (m.stamina) {
                const full = m.stamina.cur >= m.stamina.max;
                if (!full) stamSeenAt = now;
                width(stamFill, qpct(m.stamina.cur / m.stamina.max, 64));
                cls(stam, 'idle', full && now - stamSeenAt > 1200);
                cls(stam, 'empty', m.stamina.cur < m.stamina.max * 0.2);
            }
            show(stam, !!m.stamina);
            paintStatuses(m.statuses || []);
            // skill bar
            paintSlot(basicEl, m.basic, true);
            m.slots.forEach((s, i) => paintSlot(slotEls[i], s, false));
            cls(barEl, 'guarding', m.guarding);
            // the sim gives only the time left, so the shutter's full height is the largest value seen this cooldown
            dodgeTotal = m.dodgeReadyInMs > 0 ? Math.max(dodgeTotal, m.dodgeReadyInMs) : 0;
            height(dodgeSh, dodgeTotal ? qpct(m.dodgeReadyInMs / dodgeTotal, 14) : '0%');
            cls(dodge, 'is-cooldown', m.dodgeReadyInMs > 0); cls(dodge, 'is-ready', !(m.dodgeReadyInMs > 0));
            cls(dodge, 'is-nores', !!(m.stamina && m.stamina.cur < m.stamina.max * 0.2));
            // a refusal that blocks the whole bar (stunned, silenced…) is said once, above it
            show(note, !!m.barNote); text(note, m.barNote ? `✖ ${m.barNote}` : '');
            // prompt
            show(prompt, !!m.prompt);
            if (m.prompt) { text(pKey, m.prompt.key); text(pVerb, m.prompt.verb && m.prompt.name ? `${m.prompt.verb}:` : m.prompt.verb); text(pName, m.prompt.name); }
            // boss
            show(boss, !!m.boss);
            if (m.boss) {
                text(bossName, m.boss.name);
                const n = Math.max(m.boss.phases || 3, m.boss.phase);
                text(bossPips, Array.from({ length: n }, (_, i) => (i < m.boss.phase ? '◆' : '◇')).join(''));
                attr(bossPips, 'title', `Phase ${m.boss.phase}`);
                const f = m.boss.maxHp ? m.boss.hp / m.boss.maxHp : 0;
                width(bossFill, qpct(f, 192)); width(bossChip, qpct(f, 192));
            }
            // lock-on
            show(lock, !!m.lock);
            if (m.lock) {
                text(lockName, m.lock.boss ? 'Locked on' : m.lock.name);
                show(lockBar, !m.lock.boss);
                if (!m.lock.boss) width(lockFill, qpct(m.lock.hp / m.lock.maxHp, 48));
            }
            // quest
            show(quest, !!m.quest);
            if (m.quest) { text(qTitle, m.quest.title || ''); text(qText, `◆ ${m.quest.text || ''}${m.quest.where ? ` → ${m.quest.where}` : ''}`); }
            paintNotices(m.notices || [], now);
        }

        return {
            el: box,
            update,
            onSlot(fn) { if (typeof fn === 'function') slotFns.push(fn); },
            onAttack(fn) { if (typeof fn === 'function') attackFns.push(fn); },
            destroy() { box.remove(); slotFns.length = 0; attackFns.length = 0; chipEls.clear(); noticeEls.clear(); }
        };
    }

    const api = { create, viewModel, slotForKey, secondsText, abbrev, statusChips, SLOT_KEYS, BASIC_KEY, NOTICE_MS };
    ENSO.actionHud = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
