# Amblyopia Visual Training Web App

## Goal

Build a first-version Web prototype for amblyopia-oriented visual perceptual training. The app should present parameterized Gabor patch trials, collect two-choice responses, adapt contrast with a simplified QUEST/ZEST controller, store complete session/trial data locally, and show multi-spatial-frequency threshold and sensitivity results.

The app is a training and trend-observation tool only. It must not present medical diagnosis, treatment promises, or professional medical guidance.

## What I Already Know

- The current repository has no application scaffold yet. It only contains Trellis metadata and `AGENTS.md`.
- The supplied design specifies the core loop: choose training eye, present Gabor stimulus, answer, update QUEST/ZEST threshold estimate, generate next difficulty, save trial data, and display threshold changes by spatial frequency.
- MVP task types are Contrast Detection and Orientation Discrimination.
- Default spatial frequencies are `1`, `2`, `4`, `8`, and `12` cpd.
- Each `(taskType, spatialFrequency)` needs an independent `ThresholdState`.
- Sessions use three segments: quick threshold assessment, threshold-focused training, and short retest.
- Assessment and retest trials update separate threshold posterior states when valid, so post-test evidence does not overwrite the assessment baseline.
- Training trials freeze the assessment threshold and sample around it for training performance only.
- Two-choice tasks need `guessRate = 0.5`.
- Trial random values must be generated once and frozen on the trial object.
- Blink's eye exercise reference confirms useful interaction patterns for Gabor rendering, two-choice tasks, state phases, and local session persistence, but its 2-down-1-up staircase should be replaced by ZEST here.

## Requirements

- Provide an Eye Training first screen with safety/training instructions and a training-eye selector for left or right eye.
- Include a quick assessment phase that estimates current thresholds for each spatial frequency.
- Include a threshold-focused training phase that freezes assessment thresholds and samples contrast around those thresholds.
- Include a short retest phase that updates a separate posterior to estimate short-term threshold change against the frozen assessment baseline.
- Training contrast allocation:
  - 20% easy trials: `threshold * 1.3` to `threshold * 1.6`.
  - 60% core trials: `threshold * 0.9` to `threshold * 1.2`.
  - 20% challenge trials: `threshold * 0.75` to `threshold * 0.9`.
- Let the user choose one task type before the session starts. Contrast Detection and Orientation Discrimination are trained in separate sessions.
  - Contrast Detection: show left/right circular regions; one contains a Gabor patch and the other is plain gray.
  - Orientation Discrimination: show one center Gabor patch tilted left or right by `15` degrees.
- Support answer input through both on-screen buttons and keyboard left/right arrow keys.
- After each answer, show a brief correct/incorrect prompt within the same training screen, then automatically advance. Do not switch to a separate feedback page.
- Maintain independent threshold posterior state for every task type and spatial frequency.
- Implement simplified ZEST/Bayesian adaptive staircase:
  - Use a log-space threshold grid from approximately `0.01` to `1.00`.
  - Initialize broad prior over useful contrast thresholds.
  - Use a psychometric function in log-contrast space because the threshold grid is log-spaced, with `guessRate = 0.5`, `lapseRate = 0.03`, `targetCorrectRate = 0.75`, and configurable slope.
  - Update the assessment posterior after each valid assessment response and the retest posterior after each valid retest response.
  - Use posterior mean as `currentThresholdEstimate`.
  - Calculate posterior standard deviation as `thresholdUncertainty`.
  - Choose next contrast from the threshold estimate, clamped by `minContrast` and `maxContrast`, with simple recent-error correction.
- Select spatial frequency with weighted sampling based on uncertainty, difficulty/recent accuracy, and coverage.
- Generate each trial with frozen parameters: `trialId`, `sessionId`, `trialIndex`, `isPracticeTrial`, `taskType`, `trainingEye`, `spatialFrequency`, `contrast`, `phase`, `orientation`, `targetPosition`, `correctAnswer`, and timestamps.
- Mark trials invalid when response time is below `150ms`, when answer times out, when render fails, or when the user exits mid-trial.
- Save complete session, trial, threshold state, and summary data locally in the browser.
- Show a result page with training eye, total trials, valid trials, invalid trials, accuracy, duration, mean reaction time, retest threshold by task type and spatial frequency, contrast sensitivity by task type and spatial frequency, and retest-minus-assessment threshold change.
- Make the result explanation emphasize trend observation and threshold/sensitivity interpretation, not medical conclusions.

## Acceptance Criteria

