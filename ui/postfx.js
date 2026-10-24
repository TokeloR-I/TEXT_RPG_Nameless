/* =========================================================================
 * Enso's Last Stand — POST-PROCESSING (HD-2D pipeline)
 * The world renderer (ui/world-render.js) draws the pixel-art scene on an offscreen 2D canvas at its
 * native size. This compositor puts it on screen through WebGL:
 *   - the pixel art stays crisp (nearest-neighbour), sampled at full display resolution;
 *   - point lights the renderer reports (lanterns, fires, the player's glow) light the scene in colour;
 *   - bloom (bright pass + two blur levels), colour grading (exposure, contrast, saturation, split
 *     toning per map), a tilt-shift depth-of-field band, and a vignette.
 * Smooth light over crisp pixels is what gives the HD-2D look. Without WebGL, create() returns null
 * and the renderer draws straight to the visible canvas as before.
 * Presentation only: it reads a canvas and a list of lights, it never touches game state.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const MAX_LIGHTS = 24;

    /** Default look; maps override any field with ambient.grade (src/world). Pure data, also used by tests. */
    const DEFAULT_GRADE = {
        exposure: 1.0, contrast: 1.08, saturation: 1.12,
        shadows: [0.05, 0.07, 0.14],      // added in the darks (cool)
        highlights: [0.06, 0.03, -0.02],  // added in the lights (warm)
        ambient: 1.0,                     // how much the scene keeps without lights (1 = fully lit day)
        bloom: 0.4, bloomThreshold: 0.78,
        vignette: 0.42, dof: 0.6
    };
    function gradeFor(ambient) {
        const a = ambient || {};
        const g = { ...DEFAULT_GRADE };
        if (a.darkness) {                                  // dark places: lights matter more, colder shadows
            g.ambient = Math.max(0.35, 1 - a.darkness * 0.55);
            g.shadows = [0.03, 0.05, 0.13];
            g.bloom = 0.8;
        }
        return Object.assign(g, a.grade || {});
    }

    const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
    const BRIGHT = `precision mediump float; varying vec2 uv; uniform sampler2D src; uniform float threshold;
        void main(){ vec3 c = texture2D(src, uv).rgb; float l = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c * smoothstep(threshold, 1.0, l), 1.0); }`;
    const BLUR = `precision mediump float; varying vec2 uv; uniform sampler2D src; uniform vec2 dir;
        void main(){ vec3 c = texture2D(src, uv).rgb * 0.227;
            c += (texture2D(src, uv + dir * 1.385).rgb + texture2D(src, uv - dir * 1.385).rgb) * 0.316;
            c += (texture2D(src, uv + dir * 3.231).rgb + texture2D(src, uv - dir * 3.231).rgb) * 0.070;
            gl_FragColor = vec4(c, 1.0); }`;
    const COMPOSITE = `precision mediump float; varying vec2 uv;
        uniform sampler2D scene; uniform sampler2D soft; uniform sampler2D bloomA; uniform sampler2D bloomB;
        uniform vec2 size;                                   // scene size in its own pixels
        uniform vec4 lights[${MAX_LIGHTS}]; uniform vec3 lightCol[${MAX_LIGHTS}]; uniform int lightCount;
        uniform float exposure, contrast, saturation, ambient, bloom, vignette, dof, fade;
        uniform vec3 shadows, highlights;
        void main(){
            vec2 q = vec2(uv.x, 1.0 - uv.y);
            vec3 c = texture2D(scene, q).rgb;
            // tilt-shift: the top and bottom of the screen soften, the middle band stays sharp
            float band = smoothstep(0.30, 0.5, abs(q.y - 0.5)) * dof;
            c = mix(c, texture2D(soft, q).rgb, band);
            // lights: coloured falloff, multiplied into the scene and a little added as glow
            vec2 px = q * size; vec3 lit = vec3(ambient); vec3 glow = vec3(0.0);
            float k = clamp(1.25 - ambient, 0.25, 1.0);          // lights matter more the darker the place
            for (int i = 0; i < ${MAX_LIGHTS}; i++) {
                if (i >= lightCount) break;
                float d = length(px - lights[i].xy) / max(lights[i].z, 1.0);
                float f = clamp(1.0 - d, 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
                lit += lightCol[i] * f * lights[i].w * k;
                glow += lightCol[i] * f * f * lights[i].w * 0.12 * k;
            }
            c = c * lit + glow;
            c += texture2D(bloomA, q).rgb * bloom * 0.6 + texture2D(bloomB, q).rgb * bloom;
            // grading
            c *= exposure;
            float l = dot(c, vec3(0.299, 0.587, 0.114));
            c = mix(vec3(l), c, saturation);
            c = (c - 0.5) * contrast + 0.5;
            c += shadows * (1.0 - smoothstep(0.0, 0.5, l)) + highlights * smoothstep(0.5, 1.0, l);
            // vignette
            vec2 v = q - 0.5; c *= 1.0 - vignette * smoothstep(0.25, 0.75, dot(v, v) * 2.0);
            c *= 1.0 - fade;
            gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
        }`;

    function create(canvas, opts = {}) {
        if (isNode || !canvas || typeof canvas.getContext !== 'function') return null;
        let gl = null;
        try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve }); } catch (e) { gl = null; }
        if (!gl) return null;

        const shader = (type, src) => {
            const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        };
        const program = (frag) => {
            const p = gl.createProgram();
            gl.attachShader(p, shader(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, frag));
            gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
            const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
            return { p, u };
        };
        let progs;
        try { progs = { bright: program(BRIGHT), blur: program(BLUR), comp: program(COMPOSITE) }; } catch (e) { console.warn('postfx: falling back to plain canvas', e); return null; }

        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        const texture = (filter) => {
            const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return t;
        };
        const sceneTex = texture(gl.NEAREST);          // crisp pixels
        const sceneSoft = texture(gl.LINEAR);          // the same picture, smooth, for blur and bloom input
        const targets = {};
        function target(name, w, h) {
            let t = targets[name];
            if (t && t.w === w && t.h === h) return t;
            if (!t) { t = { tex: texture(gl.LINEAR), fb: gl.createFramebuffer() }; targets[name] = t; }
            gl.bindTexture(gl.TEXTURE_2D, t.tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
            t.w = w; t.h = h;
            return t;
        }
        function pass(prog, out, inputs, set) {
            gl.useProgram(prog.p);
            gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
            gl.viewport(0, 0, out ? out.w : canvas.width, out ? out.h : canvas.height);
            inputs.forEach(([name, tex], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(prog.u[name], i); });
            if (set) set(prog.u);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        function blur(src, tmp, out) {
            pass(progs.blur, tmp, [['src', src.tex]], (u) => gl.uniform2f(u.dir, 1 / src.w, 0));
            pass(progs.blur, out, [['src', tmp.tex]], (u) => gl.uniform2f(u.dir, 0, 1 / tmp.h));
        }

        const lightData = new Float32Array(MAX_LIGHTS * 4), colData = new Float32Array(MAX_LIGHTS * 3);
        /** scene: the 2D canvas the renderer drew; frame: { lights: [{ x, y, r, color: [r,g,b], intensity }], grade, fade } */
        function render(scene, frame = {}) {
            const dpr = Math.min(global.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.round(canvas.clientWidth * dpr)) || scene.width, h = Math.max(1, Math.round(canvas.clientHeight * dpr)) || scene.height;
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
            for (const t of [sceneTex, sceneSoft]) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene); }
            const g = { ...DEFAULT_GRADE, ...(frame.grade || {}) };
            const sw = scene.width, sh = scene.height;
            const half = [Math.max(1, sw >> 1), Math.max(1, sh >> 1)], quarter = [Math.max(1, sw >> 2), Math.max(1, sh >> 2)];
            const bright = target('bright', ...half), tA = target('tA', ...half), bloomA = target('bloomA', ...half);
            const bq = target('bq', ...quarter), tB = target('tB', ...quarter), bloomB = target('bloomB', ...quarter);
            const softA = target('softA', ...half), softB = target('softB', ...half);
            pass(progs.bright, bright, [['src', sceneSoft]], (u) => gl.uniform1f(u.threshold, g.bloomThreshold));
            blur(bright, tA, bloomA);
            pass(progs.blur, bq, [['src', bloomA.tex]], (u) => gl.uniform2f(u.dir, 0, 0));
            blur(bq, tB, bloomB); blur(bloomB, tB, bloomB);
            pass(progs.blur, softA, [['src', sceneSoft]], (u) => gl.uniform2f(u.dir, 0, 0));
            blur(softA, softB, softA);

            const lights = (frame.lights || []).slice(0, MAX_LIGHTS);
            lightData.fill(0); colData.fill(0);
            lights.forEach((l, i) => {
                lightData.set([l.x, l.y, l.r, l.intensity == null ? 1 : l.intensity], i * 4);
                colData.set(l.color || [1, 0.8, 0.55], i * 3);
            });
            pass(progs.comp, null, [['scene', sceneTex], ['soft', softA.tex], ['bloomA', bloomA.tex], ['bloomB', bloomB.tex]], (u) => {
                gl.uniform2f(u.size, sw, sh);
                gl.uniform4fv(u.lights, lightData); gl.uniform3fv(u.lightCol, colData); gl.uniform1i(u.lightCount, lights.length);
                for (const k of ['exposure', 'contrast', 'saturation', 'ambient', 'bloom', 'vignette', 'dof']) gl.uniform1f(u[k], g[k]);
                gl.uniform3fv(u.shadows, g.shadows); gl.uniform3fv(u.highlights, g.highlights);
                gl.uniform1f(u.fade, frame.fade || 0);
            });
        }
        return { render, gl };
    }

    /** '#rrggbb' or 'rgba(r, g, b, a)' -> [r, g, b] in 0..1 (light colours in map data use either). */
    function parseColour(c) {
        if (Array.isArray(c)) return c;
        const s = String(c || '');
        let m = s.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        if (m) return [1, 2, 3].map((i) => parseInt(m[i], 16) / 255);
        m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
        if (m) return [1, 2, 3].map((i) => Number(m[i]) / 255);
        return [1, 0.8, 0.55];
    }

    // ---------------------------------------------------------------------
    // ENSO.gfx: the world view the front end uses. 'high' = WebGL HD-2D pipeline, 'low' = plain canvas
    // (weak phones, or no WebGL). The choice is per browser ('enso.gfx') and applies on the next load,
    // because a canvas can't switch from WebGL back to 2D.
    // ---------------------------------------------------------------------
    const QUALITY_KEY = 'enso.gfx';
    const quality = () => { try { return global.localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high'; } catch (e) { return 'high'; } };
    function setQuality(q) { try { global.localStorage.setItem(QUALITY_KEY, q === 'low' ? 'low' : 'high'); } catch (e) { /* private mode */ } return quality(); }

    /** The visible canvas plus a renderer: { draw(view, objects, time), resize(w, h), addHook, tile, hd } */
    function createView(canvas, world, opts = {}) {
        const post = quality() === 'high' ? create(canvas) : null;
        const scene = post ? global.document.createElement('canvas') : canvas;
        scene.width = canvas.width; scene.height = canvas.height;
        const renderer = ENSO.worldRender.create(scene, world, { ...opts, post: !!post });
        return {
            hd: !!post, tile: renderer.tile, addHook: renderer.addHook, scene,
            resize(w, h) { if (scene.width !== w || scene.height !== h) { scene.width = w; scene.height = h; } },
            draw(view, objects, time) {
                const frame = renderer.draw(view, objects, time);
                if (post) post.render(scene, frame);
                return frame;
            }
        };
    }

    const api = { create, createView, gradeFor, parseColour, quality, setQuality, DEFAULT_GRADE, MAX_LIGHTS };
    ENSO.postfx = api;
    ENSO.gfx = { quality, setQuality, createView };
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
