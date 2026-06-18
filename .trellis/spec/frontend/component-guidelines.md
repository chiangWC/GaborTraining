# Component Guidelines

> How components are built in this project.

---

## Overview

React components should be thin views over domain state. They can render screens, dispatch reducer actions, and call storage adapters at lifecycle boundaries, but they should not contain training algorithms.

---

## Component Structure

- Keep screen-level composition in `App.tsx` until a screen grows large enough to justify extraction.
- Put reusable stimulus or control widgets under `src/components/`.
- Derive display-only values with `useMemo` when computation depends on stable domain objects.

---

## Props Conventions

Props should reference domain types rather than recreating local shape aliases.

```typescript
function GaborStimulus({ trial, config }: { trial: Trial; config: TrainingConfig }) {
  // render frozen trial parameters
}
```

---

## Styling Patterns

Use plain CSS in `src/styles.css` for the current app. Keep fixed-format controls stable with explicit grid tracks, min heights, and responsive constraints.

---

## Accessibility

- Icon-only buttons need `aria-label`.
- Stimulus regions should have descriptive `aria-label` values.
- Answer controls must be native buttons so keyboard activation works.
- Keyboard shortcuts must be mirrored by visible native buttons. For training answers, left/right arrow keys map to the same typed answers as the left/right buttons.

---

## Common Mistakes

Do not generate trial random values in render paths or effects. Random phase, orientation, target position, contrast, task type, and spatial frequency belong in `trialGenerator.ts`.

Feedback after an answer should be shown inline on the training screen. Do not replace the entire training UI with a separate correct/incorrect page.
