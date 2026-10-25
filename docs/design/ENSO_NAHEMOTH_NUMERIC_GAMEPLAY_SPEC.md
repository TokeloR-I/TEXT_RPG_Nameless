# Nahemoth — Numeric Gameplay Specification N-01
**Vaelis · 24 October 2026 · First playable balance candidates (not yet Tally verified)**
**Companion design:** [ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md](ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md)
**Authority:** Creative Director wants the first Nahemoth aspect to be a talking crow with useful noncombat powers, especially revisiting known places. Values below are **concrete test defaults**, not existing game implementation or final balance approval. Tally tests; Director can accept or revise. Wren/Rook may implement these as reviewable candidate data following AGENTS.md.

## Numeric ability table
| ID | Ability | Unlock point | Range / scope | Cost | Cooldown / limits |
|---|---|---|---|---|---|
| NAH-01 | **Black Flight** | On first seal opening after Warden | Any attuned visited safe anchor on an accessible map; Homestead auto-attuned; no world-distance cap | 0 Gold, 0 class resource | 0 turns / unlimited out-of-combat uses. Disabled in combat, pursuit, active dialogue, boss scene or unsafe transition |
| NAH-02 | **Whispers Beneath Stone** | On first seal opening (or initial crow discussion) | Detect authored hidden lore clues within **6 walkable tiles** of player | 0 | **1 clue scan per location visit**; clues found stay found. Re-entering does not regenerate one-time rewards |
| NAH-03 | **The Unseen Crossing** | Later exploration milestone (not needed for Chapter One) | **Up to 8 tiles** between a named pair of authored shadow crossing endpoints | 0 | **0 cooldown** at allowed crossings; requires unlocked endpoint/quest permissions; never bypass mandatory story gates |
| NAH-04 | **Claim of the Hollow Earth** | Homestead builder encounter after first seal | Reveal **1** first buried construction plot within the base (later up to **3** additional plots only via separate milestones) | 0 | **Once per plot**; reveals plans, not free construction or Gold |
| NAH-05 | **Witness in the Feather** | Talking crow available after first seal | Show up to **3** topical prompts: active objective, known local interest, incomplete named business | 0 | **Unlimited**, no auto-quest credit and no spoilers for undiscovered maps |
| NAH-06 | **Borrowed Perch** | First approved crow lookout, later exploration | Reveal authored points of interest within **12 map tiles** of the perch | 0 | **Once per perch discovery** for map reveals; can repeat view; seeing an area never attunes its travel anchor |

## Baseline constraints and exact definitions
- **Tile distance:** Manhattan distance (`abs(dx)+abs(dy)`) for NAH-02 detection and NAH-06 surveying unless a map designer declares a different metric in reviewed data. NAH-03 limit is authored crossing length, **not** arbitrary pass-through-walls movement.
- **Visit:** an entry to a named location/map; leaving and returning can refresh NAH-02 scan ability but cannot recreate claimed clues/loot. If design proves unlimited revisits noisy, Tally may propose one scan per unique location as an alternative.
- **Safe anchors:** no minimum travel distance, no charge, no fee, no random failure. Discovery is by explicit attunement interaction after physically reaching a landmark, not sighting it from a distance. Homestead is automatically available upon first seal opening.
- **No map teleport escape exploit:** deny during active combat, enemy pursuit/chase, conversation, cinematic/forced event, current map transition, death, locked story transition, or while player would arrive inside collision/hostile spawn.
- **Crow guidance:** NAH-05's 3 entries are menu *categories*, not only 3 total conversations. Crow speaks in bounded area-aware lines; companion need not occupy a combat/minion slot or be visible in overworld movement.
- **First boss reward:** preserve current Warden 200 XP and unique First Echo key. First seal opening gives 1 crow, 1 Nahemoth unlock and first memory fragment; not 10 separate buff effects. A **single guaranteed post-boss Gold cache** finances first gate repair (earlier economy *candidate*: 70 Gold cache / 60 Gold gate); actual cost must match current economy configuration; no repeat claim on save/reentry.
- **No blanket combat-stat multiplier**, extra DEF, HP regeneration, or class-wide damage bonuses included in these six powers. If the Director wants passive stats later, specify an independently measured numeric option.

## Acceptance test matrix
1. **NAH-01**: player attunes 2 known anchors, teleports 10 consecutive times, pays 0 Gold/resource and sees no cooldown; anchors remain after reload. Unknown third anchor unavailable. Homestead always listed.
2. **NAH-01 refusals**: combat/pursuit/dialogue/transition/unsafe-arrival all refuse without changing current map, Gold, inventory or action state. Text UI and graphical UI agree.
3. **NAH-02**: a hidden clue within Manhattan 6 appears; at distance 7 does not. Re-enter may permit rescan but cannot pay clue reward twice.
4. **NAH-03**: authored shadow passage 8 tiles works; 9 does not. A storyline-locked passage always refuses even when geometry is otherwise valid.
5. **NAH-04**: exactly one initial plot becomes inspectable; no free construction, no duplicate reveal or currency on repeat conversation.
6. **NAH-05**: menu shows at most three topic categories; hints update with real quest/known map state but never mark objectives complete.
7. **NAH-06**: within 12 Manhattan tiles author-listed landmarks shown, 13 not; survey never registers unvisited fast-travel anchors.
8. **Progression**: Warden birds remain ordinary and mourning; shadow crow joins only once after seal. First memory does not disclose protagonist identity. Orin appears at homestead in logical sequence and proper repair stays achievable.
9. **Tally comparative checks**: qualitative travel usability (10 return trips), quest bypass risk, Gold inflation/duplication, interaction edge cases; numerical ranges can be adjusted only with an explicit follow-up decision.

## Studio implementation responsibility
- **Vaelis:** narrative power identity, crow dialogue, geography and lore consequences; numeric default specification.
- **Rook / Keel:** shared engine action, persisted anchors and scan/perch flags, validated map arrival, no loopholes for combat escape.
- **Wren:** map landmark data, crow unlock event, authored clue/crossing/perch regions, story hooks.
- **Current UI owner (Sable/Pixie):** accessible destination and contextual-crow menus, clear range/lock messaging, reduced-motion transition.
- **Tally:** approve/test or recommend a documented numeric revision before the team describes any values as balanced.
