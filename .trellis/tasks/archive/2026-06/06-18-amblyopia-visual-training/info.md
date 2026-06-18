# Development Plan

## Recommended MVP Stack

- Vite
- React
- TypeScript
- Vitest
- Canvas 2D for Gabor rendering
- Browser `localStorage` for first-version local session persistence

## Implementation Phases

### Phase 1: Scaffold and Core Types

- Create Vite React TypeScript app in the repository root.
- Add scripts for `dev`, `build`, `typecheck`, `lint`, and `test`.
- Define domain types for config, trials, threshold state, session state, and summaries.
- Add default `TrainingConfig`.

### Phase 2: Vision and Calibration Modules

- Implement Canvas Gabor renderer from explicit parameters.
- Implement plain gray control patch renderer.
- Implement display calibration helper for cpd to cycles-per-pixel conversion.
- Keep renderer deterministic and free of random trial generation.

### Phase 3: Adaptive Logic

- Implement log-space contrast grid.
- Implement ZEST posterior initialization and update.
- Implement posterior mean and standard deviation.
- Implement next contrast and weighted spatial-frequency selection.
- Add unit tests for posterior behavior and clamping.

### Phase 4: Trial and Session State Machine

- Implement `TrialGenerator`.
- Implement answer scoring for both task types.
- Implement validity checks for reaction time, timeout, render failure, practice trials, and cancelled trials.
- Implement reducer/state machine for ready, practice, training, feedback, and complete.
- Add unit tests for trial parameter freezing and invalid-trial exclusion.

### Phase 5: Web UI

- Build setup screen with instructions and eye selector.
- Build training screen with stable stimulus display and answer controls.
- Build feedback state with short visual response.
- Build result view with metrics and frequency tables/charts.
- Use restrained clinical/product UI, not a marketing landing page.

### Phase 6: Local Persistence and Verification

- Implement versioned session persistence in `localStorage`.
- Save complete trial and threshold data.
- Verify reload/read path.
- Run lint, type-check, tests, and local browser smoke test.

## Key Risks

- Browser display calibration is approximate. Keep calibration isolated and expose assumptions.
- Gabor rendering performance can degrade if images are regenerated every render. Generate per frozen trial and memoize by trial ID/parameters.
- Adaptive posterior math can silently drift if arrays are not normalized after each update. Unit tests should assert normalization.
- Trial data integrity depends on generating random values only inside `TrialGenerator`.

## Suggested First Deliverable

A complete local Web prototype that runs one full 5-practice + 60-formal session, stores the result locally, and displays threshold/sensitivity by the five default spatial frequencies.

