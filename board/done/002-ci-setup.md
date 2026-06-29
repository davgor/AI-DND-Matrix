# EPIC: Set up CI (GitHub Actions)

Broken down into sub-tickets 002.1-002.5. This epic is done when all of them are.

002.1 PR check: tests · 002.2 PR check: lint · 002.3 PR check: build · 002.4 required-checks doc · 002.5 disabled deploy workflow

## Sub-tickets

### 002.1 CI: PR check runs unit tests

#### Description
Add the unit-test job to the PR-check GitHub Actions workflow.

#### Acceptance Criteria
- [x] `.github/workflows/pr-checks.yml` exists with a job that runs `npm test` on every PR targeting `main`
- [x] Intentionally breaking a test and opening a PR shows the job failing; reverting shows it passing

### 002.2 CI: PR check runs oxlint

#### Description
Add the lint job to the PR-check workflow.

#### Acceptance Criteria
- [x] The PR-checks workflow runs `npm run lint` on every PR targeting `main`
- [x] Intentionally introducing a lint violation and opening a PR shows the job failing; reverting shows it passing

### 002.3 CI: PR check runs a full build

#### Description
Add the build job to the PR-check workflow.

#### Acceptance Criteria
- [x] The PR-checks workflow runs a full `npm run build` (or equivalent) on every PR targeting `main`
- [x] Intentionally breaking the build and opening a PR shows the job failing; reverting shows it passing

### 002.4 CI: document required status checks

#### Description
Document that the PR-checks workflow's three jobs (test/lint/build) are intended as required status checks, since branch protection itself may need to be configured outside of code.

#### Acceptance Criteria
- [x] README or a CONTRIBUTING note explains the three required jobs and that branch protection should mark them required
- [x] The workflow job names are clearly labeled (e.g. `test`, `lint`, `build`) so they're identifiable when configuring branch protection

### 002.5 CI: scaffold disabled deploy-on-merge workflow

#### Description
Add a deploy workflow that would build and package a release `.exe` on merge to `main`, but keep it disabled by default until explicitly promoted later.

#### Acceptance Criteria
- [x] `.github/workflows/deploy.yml` exists, triggers on merge to `main`, and runs `npm run package`
- [x] The workflow is disabled by default (e.g. `workflow_dispatch` only, or a guarded `if:` condition that evaluates false)
- [x] A comment in the workflow file explains how to flip it on later
