# Directory Structure

> How frontend code is organized in this project.

---

## Overview

This project is a Vite + React + TypeScript single-page application. Keep domain logic, vision rendering, storage, and React components separated so trial generation and threshold updates remain testable outside the UI.

---

## Directory Layout

```
src/
├── App.tsx
├── main.tsx
├── styles.css
├── components/
│   └── <React-only UI components>
├── domain/
│   ├── types.ts
│   ├── config.ts
│   ├── adaptiveController.ts
│   ├── trialGenerator.ts
│   ├── sessionReducer.ts
│   └── sessionSummary.ts
├── storage/
│   └── <browser persistence adapters>
├── test/
│   └── <test setup>
└── vision/
    └── <display calibration and Gabor rendering>
```

---

## Module Organization

- `domain/` contains pure TypeScript training contracts and algorithms. It must not import React or browser rendering APIs.
- `vision/` contains Canvas/display math. It can use DOM canvas types, but it must not decide random trial values or mutate session state.
- `storage/` contains persistence adapters. Components should call adapters with full domain objects instead of constructing storage payloads inline.
- `components/` contains React display and interaction code. Components submit typed actions or answers; they do not update ZEST posterior distributions directly.

---

## Naming Conventions

- Use lower camelCase filenames for non-component modules, such as `adaptiveController.ts`.
- Use PascalCase filenames for React components, such as `GaborStimulus.tsx`.
- Co-locate unit tests next to the module under test with `*.test.ts`.

---

## Examples

- `src/domain/trialGenerator.ts` freezes trial random values once.
- `src/domain/adaptiveController.ts` owns ZEST posterior update logic.
- `src/components/GaborStimulus.tsx` renders a frozen trial through Canvas without generating random values.
