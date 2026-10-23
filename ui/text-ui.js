/* =========================================================================
 * Enso's Last Stand — TEXT UI
 * The only file that touches the DOM. It sends typed commands to the engine
 * and plays back the events it returns (with the typing effect + skip).
 * A Phaser front end would replace this file and reuse the engine untouched.
 * ========================================================================= */
(function () {
    const TYPING_SPEED_MS = 16;

    const output = document.getElementById('game-output');
    const input = document.getElementById('game-input');
    const submitButton = document.getElementById('submit-button');
    const skipButton = document.getElementById('skip-button');
    const hud = document.getElementById('player-hud');

    // ?seed=123 in the address replays a session; otherwise the engine picks one (shown under the HUD).
    const seedParam = /[?&]seed=(\d+)/.exec(location.search || '');
    const engine = new ENSO.GameEngine({ seed: seedParam ? parseInt(seedParam[1], 10) : undefined });
    window.enso = engine; // handy for poking at state from the browser console

    let busy = false;
    let skipRequested = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function setBusy(value) {
        busy = value;
        input.disabled = value;
        submitButton.disabled = value;
        skipButton.hidden = !value;
        if (!value) { skipRequested = false; input.focus(); }
    }

    async function play(events) {
        setBusy(true);
        for (const ev of events) {
            if (ev.type === 'clear') { output.innerHTML = ''; continue; }
            if (ev.type !== 'text') continue;
            const p = document.createElement('p');
            output.appendChild(p);
            if (ev.important) p.style.fontWeight = 'bold';
            if (!ev.text) { p.innerHTML = '&nbsp;'; continue; }

            if (ev.html || skipRequested) {
                if (ev.html) p.innerHTML = ev.text; else p.textContent = ev.text;
                output.scrollTop = output.scrollHeight;
                if (!skipRequested) await sleep(TYPING_SPEED_MS * 5);
                continue;
            }
            for (let i = 0; i < ev.text.length; i++) {
                if (skipRequested) { p.textContent = ev.text; break; }
                p.textContent += ev.text.charAt(i);
                output.scrollTop = output.scrollHeight;
                await sleep(TYPING_SPEED_MS);
            }
        }
        output.scrollTop = output.scrollHeight;
        renderHud(engine.getState());
        setBusy(false);
    }

    // Save / load (Phase 1 spec §5): the engine makes and checks the save; this page keeps one slot in the browser.
    const SAVE_KEY = 'enso.text.save.v1';
    const note = (text) => [{ type: 'text', text, important: true }];
    function saveCommand() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(engine.serialize({ label: engine.player ? engine.player.name : 'New game', createdAt: new Date().toISOString() })));
            return note("Game saved in this browser. Type 'load' to come back to this moment.");
        } catch (e) { return note(`Couldn't save here (${e.message}).`); }
    }
    function loadCommand() {
        let save = null;
        try { save = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return note(`Couldn't read the save (${e.message}).`); }
        if (!save) return note('There is no saved game in this browser yet.');
        const r = engine.load(save);
        if (!r.ok) return note(`Couldn't load: ${r.error.message}`);
        return [...r.events, ...r.warnings.map((w) => ({ type: 'text', text: `(${w.message})` }))];
    }

    async function submit() {
        if (busy) return;
        const text = input.value;
        input.value = '';
        if (!text.trim()) return;
        const cmd = text.trim().toLowerCase();
        if (cmd === 'save') { await play(saveCommand()); return; }
        if (cmd === 'load') { await play(loadCommand()); return; }
        await play(engine.input(text));
    }

    function bar(cls, percent, extra = '') {
        return `<div class="${cls}-container"><div class="${cls} ${extra}" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>`;
    }

    function renderHud(state) {
        const p = state.player;
        if (!p) { hud.innerHTML = ''; return; }

        const hpPct = p.maxHp ? (p.hp / p.maxHp) * 100 : 0;
        const hpClass = hpPct <= 30 ? 'critical' : hpPct <= 60 ? 'low' : '';
        const resPct = p.resource.max ? (p.resource.current / p.resource.max) * 100 : 0;

        const skills = p.skills.map((s) => {
            const tag = !s.implemented ? ' <em style="opacity:.6">(not implemented)</em>' : s.missing.length ? ' <em style="opacity:.6">(partial)</em>' : '';
            const cost = s.cost ? ` · ${s.cost}` : '';
            return `<li class="hud-action-item" title="${s.description.replace(/"/g, '&quot;')}"${s.implemented ? '' : ' style="opacity:.55"'}>
                        <span class="hud-icon">✨</span><span>${s.name}${s.detail ? ` (${s.detail}${cost})` : ''}${tag}</span></li>`;
        }).join('');

        const minions = state.combat && state.combat.minions.length
            ? `<div class="hud-section hud-minion-list"><strong>-- Minions --</strong><br>${state.combat.minions.map((m) => `${m.name}: ${m.hp}/${m.maxHp}`).join('<br>')}</div>`
            : '';

        const status = p.statusEffects.length
            ? `<br>Status: ${p.statusEffects.map((s) => s.name).join(', ')}` : '';

        hud.innerHTML = `
            <div class="hud-section">
                <strong>${p.name}</strong><br>
                Lvl ${p.level} ${state.progression.evolutionName || ''}<br>
                <small>XP ${p.xp}/${p.xpToNext}</small>
            </div>
            <div class="hud-section">
                HP: ${Math.max(0, p.hp)}/${p.maxHp}
                ${bar('hud-hp-bar', hpPct, hpClass)}
                DEF: ${p.def} · SPD: ${p.spd}<br>
                <small>STR ${p.strength} · INT ${p.intelligence} · AGI ${p.agility}</small>${status}
            </div>
            <div class="hud-section">
                ${p.resource.type}: ${p.resource.current}/${p.resource.max}
                ${bar('hud-resource-bar', resPct)}
            </div>
            ${minions}
            <div class="hud-section">
                <strong>-- Skills --</strong>
                <ul class="hud-actions-list">${skills}</ul>
            </div>
            <div class="hud-section">
                <strong>-- General Commands --</strong>
                <ul class="hud-actions-list">
                    <li class="hud-action-item"><span class="hud-icon">📜</span><span>inventory (i)</span></li>
                    <li class="hud-action-item"><span class="hud-icon">🧪</span><span>use &lt;item&gt;</span></li>
                    <li class="hud-action-item"><span class="hud-icon">👀</span><span>look</span></li>
                    <li class="hud-action-item"><span class="hud-icon">🌳</span><span>class_lore (cl)</span></li>
                    <li class="hud-action-item"><span class="hud-icon">❓</span><span>help</span></li>
                </ul>
            </div>
            <div class="hud-section"><small title="Open index.html?seed=${engine.seed} to replay this session">Seed ${engine.seed}</small></div>`;
    }

    // ---------- events ----------
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    submitButton.addEventListener('click', submit);
    skipButton.addEventListener('click', () => { if (busy) skipRequested = true; });
    // Space or Enter anywhere skips the typing (input is disabled while typing, so listen on the document)
    document.addEventListener('keydown', (e) => {
        if (busy && (e.key === ' ' || e.key === 'Enter')) { skipRequested = true; e.preventDefault(); }
    });

    play(engine.start());
})();
