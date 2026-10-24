# Production Art 001 — Vesper (WIP)

**Scope:** Ashbound Wanderer, first 24×32 pixel character pass.  
**Issue:** #136  
**Status:** exploratory sprite-production WIP — NOT approved, NOT integrated, NOT a 48×64 redesign.

The WIP raster package was produced as a separately downloadable archive in Vesper's art conversation. The available GitHub integration can write UTF-8 text files but cannot directly read and upload the local binary PNG, ORA, or ZIP package. **Therefore binary sprite assets are not part of this PR**, and no engineer should describe it as a complete asset import.

## Existing WIP package inventory
- 52 transparent 24×32 layer PNGs
- 7 PNG layer atlases
- 4 editable OpenRaster files
- Four facings: down/up/left/right
- Stand, stepA and stepB poses
- Body, rear hair, front hair, outfit layers
- Two hairstyles and two outfits
- PNG embedded prototype registration, preview and generator source

## Next integration step
Upload the binary outputs from ENSO_Production_Art_001_Vesper_WIP.zip to this branch, preserving the package directory structure. The local zip is not hosted by GitHub yet. Then Wren must review the sheet registrations and run `npm test`, `npm run world` and the world preview.

## Visual caution
The current artwork is visibly simpler than the Director's detailed target. The Director has proposed a higher-detail 48×64 redrawing as a separate future art iteration, not implemented here.

## Approval gates
Morrigan fidelity: pending; Wren compatibility: pending; Pixie creator parity: pending; Tally playtest: pending; Creative Director final quality: pending.
