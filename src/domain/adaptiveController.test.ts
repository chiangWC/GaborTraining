import { describe, expect, it } from 'vitest';
import {
  initializeThresholdState,
  nextContrastForState,
  normalizeDistribution,
  psychometricCorrectProbability,
  updateThresholdState,
} from './adaptiveController';
import { DEFAULT_TRAINING_CONFIG } from './config';
import type { Trial } from './types';

describe('adaptiveController', () => {
  it('normalizes posterior distributions', () => {
    const normalized = normalizeDistribution([2, 3, 5]);
    expect(normalized.reduce((total, value) => total + value, 0)).toBeCloseTo(1);
    expect(normalized).toEqual([0.2, 0.3, 0.5]);
  });

  it('updates posterior after a valid response', () => {
    const state = initializeThresholdState('contrast-detection', 4);
    const trial = makeTrial({ contrast: 0.3, isCorrect: true });
    const updated = updateThresholdState(state, trial);

    expect(updated.validTrialCount).toBe(1);
    expect(updated.posteriorDistribution.reduce((total, value) => total + value, 0)).toBeCloseTo(1);
    expect(updated.currentThresholdEstimate).not.toBe(state.currentThresholdEstimate);
  });

  it('clamps next contrast within configured bounds', () => {
    const state = initializeThresholdState('orientation-discrimination', 8);
    const contrast = nextContrastForState(
      {
        ...state,
        currentThresholdEstimate: 2,
        recentResponses: [false, false],
      },
      DEFAULT_TRAINING_CONFIG,
    );

    expect(contrast).toBe(DEFAULT_TRAINING_CONFIG.maxContrast);
  });

  it('uses log contrast ratios in the psychometric function', () => {
    const lowPair = psychometricCorrectProbability(0.1, 0.05);
    const highPair = psychometricCorrectProbability(0.4, 0.2);

    expect(lowPair).toBeCloseTo(highPair);
  });

  it.each([
    { trueThreshold: 0.04, seed: 17, minEstimate: 0.025, maxEstimate: 0.075 },
    { trueThreshold: 0.12, seed: 42, minEstimate: 0.08, maxEstimate: 0.17 },
    { trueThreshold: 0.2, seed: 71, minEstimate: 0.13, maxEstimate: 0.3 },
    { trueThreshold: 0.45, seed: 109, minEstimate: 0.28, maxEstimate: 0.68 },
  ])(
    'converges near a simulated user threshold of $trueThreshold',
    ({ trueThreshold, seed, minEstimate, maxEstimate }) => {
      const state = simulateUserThreshold(trueThreshold, seed);

      expect(state.currentThresholdEstimate).toBeGreaterThan(minEstimate);
      expect(state.currentThresholdEstimate).toBeLessThan(maxEstimate);
    },
  );
});

function simulateUserThreshold(trueThreshold: number, seed: number) {
  const rng = seededRandom(seed);
  let state = initializeThresholdState('contrast-detection', 4);

  for (let index = 0; index < 120; index += 1) {
    const contrast = nextContrastForState(state);
    const pCorrect = psychometricCorrectProbability(contrast, trueThreshold);
    const trial = makeTrial({
      trialIndex: index + 1,
      contrast,
      isCorrect: rng() < pCorrect,
      answeredAt: new Date(400 + index).toISOString(),
    });
    state = updateThresholdState(state, trial);
  }

  return state;
}

function makeTrial(overrides: Partial<Trial>): Trial {
  return {
    trialId: 'trial-1',
    sessionId: 'session-1',
    trialIndex: 1,
    purpose: 'assessment',
    isPracticeTrial: false,
    taskType: 'contrast-detection',
    trainingEye: 'left',
    spatialFrequency: 4,
    contrast: 0.3,
    phase: 0,
    orientation: 0,
    targetPosition: 'left',
    correctAnswer: 'left',
    userAnswer: 'left',
    isCorrect: true,
    reactionTimeMs: 400,
    isValidTrial: true,
    invalidReason: null,
    createdAt: new Date(0).toISOString(),
    answeredAt: new Date(400).toISOString(),
    ...overrides,
  };
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}
