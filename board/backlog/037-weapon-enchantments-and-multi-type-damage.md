# EPIC: Weapon enchantments and multi-type damage

Today each weapon has **one** `damageRoll` and **one** `damageType` on the shared catalog row (`WeaponProperties`). Player attacks use `getEquippedWeaponDamageRoll` → `resolvePlayerAttackDamage`, which returns a **single total** — `damageType` is stored but not applied, and there is no way to persist “I enchanted *my* greatsword with fire.” Editing the global `items` row would affect every owner of that catalog id.

This epic adds **per-instance weapon modifications** and **multi-component damage** so play like *“I enchanted my greatsword to do fire damage”* becomes mechanical truth: the equipped weapon might deal **1d10 physical + 1d6 fire**, each component rolled separately, resistance applied per type, crit rules documented — and the enchantment **sticks on your `character_items` row**, not the shared catalog.

Agents propose modification **intent and flavor** (add fire damage, rename, update description); the engine owns dice sizes, types, caps, and persistence. Same guardrail pattern as 024.3 / 036 perks.

Builds on **024** (items/equip), **031** (player attack resolution vs NPCs). Until 031 lands, wire the new resolver into `resolvePlayerEquippedAttackDamage` and tests so attacks automatically pick it up.

Broken down into sub-tickets 037.1–037.10. This epic is done when all of them are.

Definition of done:
- shared types document damage components, modification kinds, and per-instance overlay rules
- `character_items` (or equivalent) stores modifications without mutating global `items`
- engine resolves multi-component weapon damage with per-type `applyResistance`
- DM recognizes enchant/modify-weapon intent and returns validated modification proposals
- equipped weapon attack path uses merged base + modification components
- character sheet shows component breakdown on equipped weapon
- smoke test: enchant longsword with 1d6 fire → attack resolves physical + fire separately and persists after restart

037.1 spec + shared types · 037.2 DB schema + repositories (per-instance modifications) · 037.3 engine multi-component damage + resistance · 037.4 engine modification templates + validation caps · 037.5 DM item-modification intent + schema · 037.6 modification persist pipeline · 037.7 equipped weapon component merge + attack wiring · 037.8 character sheet weapon detail UI · 037.9 modification events + narration grounding · 037.10 end-to-end enchantment smoke test
