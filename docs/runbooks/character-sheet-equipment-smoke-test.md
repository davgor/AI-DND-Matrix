# Character sheet & equipment smoke test

Manual verification for epic 044 overlay, inventory, commerce, and log book curation.

## Prerequisites

- `npm run dev` with a campaign that has a player character and some gold.
- Character has items in backpack from loot or seed catalog.

## Character sheet overlay

1. Enter play mode and expand the player sheet rail.
2. Click **Gear** or **Open character sheet** — a full overlay modal opens (not inline scroll in the rail).
3. Confirm portrait area, name, class/level, HP, AC, and currency chip are visible.
4. Dismiss via **×**, backdrop click, and **Escape**; reopen and confirm campaign state is unchanged.

## Inventory & equip

1. From the overlay, click **Inventory**.
2. Equip **Handaxe** to `mainHand` and **Shortsword** to `offHand` (slot picker if prompted).
3. Equip **Ring of Warding** to `ring1` — AC in overlay should increase by 1.
4. Equip **Wooden Shield** with a 1H sword in main hand — AC shows shield contribution in breakdown.
5. Try equipping **Greataxe** — off-hand should clear.
6. Drop an item with confirmation — quantity decreases or row removes.
7. Use a healing potion — HP increases.

## Commerce

1. Narrate buying an item from a shop (DM grants `itemPurchases` in narration JSON during dev testing, or use a scripted turn).
2. Confirm currency chip updates after the turn.
3. With 0 gold, attempt a purchase — insufficient funds message appears in play UI alerts.

## Log book

1. Open **Log Book** from overlay.
2. Search and filter by category chips.
3. Complete a turn that adds a log entry — entry appears without closing modal (refresh token).
4. Enable **Curate**, edit an entry title, delete another — changes persist on reopen.

## Equipment panel

1. In overlay, confirm all slots (`armor`, `mainHand`, `offHand`, accessories) show equipped or empty.
2. Click empty slot **Equip…** — inventory opens filtered for that slot.
3. AC breakdown lines: base, agility, armor, shield, accessories, total.
