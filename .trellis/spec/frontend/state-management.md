# State Management

> How state is managed in this project.

---

## Overview

Use a reducer-driven state machine for active training sessions. Keep adaptive threshold state in the domain session object, and persist only completed sessions through a storage adapter.

---

## State Categories

- UI preference state: local React state, such as selected training eye before starting.
- Task mode state: local React state before session start; once started, copy it into `TrainingConfig.taskTypes` as a single selected task.
- Display calibration state: local React state before session start; once started, copy `screenPpi` and `viewingDistanceCm` into `TrainingConfig`.
- Training workflow state: `SessionMachine` managed by `sessionReducer`.
- Derived display state: computed from `TrainingSession`, `Trial`, or `SessionSummary`.
- Persisted state: completed `TrainingSession` records saved by `LocalStorageResultStore`.

---

## When to Use Global State

Do not add a global state library for the current app. The active session is local to `App.tsx` and passed into components through props. Reconsider only when multiple independent routes need to mutate the same active session.

---

## Server State

There is no backend in the MVP. Treat browser `localStorage` as local persistence, not server state.

## Scenario: Display Calibration Config Flow

### 1. Scope / Trigger

- Trigger: Setup UI collects physical display calibration values that affect Gabor rendering in later session phases.
- This is a cross-layer boundary because local React calibration state is copied into `TrainingConfig`, persisted in `TrainingSession`, and consumed by `createDisplayCalibration()`.

### 2. Signatures

```typescript
interface TrainingConfig {
  viewingDistanceCm: number;
  screenPpi: number;
}

function calculateScreenPpi(input: {
  referenceCssPixels: number;
  referenceWidthCm: number;
  devicePixelRatio?: number;
}): number;
```

### 3. Contracts

- `referenceCssPixels` is the exact CSS pixel width of the on-screen calibration bar.
- `referenceWidthCm` is the real physical width selected by the user, such as `8.56` for a bank card or `10` for a 10 cm ruler.
- `screenPpi` is physical device pixels per inch and must include `devicePixelRatio`.
- `viewingDistanceCm` and `screenPpi` are copied into the session config at `start` and remain fixed for the session.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| Non-positive reference width, CSS pixels, or device pixel ratio | Fall back to `DEFAULT_SCREEN_PPI` |
| User enters out-of-range setup values | Clamp in setup UI before creating the session |
| Device pixel ratio is unavailable | Use `1` |

### 5. Good/Base/Bad Cases

- Good: User matches a bank card bar and the session stores derived `screenPpi`.
- Base: User accepts default setup values and the session stores `DEFAULT_SCREEN_PPI`.
- Bad: Renderer reads a module-level hard-coded PPI instead of the session config.

### 6. Tests Required

- Assert `calculateScreenPpi()` converts CSS pixels, physical centimeters, and device pixel ratio into PPI.
- Assert `createDisplayCalibration()` uses `TrainingConfig.screenPpi` for pixels-per-degree and cycles-per-pixel.

### 7. Wrong vs Correct

#### Wrong

```typescript
const pixelsPerCm = 110 / 2.54;
```

#### Correct

```typescript
const pixelsPerCm = config.screenPpi / 2.54;
```

## Scenario: Render Failure Trial Recording

### 1. Scope / Trigger

- Trigger: Canvas rendering can fail if `getContext('2d')` returns `null`; this must become a recorded invalid trial, not an unobserved component failure.
- This is a component-to-domain boundary because `GaborStimulus` reports the failure and `sessionReducer` owns trial mutation.

### 2. Signatures

```typescript
function GaborStimulus(props: {
  trial: Trial;
  config: TrainingConfig;
  onRenderFailed: (trialId: string) => void;
}): JSX.Element;

type SessionAction = { type: 'renderFailed'; trialId: string };
```

### 3. Contracts

- `renderGaborToCanvas()` and `renderPlainGrayToCanvas()` return `false` when rendering cannot complete.
- `GaborStimulus` calls `onRenderFailed(trial.trialId)` once per failed trial ID.
- `sessionReducer` ignores stale render failures where the action trial ID does not match the current trial or the current trial is already answered.
- A render failure stores `invalidReason = "render-failed"`, `isValidTrial = false`, `isCorrect = false`, and `answeredAt`.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| Active trial render fails | Record invalid trial and enter inline feedback |
| Stale trial ID arrives | Return current state unchanged |
| Trial was already answered | Return current state unchanged |

### 5. Good/Base/Bad Cases

- Good: Failed canvas render is persisted in `session.trials` and excluded from valid posterior updates.
- Base: Successful canvas render does not dispatch any reducer action.
- Bad: Component silently drops a render failure or mutates trial state directly.

### 6. Tests Required

- Reducer test for `renderFailed` action saving an invalid trial with `render-failed`.
- Assert the matching threshold state's `trialCount` increments but `validTrialCount` does not.

### 7. Wrong vs Correct

#### Wrong

```typescript
renderGaborToCanvas(canvas, params);
```

#### Correct

```typescript
if (!renderGaborToCanvas(canvas, params)) {
  onRenderFailed(trial.trialId);
}
```

## Scenario: Local Training Session Persistence

### 1. Scope / Trigger

- Trigger: Completed training sessions are stored locally in the browser.
- This is an infra/storage boundary because domain objects cross from React state into browser storage and back.

### 2. Signatures

```typescript
interface ResultStore {
  save(session: TrainingSession): void;
  loadAll(): TrainingSession[];
  clear(): void;
}
```

### 3. Contracts

- Storage key: `gabor-training.sessions.v1`.
- Stored payload: `{ version: 1, sessions: TrainingSession[] }`.
- `TrainingSession` must include `sessionId`, `trainingEye`, `startedAt`, `endedAt`, `config`, `trials`, `thresholdStates`, `assessmentThresholdStates`, `retestThresholdStates`, and `summary`.
- Dates are serialized as ISO strings.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| Missing key | Return an empty session list |
| Invalid JSON | Return an empty session list |
| Unsupported version | Return an empty session list |
| Duplicate `sessionId` on save | Replace previous record |

### 5. Good/Base/Bad Cases

- Good: Completed session with summary saves and reloads with all trials and threshold states intact.
- Base: Empty storage returns `[]`.
- Bad: Corrupt storage does not throw into React render.

### 6. Tests Required

- Assert `save()` then `loadAll()` returns the same session ID.
- Assert corrupt or unsupported payloads fall back to `[]` when covered by future tests.
- Assert duplicate session IDs are replaced when editing persistence behavior.

### 7. Wrong vs Correct

#### Wrong

```typescript
localStorage.setItem('sessions', JSON.stringify(summary));
```

#### Correct

```typescript
store.save(completedTrainingSession);
```

---

## Common Mistakes

- Do not store only summary data. Full trial data and threshold states are required for later trend/debug views.
- Do not update threshold state from React components. Submit an answer action and let `sessionReducer` call the domain update functions.
- Do not mark render failures inside components only. `GaborStimulus` reports `onRenderFailed(trialId)` and `sessionReducer` records the invalid trial.
- Keep `feedback` as a short state-machine phase, but render it with the same training screen so the stimulus context remains visible.
- Session phases are `assessment -> training -> retest`. Assessment and retest update separate ZEST posterior states; training freezes the assessment thresholds and records performance only.
- Use `TrialPurpose` to distinguish assessment, training-easy, training-core, training-challenge, and retest trials.
