# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

The project uses TypeScript, ESLint, Vitest, and Vite production builds as the baseline quality gate.

---

## Forbidden Patterns

- No `console.log`, `debugger`, or debug-only UI in committed code.
- No `any` for domain contracts. Add or refine exported types in `src/domain/types.ts`.
- No random trial parameter generation in React render/effect code.
- No direct `localStorage` use in components. Use `ResultStore`.
- No direct `crypto.randomUUID()` calls in app logic. Use `createRandomId()` so LAN HTTP access has a fallback.

---

## Required Patterns

- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before finishing implementation.
- Keep algorithms in pure TypeScript modules where practical.
- Put shared constants in `src/domain/config.ts`.
- Use `src/domain/id.ts` for session/trial IDs.

---

## Testing Requirements

Add or update unit tests for:

- ZEST posterior normalization and threshold estimate changes.
- ZEST psychometric probability in log-contrast space and simulated user convergence across low, mid, and high known thresholds.
- Assessment/retest posterior updates versus frozen training trials.
- Training contrast allocation around threshold: easy/core/challenge.
- Trial generation and frozen random parameters.
- Trial scoring and invalid-trial exclusion.
- Render-failed trials are persisted as invalid and do not update valid posterior counts.
- Display calibration converts a physical reference measurement into screen PPI and uses that PPI for pixels-per-degree.
- Storage adapters and payload round trips.
- Browser API fallbacks that affect startup or trial creation.

---

## Code Review Checklist

- [ ] Trial parameters are generated once in `trialGenerator.ts`.
- [ ] Practice and invalid trials do not update posterior distributions.
- [ ] Training-purpose trials do not update posterior distributions.
- [ ] Every `(taskType, spatialFrequency)` has an independent `ThresholdState`.
- [ ] Result displays threshold/sensitivity by spatial frequency, not only accuracy.
- [ ] Session/trial ID generation works without `crypto.randomUUID()`.
- [ ] Quality commands pass.

## Common Mistakes

### Common Mistake: Calling `crypto.randomUUID()` Directly

**Symptom**: The app can render the setup screen, then turns blank after clicking Start Training.

**Cause**: `crypto.randomUUID()` is only reliable in secure browser contexts. `http://localhost` usually works, but `http://<LAN-IP>` may not expose it.

**Fix**: Use `createRandomId()` from `src/domain/id.ts`, which falls back to `crypto.getRandomValues()` and then a timestamp/random suffix.

**Prevention**: Add a unit test that injects a crypto-like object without `randomUUID`.
