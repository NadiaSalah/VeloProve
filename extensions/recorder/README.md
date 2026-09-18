# VeloProve Scenario Recorder (Chrome Extension)

Load unpacked Manifest V3 extension for capturing user journeys as JSON for the VeloProve Dashboard / `record-scenario` synthesizer.

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder (`extensions/recorder`)
4. Open the target site, interact, click the extension icon → **Dump & Copy JSON**
5. Paste into `veloprove ui` → **Scenario Recorder** → Generate Playwright Spec

The bookmarklet (`ScenarioRecorderService.generateBookmarklet`) remains the zero-install fallback. Capture logic is shared with `src/application/recorder-probe.ts`.
