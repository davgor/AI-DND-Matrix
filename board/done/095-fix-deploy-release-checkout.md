# 095 — Fix deploy release job missing git checkout

Deploy packaging succeeds and lists artifacts, then `gh release create --generate-notes` fails with:

`failed to run git: fatal: not a git repository (or any of the parent directories): .git`

The `release` job downloads artifacts and runs verify/`gh release create` without checking out the repo, so there is no `.git` (and no `scripts/` for the verify step either).

## Acceptance criteria

- [x] `.github/workflows/deploy.yml` `release` job checks out the release SHA before verify / `gh release create`
- [x] Checkout is deep enough (or otherwise configured) so `--generate-notes` can resolve prior release context
- [x] Automated test asserts the release job includes checkout before `gh release create`
- [x] `npm test`, `npm run lint`, `npm run build`, and `npm run deadcode` pass
