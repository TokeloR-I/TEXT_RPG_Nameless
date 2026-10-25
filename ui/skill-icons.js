/* Original ENSO pictograms, authored as integer-grid vector paths; no external art.
 * Decorative only: the containing button/card supplies the accessible skill name.
 * Fixed geometry/palette only enter markup, never caller-controlled strings. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.EnsoSkillIcons = api;
}(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const ink = '#10151d', bone = '#e2d4af', steel = '#aabcc4', gold = '#d2a463';
    const green = '#91c5a0', violet = '#b59cdb', red = '#dc8577', blue = '#86bed6';
    const p = (d, fill) => '<path fill="' + fill + '" d="' + d + '"/>';
    const blade = p('M9 23L22 10V5H27V10L13 24Z', steel) + p('M10 19L16 25L13 28L7 22ZM6 25L9 28L6 30L3 27Z', gold) + p('M17 14L24 7H26L19 16Z', bone);
    const skull = p('M10 6H22V8H25V18H22V24H10V18H7V8H10Z', bone) + p('M10 11H14V15H10ZM18 11H22V15H18ZM15 16H18V19H15ZM12 21H14V24H12ZM18 21H20V24H18Z', ink);
    const shield = p('M6 6H26V19L23 24L16 29L9 24L6 19Z', gold) + p('M9 9H23V19L20 23L16 26L12 23L9 19Z', steel) + p('M15 10H18V23H15Z', bone);
    const bolt = p('M5 25L9 17L6 18L14 8L12 13L22 4L28 5L27 12L18 19L21 14L11 24L14 18Z', green) + p('M15 16L23 7H26V10Z', bone);
    const gem = p('M16 3L26 13V20L16 29L6 20V13Z', violet) + p('M16 6L22 14L16 25L10 14Z', blue) + p('M16 6V23L12 14Z', bone);
    const eye = p('M3 15L9 9H23L29 15V18L23 23H9L3 18Z', violet) + p('M6 16L11 12H21L26 16L21 20H11Z', ink) + p('M14 12H19V20H14Z', bone);
    const flask = p('M12 4H21V7H19V12L26 23V28H6V23L14 12V7H12Z', steel) + p('M13 18H21L24 24V26H9V24Z', green) + p('M15 8H17V15H15Z', bone);
    const flame = p('M17 2L22 10L21 15L25 11L28 20L25 27H9L5 21L8 13L12 16L11 9Z', red) + p('M16 12L21 23L19 27H13L10 23Z', gold) + p('M16 20L18 26H14Z', bone);
    const frost = p('M14 3H18V11L24 5L27 8L21 14H29V18H21L27 24L24 27L18 21V29H14V21L8 27L5 24L11 18H3V14H11L5 8L8 5L14 11Z', blue) + p('M14 13H18V19H14Z', bone);
    const lightning = p('M17 2H26L20 12H27L11 30L15 19H7Z', gold) + p('M18 6H21L15 15H20L15 21L18 16H12Z', bone);
    const heal = p('M12 5H21V12H28V21H21V28H12V21H5V12H12Z', green) + p('M15 8H18V15H25V18H18V25H15V18H8V15H15Z', bone);
    const hand = p('M6 21V13H9V18H11V7H14V17H15V4H18V17H19V7H22V19H24V13H27V23L22 28H12Z', bone) + p('M11 22H22V25H11Z', violet);
    const horn = p('M5 16L23 6L22 12L24 19L28 23L8 21Z', gold) + p('M22 7H25V12L27 18L30 21L28 24L24 22L20 15Z', bone) + p('M10 21H14V26H10Z', red);
    const wind = p('M4 10H21V7H17V4H24V7H27V13H4ZM8 16H25V19H8ZM4 23H20V26H17V29H11V26H4Z', green);
    const clock = p('M10 3H23V6H20V10L17 15L22 21V26H25V29H8V26H11V21L16 15L11 10V6H10Z', gold) + p('M14 7H18V10L16 12L14 10ZM14 23L16 20L19 23V26H14Z', blue);
    const chain = p('M5 19V13L12 6H18L21 9V15L14 22H8ZM8 18H12L18 12V10L17 9H13L8 14Z M12 23V17L19 10H25L28 13V19L21 26H15ZM15 22H19L25 16V14L24 13H20L15 18Z', violet);
    const burst = p('M14 2H18V9L24 5L27 8L23 14H30V18H23L27 24L24 27L18 23V30H14V23L8 27L5 24L9 18H2V14H9L5 8L8 5L14 9Z', violet) + p('M12 12H20V20H12Z', bone);
    const art = {
        attack: blade, guard: shield, magic: gem, summon: skull + p('M3 27H29V30H3ZM3 21H6V25H3ZM26 21H29V25H26Z', green),
        gravebolt: bolt, necrobasicattack: p('M6 25L24 7L27 10L9 28Z', bone) + p('M18 5H25L28 8V15H24V10H18ZM4 21H9V26H4Z', green),
        soulleech: p('M4 8H10V14H4ZM22 21H28V27H22ZM8 14H12V18H8ZM12 18H20V22H12ZM19 12H23V18H19ZM15 6H20V11H15Z', violet) + p('M20 20H25V25H20ZM5 9H8V12H5Z', bone),
        channelthegrave: p('M8 28V10L12 5H20L24 10V28Z', steel) + p('M14 9H18V13H21V16H18V23H14V16H11V13H14Z', ink) + p('M3 29H29V31H3ZM3 20H6V26H3ZM27 17H30V24H27Z', green),
        slash: blade + p('M5 8H8V11H5ZM9 5H12V8H9Z', red),
        powerstrike: blade + p('M23 20H26V23H30V26H26V30H23V26H19V23H23Z', red),
        warcry: horn, backstab: p('M5 5H14V9H12V19L18 25L14 29L7 22V9H5Z', steel) + p('M20 5H27V8H25V22L22 27L20 22Z', red),
        evasion: eye + p('M3 26L26 3H29V6L6 29H3Z', steel), quickslash: blade + p('M3 12H11V14H3ZM3 17H8V19H3Z', violet),
        secondwind: wind, arcanebolt: bolt.replaceAll(green, violet), focus: gem + p('M3 4H6V7H3ZM26 25H29V28H26Z', gold),
        manaburst: burst, overchannel: hand + p('M3 4H7V9H3ZM25 3H29V9H25Z', red),
        fire: flame, ice: frost, lightning, heal, poison: flask, control: eye, time: clock,
        resource: hand, movement: wind, link: chain, void: p('M10 3H23L29 10V23L22 29H9L3 22V9Z', violet) + p('M11 7H21L25 11V21L21 25H11L7 21V11Z', ink) + p('M21 7H24V10H21ZM7 21H10V24H7Z', bone), utility: hand
    };
    const normalize = value => typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const aliases = { basicslash: 'attack', basicattack: 'attack', raiseskeleton: 'summon', guard: 'guard', gb: 'gravebolt', rs: 'summon', sl: 'soulleech', ct: 'channelthegrave' };
    function category(skillId, definition) {
        const d = definition && typeof definition === 'object' ? definition : {};
        const name = normalize(skillId) + normalize(d.name);
        const effects = Array.isArray(d.effects) ? d.effects.map(e => e && typeof e.type === 'string' ? e.type : '').join(' ') : '';
        if (/summon|resurrect/.test(effects) || /raise|bones/.test(name)) return 'summon';
        if (/heal|drain_hp/.test(effects)) return 'heal';
        if (/poison|infect|contagion|plague|spit/.test(name + effects)) return 'poison';
        if (/chain|link/.test(name + effects)) return 'link';
        if (/time|turn_order|extra_turn|revert/.test(name + effects)) return 'time';
        if (/shield|guard|wall|fortress/.test(name) || /damage_reduction|absorb|avoid|counter/.test(effects)) return 'guard';
        if (/teleport|charge|lunge|haste/.test(name + effects)) return 'movement';
        if (/stun|skip_turn|freeze_enemies|control|silence|blind|mark|taunt|immobilize|slow/.test(effects)) return 'control';
        if (/gain_resource|overchannel/.test(effects)) return 'resource';
        if (d.damage_type === 'fire') return 'fire';
        if (d.damage_type === 'ice') return 'ice';
        if (d.damage_type === 'lightning') return 'lightning';
        if (/void|unmake|oblivion|nothing|hollow/.test(name)) return 'void';
        if (d.damage_type === 'magic' || d.damage_type === 'radiant') return 'magic';
        if (d.damage_type === 'physical' || Array.isArray(d.base_damage)) return 'attack';
        return 'utility';
    }
    function resolve(skillId, definition) {
        const key = normalize(skillId);
        const short = key.replace(/^(necro|necromancer|warrior|rogue|mage)/, '');
        for (const candidate of [key, short, normalize(definition && definition.name)]) {
            if (Object.prototype.hasOwnProperty.call(aliases, candidate)) return aliases[candidate];
            if (Object.prototype.hasOwnProperty.call(art, candidate)) return candidate;
        }
        return category(skillId, definition);
    }
    function svg(skillId, definition) {
        const key = resolve(skillId, definition);
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false" shape-rendering="crispEdges" class="enso-skill-icon" data-icon="' + key + '">' + art[key] + '</svg>';
    }
    return Object.freeze({ svg, resolve, category });
}));
