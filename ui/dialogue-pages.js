/* =========================================================================
 * Enso's Last Stand — DIALOGUE PAGES (no DOM)
 * Pixie's dialogue box rules (docs/ui/DIALOGUE_BOX.md): a character's words are shown a page at a
 * time, at most two sentences (and about 160 characters) per page, with the speaker on a nameplate.
 * System lines the engine tags with `notice` (quest started or complete, objective, XP, level, items,
 * Gold) never go in the box: they become notifications beside it.
 * This file only arranges text. The engine decides what was said. Tested in tests/94-dialogue-pages.test.js.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const LIMITS = { maxSentences: 2, maxChars: 160 };

    /** Engine notice tags -> the notification style the UI shows (n-quest, n-xp, n-level, n-loot). */
    const NOTICE_KIND = { quest: 'quest', objective: 'objective', xp: 'xp', level: 'level', item: 'loot', gold: 'loot', loot: 'loot' };
    const noticeKind = (tag) => NOTICE_KIND[tag] || 'quest';

    /** Sentences, keeping their end marks and closing quotes. "You fall… and come" stays one sentence:
     *  a break needs the next word to start a new sentence (a capital, a digit or an opening quote). */
    function splitSentences(text) {
        const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
        if (!s) return [];
        const parts = s.split(/(?<=[.!?…]+["'”’)\]]*)\s+(?=["'“‘(\[]?[A-Z0-9À-Þ])/).map((x) => x.trim()).filter(Boolean);
        const out = [];
        for (const p of parts) {                          // "Mr. Hale" and "St. Aldric" are not sentence ends
            if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += ` ${p}`;
            else out.push(p);
        }
        return out;
    }
    const ABBREV = /(?:^|\s)(?:Mr|Mrs|Ms|Dr|St|Mt|Sgt|Capt|Lt|vs)\.$/;

    /** One over-long sentence cut at word boundaries (after a comma or dash when one is near the limit). */
    function breakLong(sentence, maxChars) {
        const out = [];
        let rest = sentence;
        while (rest.length > maxChars) {
            const head = rest.slice(0, maxChars + 1);
            let cut = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '), head.lastIndexOf(' — '), head.lastIndexOf(' - '));
            if (cut < maxChars * 0.5) cut = head.lastIndexOf(' ');
            else cut += 1;                                   // keep the comma on this page
            if (cut <= 0) cut = maxChars;
            out.push(`${rest.slice(0, cut).trim()}…`);
            rest = `…${rest.slice(cut).trim()}`;
        }
        if (rest.trim()) out.push(rest.trim());
        return out;
    }

    /** One paragraph -> pages of at most `maxSentences` sentences and about `maxChars` characters. */
    function paginate(text, limits = LIMITS) {
        const maxSentences = limits.maxSentences || LIMITS.maxSentences;
        const maxChars = limits.maxChars || LIMITS.maxChars;
        const pages = [];
        let page = [];
        const flush = () => { if (page.length) pages.push(page.join(' ')); page = []; };
        for (const sentence of splitSentences(text)) {
            for (const part of breakLong(sentence, maxChars)) {
                const joined = page.length ? `${page.join(' ')} ${part}` : part;
                if (page.length >= maxSentences || (page.length && joined.length > maxChars)) flush();
                page.push(part);
            }
        }
        flush();
        return pages;
    }

    /** `Mira: "Welcome back."` -> { speaker: 'Mira', text: 'Welcome back.' }; anything else is narration. */
    function parseLine(text) {
        const t = String(text == null ? '' : text).trim();
        const m = /^([^:"\n]{1,40}): "([\s\S]*)"$/.exec(t);
        return m ? { speaker: m[1].trim(), text: m[2].trim() } : { speaker: null, text: t };
    }

    /**
     * Readable engine lines ({ text, notice?, important? }) -> what the box and the notifications show.
     *   pages   : [{ speaker, text }] in order; each authored line starts a new page (a line is one beat)
     *   notices : [{ text, kind }] for every line the engine tagged as a system notice
     * opts.skipSpeaker drops the player's own echoed line (they just chose it from the menu).
     */
    function arrange(lines, opts = {}) {
        const limits = opts.limits || LIMITS;
        const notices = [];
        const runs = [];
        for (const raw of lines || []) {
            const line = typeof raw === 'string' ? { text: raw } : raw;
            if (!line || !String(line.text || '').trim()) continue;
            if (line.notice) { notices.push({ text: String(line.text).trim(), kind: noticeKind(line.notice) }); continue; }
            for (const piece of String(line.text).split(/\n+/)) {
                if (!piece.trim()) continue;
                const { speaker, text } = parseLine(piece);
                if (opts.skipSpeaker && speaker === opts.skipSpeaker) continue;
                runs.push({ speaker, text: [text] });
            }
        }
        const pages = [];
        for (const run of runs) for (const text of paginate(run.text.join(' '), limits)) pages.push({ speaker: run.speaker, text });
        return { pages, notices };
    }

    /** Typewriter reveal: how many characters show after `ms` (all of them when motion is reduced). */
    function revealed(text, ms, opts = {}) {
        const n = String(text || '').length;
        if (opts.instant) return n;
        const cps = opts.cps || 55;
        return Math.max(0, Math.min(n, Math.floor((ms / 1000) * cps)));
    }

    const api = { LIMITS, splitSentences, paginate, parseLine, arrange, revealed, noticeKind };
    ENSO.dialoguePages = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
