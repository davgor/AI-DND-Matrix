# EPIC: Campaign start modal + generation loading flow

Replace the current one-click campaign start action with a modal form where the player configures a new campaign, then show a dedicated loading experience while provider/API generation and persistence requests are running.

Broken down into sub-tickets 017.1-017.10. This epic is done when all of them are.

017.1 replace new-campaign click behavior with modal entry · 017.2 campaign setup modal form fields + schema · 017.3 modal validation + defaults + accessibility · 017.4 create-campaign request contract (renderer/main IPC) · 017.5 generation loading screen/modal state machine · 017.6 loading progress/stage messaging for API + persistence steps · 017.7 failure, cancel, retry, and back-to-form behavior · 017.8 success handoff to review/edit onboarding screen · 017.9 duplicate-submit and idempotency protection · 017.10 campaign-start smoke test (dev + packaged)

## Sub-tickets

### 017.1 Replace "new campaign" click behavior with modal entry

#### Description
Change the main/side entry action so selecting "new campaign" opens a campaign-setup modal instead of immediately running generation.

#### Acceptance Criteria
- [x] Activating "new campaign" opens modal with no generation request sent yet
- [x] Modal can be dismissed cleanly and returns user to prior screen state
- [x] Existing campaign list/session state is unchanged until explicit submit
- [x] UI test verifies entry, dismiss, and re-open behavior

### 017.2 Campaign setup modal form fields + schema

#### Description
Implement the campaign setup form that captures required new-campaign configuration before generation.

#### Acceptance Criteria
- [x] Modal form includes required inputs for campaign setup (at minimum premise prompt and any existing required campaign metadata)
- [x] Form model is typed with explicit request schema shared with main/IPC contract
- [x] Optional advanced fields are supported if present in existing flow (for example death mode or generation options)
- [x] Form-to-request mapping is covered by tests

### 017.3 Modal validation + defaults + accessibility

#### Description
Add robust form validation, sensible defaults, and keyboard/accessibility behavior for campaign setup modal.

#### Acceptance Criteria
- [x] Required fields validate before submit and show actionable inline errors
- [x] Defaults are applied for optional fields and visible to user
- [x] Enter/Escape and tab order behavior is correct and accessible
- [x] Validation and accessibility behavior are covered by UI tests

### 017.4 Create-campaign request contract (renderer/main IPC)

#### Description
Define and implement the request/response IPC contract used when modal submit triggers campaign generation and persistence.

#### Acceptance Criteria
- [x] Renderer sends typed create-campaign payload to main process through preload-safe IPC
- [x] Main process validates payload shape before invoking generation flow
- [x] Response contract supports both success and typed failure categories
- [x] Unit tests verify contract compatibility and validation behavior

### 017.5 Generation loading screen/modal state machine

#### Description
Introduce a loading state after form submit that remains active while campaign generation and DB persistence requests are running.

#### Acceptance Criteria
- [x] Submit transitions modal flow into loading state immediately
- [x] Loading state blocks duplicate interactive submit actions until terminal state
- [x] Loading state ends only on explicit success or failure outcome
- [x] State-machine transitions are unit tested

### 017.6 Loading progress/stage messaging for API + persistence steps

#### Description
Show meaningful loading status while generation API/provider call and persistence steps complete.

#### Acceptance Criteria
- [x] Loading UI displays stage/status text tied to real processing steps (for example request, parse, persist)
- [x] Progress/status updates are deterministic and do not regress unexpectedly
- [x] Messaging remains user-friendly while technical details stay in logs
- [x] UI tests verify stage messaging across success and failure paths

### 017.7 Failure, cancel, retry, and back-to-form behavior

#### Description
Handle failures and user cancellation gracefully, allowing retries or form edits without app restart.

#### Acceptance Criteria
- [x] Failed generation/persistence shows clear actionable error in modal flow
- [x] User can return to form with previous inputs preserved
- [x] User can retry from loading/error state without creating duplicate partial campaign data
- [x] Canceling flow does not create partial campaign records

### 017.8 Success handoff to review/edit onboarding screen

#### Description
After successful generation and persistence, route to the existing campaign review/edit onboarding step.

#### Acceptance Criteria
- [x] Success flow transitions from loading to existing review/edit screen (ticket 009.7 flow)
- [x] Newly generated campaign data is present and editable in handoff destination
- [x] Sidebar/main campaign selection reflects the created campaign
- [x] Integration test verifies end-to-end handoff path

### 017.9 Duplicate-submit and idempotency protection

#### Description
Prevent accidental duplicate campaigns from repeated submit clicks or retried network responses.

#### Acceptance Criteria
- [x] Client-side submit lock prevents repeated in-flight submissions
- [x] Main process flow guards against duplicate create requests for same in-flight session
- [x] Malformed/failing attempts do not leave partial campaign rows
- [x] Tests verify one successful campaign is persisted per successful submit action

### 017.10 Campaign-start smoke test (dev + packaged)

#### Description
Validate the new campaign modal + loading flow end-to-end in development and packaged app environments.

#### Acceptance Criteria
- [x] Dev-mode smoke verifies: open modal, fill form, submit, see loading states, complete handoff to review/edit
- [x] Dev-mode expected-failure smoke verifies actionable error + retry/back-to-form behavior
- [x] Packaged-mode smoke verifies the same primary success path
- [x] Smoke runbook documents setup, steps, and outcomes
