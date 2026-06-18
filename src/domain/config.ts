import type { TrainingConfig } from './types';

export const DEFAULT_SCREEN_PPI = 110;

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  taskTypes: ['contrast-detection', 'orientation-discrimination'],
  spatialFrequencies: [1, 2, 4, 8, 12],
  assessmentTrialCount: 50,
  trainingTrialCount: 80,
  retestTrialCount: 50,
  viewingDistanceCm: 57,
  screenPpi: DEFAULT_SCREEN_PPI,
  patchSizeDegree: 4,
  orientationAngleDegree: 15,
  minContrast: 0.01,
  maxContrast: 1,
  feedbackDurationMs: 1200,
  minReactionTimeMs: 150,
  timeoutMs: 8_000,
  maxDurationMinutes: 15,
  adaptive: {
    guessRate: 0.5,
    lapseRate: 0.03,
    targetCorrectRate: 0.75,
    slope: 0.08,
    gridSize: 80,
  },
};

export const taskTypeLabel: Record<string, string> = {
  'contrast-detection': 'Contrast Detection',
  'orientation-discrimination': 'Orientation Discrimination',
};

export const taskTypeShortLabel: Record<string, string> = {
  'contrast-detection': 'Detection',
  'orientation-discrimination': 'Orientation',
};
