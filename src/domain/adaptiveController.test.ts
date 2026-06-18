import { describe, expect, it } from 'vitest';
import {
  initializeThresholdState,
  nextContrastForState,
  normalizeDistribution,
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
    const state = initializeThresholdState('orientation-discrimination', 12);
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
});

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
