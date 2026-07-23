# 162 — Gear options stuck on "Loading gear options..."

During guided character creation, the equipment / starting-gear screen never leaves the loading state (`Loading gear options...`). Race and background selection load normally; only the gear step hangs.

Likely cause: `useLoadoutOffer` puts a freshly allocated `setters` object in the fetch `useEffect` dependency list, so every successful state update re-triggers the fetch and sets `loading` back to `true`.

## Acceptance criteria

- [ ] Equipment selection finishes loading and shows gear choices after a successful `startingLoadout.getOffer` (hook test: `getOffer` called once, `loading` becomes false)
- [ ] Fetch effect depends only on stable inputs (e.g. `characterId`), not a per-render setters object
- [ ] Full delivery gate: `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, plus `act` pr-checks + deadcode
