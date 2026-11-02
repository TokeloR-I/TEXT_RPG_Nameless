# Necromancer live kit (rework for live combat)

**Thorne (mechanics) and Gauge (numbers), from Tokelo's direction, 1 Nov 2026.** Implemented by Wren in the same PR.
Live combat is the seamless, in-world action fight (`combatMode: 'action'`). Turn mode keeps working, with durations in turns.

## Why

A live audit (1 Nov 2026) found that several Necromancer skills were built for turn-based fights and fall flat in live ones:

- **Grave Bolt** scaled with corpses. A corpse is a fight-wide counter, and a boss fight like the Crow Warden has none, so the bolt never got its bonus.
- **Channel the Grave** was a turn valve that no class ever learned: +1 Soul Energy for 2 true damage. True damage is damage that skips DEF and every reduction.
- **Shield of the Dead** cost 2 Soul Energy and did nothing without minions.
- **Raise Ghoul** was a second, stronger skeleton with no role of its own.
- **March of Endless Bones** took all your Soul Energy once per fight to bring back minions that had died.

## The new kit

| Skill | What it does now | Cost / cooldown |
|---|---|---|
| **Grave Bolt** | 10–14 magic, **+2 for each minion you have raised** (skeletons, ghoul, champion). Corpses no longer count. | 1 SE · 4 s |
| **Channel the Grave** (now a starter skill) | Calls **2 different random ghosts for 20 s**. Each ghost gives one buff (table below). Recasting dismisses them and calls 2 new ones. It works out of a fight as a pre-buff and carries into the next fight. | 2 SE · 30 s |
| **Bone Cage** (replaces Shield of the Dead at Ossified Champion, level 5) | Bone spikes burst at the aimed spot (radius 40, range 140): **8–12 physical** damage to every enemy inside, which is then **held (90% slower) for 3 s**. Needs no minions. | 2 SE · 12 s |
| **Raise Ghoul** | A ghoul rises beside you and **takes every hit meant for you for 10 s** (it stores up to 60 damage and never loses HP). Then it **runs at the nearest enemy and bursts**: 10 + **50%** of the stored damage at once to everyone within 40 px, ignoring DEF, plus the other **50% as Grave Bleed** over 6 s. If it fills up early, it charges early. If it can't reach anyone within 4 s, it bursts on the first enemy anyway. It only works in a fight and does not follow you out of one. | 3 SE · 25 s |
| **March of Endless Bones** (Black Pharaoh, level 14) | Raises **skeletons up to your minion limit**, plus one **Skeleton Champion** (double a skeleton: 30 HP, 10 ATK, 2 DEF, Cleave 10–14, a bigger body). The champion doesn't count toward the limit, and you can have only one. It is no longer once per fight. | 6 SE · 45 s |

### Channel the Grave's ghosts

| Ghost | Buff (20 s) |
|---|---|
| Wrath Ghost | +25% damage on your attacks and skills |
| Siphon Ghost | +1 Soul Energy each pulse (every 2 s; once per round in turn mode) |
| Swift Ghost | Haste 25%: skill cooldowns *and* your weapon swing run 25% faster |
| Venom Ghost | Every hit you land applies Poison (2 per tick, 3 s), **up to 2 stacks**; after that a hit only refreshes it |
| Rend Ghost | Every hit you land applies Bleed (2 per tick, 3 s), **up to 2 stacks**; after that a hit only refreshes it |

The ghosts are statuses on you (`ghost: true`), shown as wisps that circle you. Each ghost's duration is set in
`realtimeRules.statuses.buffs`, and the pool is set on the skill's `channel_ghosts` effect, so Gauge can tune both in data.

### Stack caps (Tokelo, 2 Nov 2026: "nerf Necro to add stack caps")

The first benchmark run against the Crow Warden (level 3, 20 seeds, `qa/scripts/necro_warden.js`) found that the Venom and
Rend ghosts made the Bone Warden kill the Warden in **24.5 s** (the target is 60 to 90 s). Live DoTs stack to 99 and tick faster
per stack, and each hit added a stack, so the Warden had 10 or more stacks within about 6 s. Without those two ghosts, the fight took 74 s.

The ghosts' on-hit DoTs now stack only to `dotStackCap` (2, on each pool entry). A capped source only refreshes after that. It
never strips stacks that another source added. The cap is per source (`stackCap` on `applyStatus` / `applyDot` / `infect`),
so Grave Bleed, Black Spit, Contagion and Plague of Ages are untouched.

| Level 3 vs Crow Warden (20 seeds) | Before #209 | After #209 | With caps |
|---|---|---|---|
| Bone Warden | 84 s, 100% | 24.5 s, 100% | **68.4 s, 95%** (the one miss is a 240 s timeout, not a death) |

## Why Bone Cage (the research for the Shield of the Dead swap)

Tokelo asked the team to research good replacements. Necromancers in action RPGs share a small set of non-summon bone
skills. One is a bone **armor** that absorbs damage ([Diablo II Bone Armor](https://diablo2.wiki.fextralife.com/Bone+Armor),
[ESO Bone Armor](https://app.uesp.net/wiki/Online:Bone_Armor)). Others are bone **walls and prisons** that block or trap
enemies ([Bone Prison](https://diablo2.wiki.fextralife.com/Bone+Prison), [Bone Wall](https://diablo.fandom.com/wiki/Bone_Wall)).
The rest are bone **projectiles** ([Bone Spear guide](https://maxroll.gg/d4/build-guides/bone-spear-necromancer-guide)).

The Bone Warden already has an absorb (Bone Wall) and minion-based damage reduction (Bone Armor). What it lacked was
control that works alone and in a boss fight. A prison that holds a group in place lets the Bone Warden kite while its
skeletons work. That makes it the best fit. Our version is original: a ground burst that damages and holds, using the
existing slow pipeline at 90%, so Control Resistance needs no special case.

Shield of the Dead stays in the data so old saves still work. It now refuses (and costs nothing) when you have no minions.

## Open (for Tokelo or Gauge)

- All numbers are first-pass picks: the ghost strengths, the ghoul's 60 capacity and its 10-damage burst floor, and the March cost and cooldown.
- The Ossified Champion, Death Knight and Spirit Lash passives are still unimplemented (from the audit). Possession still does nothing in live fights.
- The Plaguecaller branch is being reworked separately (Tokelo, 1 Nov 2026).
