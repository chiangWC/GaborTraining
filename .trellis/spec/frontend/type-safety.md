# Type Safety

> Type safety patterns in this project.

---

## Overview

Use strict TypeScript for all frontend code. Domain contracts live in `src/domain/types.ts` and should be imported across layers instead of redefined.

---

## Type Organization

- Put cross-module training types in `src/domain/types.ts`.
- Keep component-only prop types next to the component.
- Use string literal unions for controlled vocabularies such as `TaskType`, `TrainingEye`, and `TrialInvalidReason`.

---

## Validation

The MVP does not use a runtime validation library. Validate browser storage payload shape inside storage adapters before returning data to React.

---

## Common Patterns

Use explicit interfaces for persisted or cross-layer payloads:

```typescript
export interface TrainingSession {
  sessionId: string;
  trainingEye: TrainingEye;
  trials: Trial[];
  thresholdStates: ThresholdState[];
  summary: SessionSummary | null;
}
```

---

## Forbidden Patterns

- Do not use `any` for trials, sessions, or threshold state.
- Avoid type assertions around storage reads except at the JSON parse boundary.
- Do not duplicate persisted payload shapes in components.
