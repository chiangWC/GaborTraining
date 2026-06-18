# Blink Eye Exercise Reference

## Source

- Repository: https://github.com/D4G4/blink
- README states that Blink includes Gabor patch exercises for Contrast Detection, Orientation, and Flanker Masking, all using adaptive difficulty.
- Local read-only clone used for code inspection: `/tmp/blink-reference`

## Relevant Files Inspected

- `/tmp/blink-reference/blink-macos/Blink/GaborExercise/GaborRenderer.swift`
- `/tmp/blink-reference/blink-macos/Blink/GaborExercise/GaborDisplayConfig.swift`
- `/tmp/blink-reference/blink-macos/Blink/GaborExercise/GaborExerciseState.swift`
- `/tmp/blink-reference/blink-macos/Blink/GaborExercise/AdaptiveStaircase.swift`
- `/tmp/blink-reference/blink-macos/Blink/GaborExercise/GaborSessionStore.swift`

## Reusable Ideas

- Render Gabor patches from explicit parameters: contrast, cycles-per-pixel spatial frequency, orientation, phase, and Gaussian sigma.
- Separate display calibration from rendering. Blink converts cycles per degree to cycles per pixel from viewing distance and screen characteristics.
- Use a clear session state machine with ready/instructions/presenting/feedback/complete phases.
- Keep contrast detection as two circular regions where exactly one contains the Gabor patch.
- Keep orientation discrimination as a center patch tilted left or right by a fixed angle.
- Persist completed session records locally.

## Intentional Differences for This Project

- Do not use Blink's 2-down-1-up staircase as the main adaptive algorithm. The supplied design requires simplified QUEST/ZEST with independent posterior distributions per task type and spatial frequency.
- Do not include Flanker Masking in MVP. The supplied design only requires Contrast Detection and Orientation Discrimination.
- Do not keep a single global contrast threshold. This project needs separate threshold state for each `(taskType, spatialFrequency)` pair.
- Do not let UI render paths generate random trial parameters. Random phase, target position, orientation, frequency, and contrast must be generated once by `TrialGenerator` and stored on the `Trial`.

## Web Mapping

- Implement `GaborRenderer` with a Canvas-backed generator that returns an `ImageData`, data URL, or canvas draw command from frozen trial parameters.
- Implement `DisplayCalibrator` in TypeScript using browser fallbacks. Physical screen size is not reliable on the Web, so MVP should use `devicePixelRatio`, a default PPI estimate, user-provided viewing distance, and a conservative patch size.
- Use `localStorage` for MVP persistence because this is a browser app with modest trial/session payloads. Keep the storage adapter isolated so it can move to IndexedDB later.
- Use React state/reducer or a small store to keep the training state machine explicit and testable.

## Recommended Stack

- Vite + React + TypeScript for a lightweight single-page training prototype.
- Vitest for algorithm and generator unit tests.
- Playwright or manual browser verification for the rendered interaction once the app is scaffolded.