- [ ] User can select left or right training eye and start training.
- [ ] App displays the required safety instructions before training.
- [ ] Assessment, threshold-focused training, and retest phases all run.
- [ ] Formal training supports five spatial frequencies: `1`, `2`, `4`, `8`, and `12` cpd.
- [ ] User can choose Contrast Detection or Orientation Discrimination as separate session modes.
- [ ] Both task modes work as two-choice tasks.
- [ ] Left/right arrow keys submit the same answers as the left/right on-screen buttons.
- [ ] Correct/incorrect feedback is shown inline on the training screen without a separate feedback page.
- [ ] Each task type and spatial frequency has an independent threshold state.
- [ ] ZEST posterior updates during valid assessment/retest trials.
- [ ] Training trials use frozen assessment thresholds and do not update posterior.
- [ ] Training contrast allocation follows the 20% easy / 60% threshold-near / 20% challenge split.
- [ ] Trial parameters remain stable across React re-renders.
- [ ] Invalid trials are saved but do not update threshold estimates.
- [ ] Results include threshold and sensitivity by task type and spatial frequency, not only accuracy.
- [ ] Completed sessions are stored locally and can be read back by the app.
- [ ] Algorithm/generator modules have unit coverage for posterior update, simulated ZEST convergence, trial freezing, answer scoring, and invalid-trial exclusion.
- [ ] Project lint, type-check, and tests pass.

## Definition of Done

- Tests added for core adaptive and trial-generation logic.
- Lint, type-check, and tests pass.
- Browser app can be launched locally and the training loop can be completed end to end.
- Medical/disclaimer copy is present and does not overclaim efficacy.
- Task notes/research are updated with final implementation decisions.

## Technical Approach

Implementation is a Vite + React + TypeScript single-page app because the repository currently has no existing framework and the required product is an interactive Web prototype. Gabor stimuli render through Canvas, core adaptive logic is covered by Vitest, and first-version session persistence uses browser `localStorage`.

Proposed modules:

- `src/domain/types.ts`: `TrainingConfig`, `Trial`, `ThresholdState`, `TrainingSession`, `SessionSummary`, task/phase enums.
- `src/domain/adaptiveController.ts`: simplified ZEST initialization, posterior update, threshold estimate, uncertainty, contrast selection, and frequency weights.
- `src/domain/trialGenerator.ts`: freezes task type, frequency, contrast, phase, target, orientation, and correct answer once per trial.
- `src/domain/sessionReducer.ts`: ready/assessment/training/retest/feedback/complete state machine and response handling.
- `src/vision/gaborRenderer.ts`: Canvas-based Gabor image generation from explicit parameters only.
- `src/vision/displayCalibrator.ts`: cpd-to-cycles-per-pixel and patch sizing with Web fallbacks.
- `src/storage/resultStore.ts`: local browser persistence behind a storage adapter.
- `src/components/*`: screens for setup, assessment/training/retest trial presentation, inline feedback, and results.

## Decision (ADR-lite)

**Context**: The repo is empty and the target is a Web interactive prototype. Blink is a native desktop app, so its Swift/C# UI cannot be reused directly.

**Decision**: Scaffold a lightweight Vite React TypeScript app and port the relevant Gabor concepts into browser-friendly TypeScript modules. Use simplified ZEST instead of Blink's staircase. Use `localStorage` for MVP persistence behind a small storage adapter.

**Consequences**: This gives a fast MVP with testable domain logic. Display calibration will be approximate in a browser because physical screen dimensions are not reliably available; the implementation should expose defaults and keep calibration logic isolated for later refinement.

## Out of Scope

- Medical diagnosis, treatment claims, prescription logic, or clinician workflow.
- User accounts, cloud sync, backend API, or multi-device history.
- Flanker Masking in MVP.
- Clinical-grade display calibration or hardware luminance calibration.
- SQLite or file-system persistence for the browser MVP.
- Longitudinal trend dashboard beyond reading/saving local sessions and showing the current session result.

## Research References

- [`research/blink-eye-exercise.md`](research/blink-eye-exercise.md) - Blink eye exercise implementation patterns and differences for this project.

## Technical Notes

- Current project files inspected: `AGENTS.md`, `.trellis/spec/frontend/index.md`, `.trellis/spec/backend/index.md`, attached design document.
- Reference repo inspected: https://github.com/D4G4/blink
- Frontend and backend spec files are placeholders, so implementation should define local conventions through clean module boundaries and tests.
- Because this is a browser app, `ResultStore` should start with `localStorage` and a versioned JSON payload. IndexedDB can be a later storage adapter if payload size grows.

## Resolved Decisions

- Proceed with Vite + React + TypeScript SPA.
- Use Canvas for Gabor rendering.
- Use Vitest for domain tests.
- Use browser `localStorage` for MVP session persistence.
