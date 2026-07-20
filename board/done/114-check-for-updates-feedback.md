# 114 — Check for updates feedback

Settings → “Check for updates” currently gives no visible confirmation: the existing update banner sits under the Settings overlay (`z-index`), and “no update” resets to idle with no message. Manual checks should confirm they started, then report no update or that an update was found.

## Acceptance criteria

- [x] Clicking “Check for updates” immediately shows a visible status (e.g. “Checking for updates…”) inside Settings
- [x] When the check finishes with no newer version, status reports that no update was found
- [x] When a newer version is found, status reports that an update was found (version when known)
- [x] Disabled / busy / error outcomes show a clear status instead of a silent no-op
- [x] Unit tests cover result formatting and the button status flow; `npm test` / lint / build / deadcode / act CI pass
