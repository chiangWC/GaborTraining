# State Management

> How state is managed in this project.

---

## Overview

Use a reducer-driven state machine for active training sessions. Keep adaptive threshold state in the domain session object, and persist only completed sessions through a storage adapter.

---

## State Categories

- UI preference state: local React state, such as selected training eye before starting.
- Task mode state: local React state before session start; once started, copy it into `TrainingConfig.taskTypes` as a single selected task.
- Training workflow state: `SessionMachine` managed by `sessionReducer`.
- Derived display state: computed from `TrainingSession`, `Trial`, or `SessionSummary`.
- Persisted state: completed `TrainingSession` records saved by `LocalStorageResultStore`.

---

## When to Use Global State

Do not add a global state library for the current app. The active session is local to `App.tsx` and passed into components through props. Reconsider only when multiple independent routes need to mutate the same active session.

---

## Server State

There is no backend in the MVP. Treat browser `localStorage` as local persistence, not server state.

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
- `TrainingSession` must include `sessionId`, `trainingEye`, `startedAt`, `endedAt`, `config`, `trials`, `thresholdStates`, `assessmentThresholdByFrequency`, and `summary`.
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
- Keep `feedback` as a short state-machine phase, but render it with the same training screen so the stimulus context remains visible.
- Session phases are `assessment -> training -> retest`. Assessment and retest update ZEST posterior; training freezes the assessment thresholds and records performance only.
- Use `TrialPurpose` to distinguish assessment, training-easy, training-core, training-challenge, and retest trials.
