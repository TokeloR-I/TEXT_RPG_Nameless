/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Skill Web
 * One connected web of skills instead of locked class trees (Tokelo 2026-11-02,
 * docs/design/SKILL_WEB.md). Data: `skillWeb` in src/data.js, plus the classes and
 * evolution branches it is built from.
 *
 *   - Every class has a heart node. You own your own heart and your starting skills.
 *   - Levels give Skill Web points (rules.pointsPerLevel). A node costs points and can be
 *     learned when it touches a node you own, your level is high enough and its story
 *     event (if any) has happened. Active nodes add a skill (it joins the skill bar);
 *     passive nodes add a trait. Hearts of other classes open their region.
 *   - A branch's evolution stages are reached by owning all its nodes up to that stage.
 *     Any reached branch can be your specialization (title, resource, branch mechanics),
 *     whichever class it belongs to. `progression.branch` is that specialization.
 *   - Choosing a path at level 3 (choose_branch) also sets it as your guide: the guide
 *     learns that branch's nodes as you level, so a one-path player evolves exactly as
 *     before. Free points can go anywhere.
 *
 * State: `progression.web = { nodes: [ids], guide, bonusPoints }`. Older saves are migrated
 * the first time it is read (webState()).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const { clone, pretty } = isNode ? require('./util.js') : ENSO.engineUtil;

    const slug = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[\s_]+/g, ' ').trim();

    // ---------------------------------------------------------------------
    // Building the web (pure; cached per data object)
    // ---------------------------------------------------------------------
    /** The whole web as { nodes: Map(id -> node), list, branches: { branchId: { classId, name, stages: [[ids]] } } }.
     *  Throws on a duplicate id or a link to a missing node (validateSkillWeb reports the rest). */
    function buildSkillWeb(data) {
        const cfg = data.skillWeb || {};
        const rules = cfg.rules || {};
        const nodes = new Map();
        const branches = {};
        const costOf = (kind) => { const c = (rules.cost || {})[kind]; return c == null ? 1 : c; };
        const add = (n) => {
            if (nodes.has(n.id)) throw new Error(`Skill Web: duplicate node id '${n.id}'`);
            const node = { branch: null, stage: null, minLevel: 1, requiresEvent: null, base: false, ...n, links: [] };
            if (node.cost == null) node.cost = costOf(node.kind);
            nodes.set(node.id, node);
            return node;
        };
        const link = (a, b) => {
            const na = nodes.get(a), nb = nodes.get(b);
            if (!na || !nb) throw new Error(`Skill Web: link to a missing node ('${a}' - '${b}')`);
            if (a === b) return;
            if (!na.links.includes(b)) na.links.push(b);
            if (!nb.links.includes(a)) nb.links.push(a);
        };

        for (const classId of Object.keys(data.basePlayerClasses || {})) {
            const cls = data.basePlayerClasses[classId];
            const heart = add({ id: `heart.${classId}`, kind: 'heart', region: classId, label: cls.name, traits: clone(cls.startingTraits || []), base: true });
            for (const skill of cls.startingSkills || []) {
                const n = add({ id: `${classId}.${slug(skill)}`, kind: 'active', region: classId, label: skill, skill, base: true });
                link(heart.id, n.id);
            }
            const tree = (data.evolutionPaths || {})[classId];
            for (const branchId of Object.keys((tree && tree.branches) || {})) {
                const br = tree.branches[branchId];
                const info = branches[branchId] = { classId, name: br.name, stages: [] };
                let prev = heart.id;
                const seen = new Set();
                br.stages.forEach((st, i) => {
                    const ids = [];
                    const gate = { region: classId, branch: branchId, stage: i, minLevel: st.level || 1, requiresEvent: st.unlockTrigger || null };
                    if (st.skill && !seen.has(st.skill)) {
                        seen.add(st.skill);
                        const n = add({ id: `${branchId}.${i + 1}.skill`, kind: 'active', label: st.skill, skill: st.skill, ...gate });
                        link(prev, n.id); prev = n.id; ids.push(n.id);
                    }
                    if (st.trait) {
                        const trait = { name: st.trait, effect: st.traitEffect };
                        if (st.damageReductionOverride != null) trait.damageReductionOverride = st.damageReductionOverride;
                        const n = add({ id: `${branchId}.${i + 1}.trait`, kind: 'passive', label: st.trait, trait, ...gate });
                        link(prev, n.id); prev = n.id; ids.push(n.id);
                    }
                    info.stages.push(ids);
                });
            }
        }
        for (const x of cfg.extraNodes || []) {
            const { links, ...rest } = x;
            add({ label: x.skill || (x.trait && x.trait.name) || x.id, ...rest, stage: null });
        }
        for (const x of cfg.extraNodes || []) for (const to of x.links || []) link(x.id, to);
        const ring = rules.ring || [];
        if (ring.length > 1) ring.forEach((c, i) => link(`heart.${c}`, `heart.${ring[(i + 1) % ring.length]}`));
        for (const [a, b] of cfg.bridges || []) link(a, b);
        layout(nodes, ring.length ? ring : Object.keys(data.basePlayerClasses || {}));
        return { nodes, list: [...nodes.values()], branches };
    }

    /** Positions for a web view, in a unit circle (a node's own `pos: [x, y]` wins). */
    function layout(nodes, ring) {
        const byRegion = {};
        for (const n of nodes.values()) (byRegion[n.region] || (byRegion[n.region] = [])).push(n);
        ring.forEach((classId, ci) => {
            const centre = -Math.PI / 2 + (ci * 2 * Math.PI) / ring.length;
            const spread = (2 * Math.PI) / ring.length * 0.8;
            const list = byRegion[classId] || [];
            const branchIds = [...new Set(list.filter((n) => n.branch).map((n) => n.branch))];
            const put = (n, r, a) => { n.x = +(r * Math.cos(a)).toFixed(3); n.y = +(r * Math.sin(a)).toFixed(3); };
            const base = list.filter((n) => !n.branch && n.kind !== 'heart');
            for (const n of list) {
                if (n.pos) { n.x = n.pos[0]; n.y = n.pos[1]; continue; }
                if (n.kind === 'heart') { put(n, 0.22, centre); continue; }
                if (!n.branch) { const k = base.indexOf(n); put(n, 0.34, centre + (k - (base.length - 1) / 2) * 0.16); continue; }
                const b = branchIds.indexOf(n.branch);
                const a = centre + (b - (branchIds.length - 1) / 2) * (spread / Math.max(1, branchIds.length));
                if (n.stage == null) { put(n, 0.5 + 0.08 * (list.filter((m) => m.branch === n.branch && m.stage == null).indexOf(n) + 1), a + 0.09); continue; }
                put(n, 0.45 + n.stage * 0.11 + (n.kind === 'passive' ? 0.05 : 0), a);
            }
        });
    }

    /** Everything wrong with the web's data, as strings ([] when it is fine). Tested. */
    function validateSkillWeb(data) {
        const problems = [];
        let web;
        try { web = buildSkillWeb(data); } catch (err) { return [err.message]; }
        const defs = data.skillDefinitions || {};
        for (const n of web.list) {
            if (!['heart', 'active', 'passive'].includes(n.kind)) problems.push(`${n.id}: unknown kind '${n.kind}'`);
            if (n.kind === 'active' && !defs[n.skill]) problems.push(`${n.id}: skill '${n.skill}' is not in skillDefinitions`);
            if (n.kind === 'passive' && !(n.trait && n.trait.name)) problems.push(`${n.id}: a passive node needs a trait`);
            if (!(data.basePlayerClasses || {})[n.region]) problems.push(`${n.id}: unknown region '${n.region}'`);
            if (n.branch && !web.branches[n.branch]) problems.push(`${n.id}: unknown branch '${n.branch}'`);
            if (!(Number.isInteger(n.cost) && n.cost >= 0)) problems.push(`${n.id}: cost must be a whole number`);
            if (!n.links.length) problems.push(`${n.id}: not linked to anything`);
        }
        // Every node can be reached from every heart (the web is one piece).
        const start = web.list.find((n) => n.kind === 'heart');
        if (start) {
            const seen = new Set([start.id]);
            const queue = [start.id];
            while (queue.length) for (const to of web.nodes.get(queue.shift()).links) if (!seen.has(to)) { seen.add(to); queue.push(to); }
            for (const n of web.list) if (!seen.has(n.id)) problems.push(`${n.id}: not connected to the rest of the web`);
        }
        return problems;
    }

    const CACHE = typeof WeakMap === 'function' ? new WeakMap() : null;
    const webFor = (data) => {
        if (!CACHE) return buildSkillWeb(data);
        if (!CACHE.has(data)) CACHE.set(data, buildSkillWeb(data));
        return CACHE.get(data);
    };

    class SkillWebMethods {
        /** The built web for this engine's data. */
        skillWeb() { return webFor(this.data); }
        webRules() { return (this.data.skillWeb && this.data.skillWeb.rules) || {}; }

        /** progression.web, created (or migrated from an older save) on first read. */
        webState() {
            const prog = this.progression;
            const p = this.player;
            if (!prog || !p) return null;
            if (prog.web && Array.isArray(prog.web.nodes)) return prog.web;
            const web = this.skillWeb();
            const own = web.list.filter((n) => n.region === p.className && n.base).map((n) => n.id);
            // An older save: it walked one branch up to stageIndex. Own exactly those nodes.
            const info = prog.branch && web.branches[prog.branch];
            if (info) info.stages.slice(0, prog.stageIndex + 1).forEach((ids) => own.push(...ids));
            prog.web = { nodes: own, guide: info ? prog.branch : null, bonusPoints: 0 };
            return prog.web;
        }

        webOwns(id) { const s = this.webState(); return !!s && s.nodes.includes(id); }
        /** Own heart and own starting skills: free, and never unlearned. */
        webNodeFixed(node) { return !!(node.base && this.player && node.region === this.player.className); }
        webPointsEarned() {
            const s = this.webState();
            if (!s) return 0;
            const per = this.webRules().pointsPerLevel;
            return (this.player.level - 1) * (per == null ? 1 : per) + (s.bonusPoints || 0);
        }
        webPointsSpent() {
            const web = this.skillWeb();
            return (this.webState() || { nodes: [] }).nodes.reduce((sum, id) => {
                const n = web.nodes.get(id);
                return sum + (n && !this.webNodeFixed(n) ? n.cost : 0);
            }, 0);
        }
        webPoints() { return this.webPointsEarned() - this.webPointsSpent(); }

        /** A node by id, skill name, trait name or label (case-insensitive). Prefers one you can learn now. */
        findWebNode(query, wantOwned = false) {
            const web = this.skillWeb();
            if (web.nodes.has(query)) return web.nodes.get(query);
            const q = norm(query);
            if (!q) return null;
            const hits = web.list.filter((n) => norm(n.id) === q || norm(n.label) === q || norm(n.skill) === q || (n.trait && norm(n.trait.name) === q));
            if (!hits.length) return null;
            return hits.find((n) => wantOwned ? this.webOwns(n.id) : !this.webLearnProblem(n.id)) || hits.find((n) => this.webOwns(n.id) === wantOwned) || hits[0];
        }

        webUnavailable() {
            const p = this.player;
            if (!p || !this.webState()) return { code: 'WEB_UNAVAILABLE', message: 'Choose a class first.' };
            if (p.isHollowKing) return { code: 'WEB_UNAVAILABLE', message: 'Your form is beyond the Skill Web.' };
            return null;
        }
        webCombatProblem() {
            return this.mode === 'combat' ? { code: 'IN_COMBAT', message: "You can't change your Skill Web during a fight." } : null;
        }

        /** Why this node can't be learned now, or null (pure). opts.ignoreMode: level-ups mid-fight (the guide). */
        webLearnProblem(id, opts = {}) {
            const off = this.webUnavailable();
            if (off) return off;
            if (!opts.ignoreMode) { const busy = this.webCombatProblem(); if (busy) return busy; }
            const web = this.skillWeb();
            const n = web.nodes.get(id);
            if (!n) return { code: 'UNKNOWN_NODE', message: `There is no '${id}' in the Skill Web.` };
            if (this.webOwns(id)) return { code: 'ALREADY_LEARNED', message: `You already know ${n.label}.` };
            if (!n.links.some((to) => this.webOwns(to))) return { code: 'NOT_CONNECTED', message: `${n.label} isn't connected to anything you know yet.` };
            if (this.player.level < n.minLevel) return { code: 'LEVEL_TOO_LOW', message: `Reach level ${n.minLevel} to learn ${n.label}.` };
            if (n.requiresEvent && !this.flags.eventsUnlocked) return { code: 'EVENT_LOCKED', message: `${n.label} awaits — requires: ${n.requiresEvent}.` };
            const pts = this.webPoints();
            if (pts < n.cost) return { code: 'NO_WEB_POINTS', message: `${n.label} needs ${n.cost} Skill Web point${n.cost === 1 ? '' : 's'}; you have ${Math.max(0, pts)}.` };
            return null;
        }

        /** Why this node can't be unlearned now, or null (pure). It must leave the rest connected to your heart. */
        webUnlearnProblem(id) {
            const off = this.webUnavailable() || this.webCombatProblem();
            if (off) return off;
            const web = this.skillWeb();
            const n = web.nodes.get(id);
            if (!n) return { code: 'UNKNOWN_NODE', message: `There is no '${id}' in the Skill Web.` };
            if (!this.webOwns(id)) return { code: 'NOT_LEARNED', message: `You haven't learned ${n.label}.` };
            if (this.webNodeFixed(n)) return { code: 'NODE_FIXED', message: `${n.label} is part of who you are; it can't be unlearned.` };
            if (this.webRules().refund === false) return { code: 'NO_REFUND', message: 'Skill Web points cannot be refunded.' };
            const rest = new Set(this.webState().nodes.filter((x) => x !== id));
            const heart = `heart.${this.player.className}`;
            const seen = new Set([heart]);
            const queue = [heart];
            while (queue.length) for (const to of web.nodes.get(queue.shift()).links) if (rest.has(to) && !seen.has(to)) { seen.add(to); queue.push(to); }
            const cut = [...rest].filter((x) => !seen.has(x));
            if (cut.length) return { code: 'NODE_ANCHORS_OTHERS', message: `Other skills hang from ${n.label} (${cut.map((x) => web.nodes.get(x).label).join(', ')}). Unlearn those first.` };
            return null;
        }

        /** learn_node: learn a node by id or name. */
        learnWebNode(query) {
            const n = this.findWebNode(String(query || ''));
            if (!n) { const off = this.webUnavailable(); this.refuse(off ? off.code : 'UNKNOWN_NODE', off ? off.message : `There is no '${query}' in the Skill Web.`); return; }
            const problem = this.webLearnProblem(n.id);
            if (problem) { this.refuse(problem.code, problem.message); return; }
            this.webGain(n);
            this.refreshSpecialization();
            const left = this.webPoints();
            this.say(`Skill Web points left: ${left}.`);
        }

        /** unlearn_node: give a node back for its points. */
        unlearnWebNode(query) {
            const n = this.findWebNode(String(query || ''), true);
            if (!n) { const off = this.webUnavailable(); this.refuse(off ? off.code : 'UNKNOWN_NODE', off ? off.message : `There is no '${query}' in the Skill Web.`); return; }
            const problem = this.webUnlearnProblem(n.id);
            if (problem) { this.refuse(problem.code, problem.message); return; }
            const s = this.webState();
            s.nodes = s.nodes.filter((x) => x !== n.id);
            this.webRevoke(n);
            if (s.guide && n.branch === s.guide) { s.guide = null; this.say('You step off your guided path; spend your points as you like.'); }
            this.say(`You unlearn ${n.label} (+${n.cost} Skill Web point${n.cost === 1 ? '' : 's'}).`, { important: true });
            this.refreshSpecialization();
        }

        /** Own a node and grant what it holds (no checks). */
        webGain(n) {
            const p = this.player;
            const s = this.webState();
            if (!s.nodes.includes(n.id)) s.nodes.push(n.id);
            if (n.kind === 'heart' && !this.webNodeFixed(n)) this.say(`The ${n.label}'s path opens to you.`, { important: true });
            if (n.skill && !p.skills.includes(n.skill)) {
                p.skills.push(n.skill);
                const info = this.describeSkill(n.skill);
                this.say(`New Skill: ${n.skill}!${info.implemented ? '' : ' (not implemented yet)'}`, { important: true });
            }
            for (const t of n.trait ? [n.trait] : (n.traits || [])) {
                if (p.traits.some((x) => x.name === t.name)) continue;
                p.traits.push(clone(t));
                this.say(`New Trait: ${t.name}!`, { important: true });
            }
        }

        /** Take back what a node granted, unless another owned node (or your class) still grants it. */
        webRevoke(n) {
            const p = this.player;
            const web = this.skillWeb();
            const owned = this.webState().nodes.map((id) => web.nodes.get(id)).filter(Boolean);
            if (n.skill && !owned.some((o) => o.skill === n.skill)) p.skills = p.skills.filter((x) => x !== n.skill);
            for (const t of n.trait ? [n.trait] : (n.traits || [])) {
                const still = owned.some((o) => (o.trait && o.trait.name === t.name) || (o.traits || []).some((x) => x.name === t.name));
                if (!still) p.traits = p.traits.filter((x) => x.name !== t.name);
            }
        }

        // -----------------------------------------------------------------
        // Specializations (the evolutions)
        // -----------------------------------------------------------------
        /** Highest stage index of a branch whose nodes (and all earlier stages') you own; -1 for none. */
        webStageReached(branchId) {
            const info = this.skillWeb().branches[branchId];
            if (!info) return -1;
            let reached = -1;
            for (let i = 0; i < info.stages.length; i++) {
                if (!info.stages[i].every((id) => this.webOwns(id))) break;
                reached = i;
            }
            return reached;
        }
        webSpecializations() {
            return Object.keys(this.skillWeb().branches).filter((b) => this.webStageReached(b) >= 0);
        }
        branchDef(branchId) {
            const info = this.skillWeb().branches[branchId];
            return info ? this.data.evolutionPaths[info.classId].branches[branchId] : null;
        }

        /** The resource a specialization runs on at a stage: the branch's class resource, then its resource evolutions. */
        specResource(branchId, stageIndex) {
            const p = this.player;
            const info = branchId && this.skillWeb().branches[branchId];
            const clsId = info ? info.classId : p.className;
            const start = this.data.basePlayerClasses[clsId].startingResource;
            const res = { type: start.type, regen: start.regen || 0 };
            if (!info || stageIndex < 0) return res;
            const br = this.branchDef(branchId);
            const level = br.stages[stageIndex].level;
            for (const r of br.resourceEvolution || []) {
                if (r.level > level) continue;
                res.type = r.type;
                const rule = (this.data.resourceRules || {})[r.type];
                if (rule && rule.regen != null) res.regen = rule.regen;
            }
            return res;
        }

        /** Bring progression.branch / stageIndex / evolutionName and the resource in line with the web. */
        refreshSpecialization(opts = {}) {
            const p = this.player;
            const prog = this.progression;
            if (!p || p.isHollowKing || !this.webState()) return;
            const s = this.webState();
            if (prog.branch && this.webStageReached(prog.branch) < 0) prog.branch = null;
            if (!prog.branch) {
                const open = this.webSpecializations();
                prog.branch = (s.guide && open.includes(s.guide) && s.guide) || open[0] || null;
                if (prog.branch !== null) prog.stageIndex = -1;
            }
            const before = prog.branch ? prog.stageIndex : -1;
            const reached = prog.branch ? this.webStageReached(prog.branch) : -1;
            if (prog.branch) {
                const br = this.branchDef(prog.branch);
                if (opts.announce !== false) for (let i = before + 1; i <= reached; i++) {
                    this.say(`--- Your destiny unfolds! You become a ${br.stages[i].name}! ---`, { important: true });
                    if (br.stages[i].lore) this.say(`"${br.stages[i].lore}"`);
                }
                prog.stageIndex = reached;
                prog.evolutionName = br.stages[reached].name;
            } else {
                prog.stageIndex = -1;
                prog.evolutionName = this.data.basePlayerClasses[p.className].name;
            }
            const res = this.specResource(prog.branch, reached);
            if (res.type !== p.resource.type) {
                this.say(`Your ${p.resource.type} becomes ${res.type}.`);
                p.resource.type = res.type;
                p.resource.regen = res.regen;
                p.resource.current = Math.min(p.resource.current, p.resource.max);
            }
        }

        /** set_specialization: walk as any branch you have reached (out of a fight). */
        setSpecialization(branchId) {
            const off = this.webUnavailable() || this.webCombatProblem();
            if (off) { this.refuse(off.code, off.message); return; }
            const key = this.webBranchKey(branchId);
            if (!key) { this.refuse('INVALID_BRANCH', 'That is not a path in the Skill Web.'); return; }
            if (this.webStageReached(key) < 0) { this.refuse('SPEC_LOCKED', `Learn the first ${this.branchDef(key).name} skills to walk that path.`); return; }
            if (this.progression.branch === key) { this.refuse('ALREADY_SPEC', `You already walk as a ${this.progression.evolutionName}.`); return; }
            this.progression.branch = key;
            this.progression.stageIndex = this.webStageReached(key);
            this.refreshSpecialization({ announce: false });
            this.say(`You now walk as a ${this.progression.evolutionName}.`, { important: true });
        }

        /** set_web_guide: the branch the guide follows on level-up, or off (null / 'off'). */
        setWebGuide(branchId) {
            const off = this.webUnavailable();
            if (off) { this.refuse(off.code, off.message); return; }
            const s = this.webState();
            if (branchId == null || /^(off|none|free)$/i.test(String(branchId).trim())) {
                s.guide = null;
                this.say('No guide: your Skill Web points wait for you to spend them.');
                return;
            }
            const key = this.webBranchKey(branchId);
            if (!key) { this.refuse('INVALID_BRANCH', 'That is not a path in the Skill Web.'); return; }
            s.guide = key;
            this.say(`Your guide now follows the ${this.branchDef(key).name} path.`);
            this.followWebGuide();
            this.refreshSpecialization();
        }

        webBranchKey(input) {
            const q = norm(input);
            return Object.keys(this.skillWeb().branches).find((k) => norm(k) === q || norm(this.skillWeb().branches[k].name) === q) || null;
        }

        /** Learn the guide branch's nodes in order while points, level and story events allow. */
        followWebGuide() {
            const s = this.webState();
            if (!s || !s.guide || (this.player && this.player.isHollowKing)) return;
            const info = this.skillWeb().branches[s.guide];
            if (!info) return;
            for (const ids of info.stages) for (const id of ids) {
                if (this.webOwns(id)) continue;
                const problem = this.webLearnProblem(id, { ignoreMode: true });
                if (problem) {
                    if (problem.code === 'EVENT_LOCKED') {
                        const n = this.skillWeb().nodes.get(id);
                        this.say(`(${this.branchDef(s.guide).stages[n.stage].name} awaits — requires: ${n.requiresEvent}.)`);
                    }
                    return;
                }
                this.webGain(this.skillWeb().nodes.get(id));
            }
        }

        // -----------------------------------------------------------------
        // Views
        // -----------------------------------------------------------------
        /** For front ends (pure): the web with each node's state for this player. */
        getSkillWeb() {
            const s = this.webState();
            if (!s) return null;
            const web = this.skillWeb();
            const prog = this.progression;
            return {
                points: this.webPoints(), earned: this.webPointsEarned(),
                guide: s.guide || null,
                specialization: prog.branch ? { branchId: prog.branch, name: prog.evolutionName, stageIndex: prog.stageIndex } : null,
                specializations: this.webSpecializations().map((b) => ({ branchId: b, name: web.branches[b].name, classId: web.branches[b].classId, stageIndex: this.webStageReached(b) })),
                nodes: web.list.map((n) => {
                    const owned = this.webOwns(n.id);
                    const problem = owned ? null : this.webLearnProblem(n.id);
                    return {
                        id: n.id, kind: n.kind, label: n.label, region: n.region, branch: n.branch, stage: n.stage,
                        skill: n.skill || null, trait: n.trait ? clone(n.trait) : null, cost: n.cost, minLevel: n.minLevel,
                        links: [...n.links], x: n.x, y: n.y, owned, fixed: this.webNodeFixed(n),
                        state: owned ? 'owned' : problem ? 'locked' : 'available',
                        ...(problem ? { reason: problem } : {})
                    };
                })
            };
        }

        /** Text view: what you have, what you can learn next. */
        showSkillWeb() {
            const off = this.webUnavailable();
            if (off) { this.refuse(off.code, off.message); return; }
            const view = this.getSkillWeb();
            this.say('--- Skill Web ---', { important: true });
            this.say(`Points: ${view.points} unspent (${view.earned} earned).${view.guide ? ` Guide: ${this.branchDef(view.guide).name}.` : ''}`);
            if (view.specialization) this.say(`Specialization: ${view.specialization.name} (${this.branchDef(view.specialization.branchId).name}).`);
            const others = view.specializations.filter((x) => !view.specialization || x.branchId !== view.specialization.branchId);
            if (others.length) this.say(`Also open to you: ${others.map((x) => x.name).join(', ')} ('specialize <path>').`);
            const kindTag = (n) => n.kind === 'passive' ? 'passive' : n.kind === 'heart' ? 'class' : 'skill';
            const owned = view.nodes.filter((n) => n.owned && n.kind !== 'heart');
            this.say(`Known: ${owned.map((n) => n.label).join(', ') || 'nothing yet'}.`);
            const ready = view.nodes.filter((n) => n.state === 'available');
            const near = view.nodes.filter((n) => n.state === 'locked' && n.reason.code !== 'NOT_CONNECTED');
            if (ready.length) {
                this.say('Learn now:');
                for (const n of ready) this.say(`- ${n.label} (${kindTag(n)}, ${n.cost} pt)${n.branch ? ` · ${this.branchDef(n.branch).name}` : ` · ${pretty(n.region)}`}`);
            }
            if (near.length) {
                this.say('Next in reach:');
                for (const n of near) this.say(`- ${n.label}: ${n.reason.message}`);
            }
            this.say("Type 'learn <skill>' to learn, 'unlearn <skill>' to refund, 'guide <path|off>' to auto-learn a path.");
        }
    }

    SkillWebMethods.buildSkillWeb = buildSkillWeb;
    SkillWebMethods.validateSkillWeb = validateSkillWeb;
    ENSO.skillWeb = { buildSkillWeb, validateSkillWeb };
    (ENSO.engineModules || (ENSO.engineModules = {}))['skill-web'] = SkillWebMethods;
    if (isNode) module.exports = SkillWebMethods;
})(typeof window !== 'undefined' ? window : globalThis);
