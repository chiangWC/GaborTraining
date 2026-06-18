import { DEFAULT_TRAINING_CONFIG } from './config';
import { clamp, sum, weightedChoice } from './math';
import type { TaskType, ThresholdState, TrainingConfig, Trial } from './types';

export function thresholdStateKey(taskType: TaskType, spatialFrequency: number): string {
  return `${taskType}:${spatialFrequency}`;
}

export function createLogThresholdGrid(min: number, max: number, size: number): number[] {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  const steps = Math.max(size - 1, 1);

  return Array.from({ length: size }, (_, index) => {
    const t = index / steps;
    return Math.exp(minLog + (maxLog - minLog) * t);
  });
}

export function initializeThresholdState(
  taskType: TaskType,
  spatialFrequency: number,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): ThresholdState {
  const thresholdGrid = createLogThresholdGrid(
    config.minContrast,
    config.maxContrast,
    config.adaptive.gridSize,
  );
  const posteriorDistribution = Array.from(
    { length: thresholdGrid.length },
    () => 1 / thresholdGrid.length,
  );

  return {
    taskType,
    spatialFrequency,
    thresholdGrid,
    posteriorDistribution,
    currentThresholdEstimate: posteriorMean(thresholdGrid, posteriorDistribution),
    thresholdUncertainty: posteriorStdDev(thresholdGrid, posteriorDistribution),
    trialCount: 0,
    validTrialCount: 0,
    recentResponses: [],
    lastContrast: null,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function initializeThresholdStates(
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): ThresholdState[] {
  return config.taskTypes.flatMap((taskType) =>
    config.spatialFrequencies.map((frequency) =>
      initializeThresholdState(taskType, frequency, config),
    ),
  );
}

export function psychometricCorrectProbability(
  contrast: number,
  threshold: number,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): number {
  const { guessRate, lapseRate, slope } = config.adaptive;
  const safeContrast = Math.max(contrast, config.minContrast);
  const safeThreshold = Math.max(threshold, config.minContrast);
  const x = (Math.log(safeContrast) - Math.log(safeThreshold)) / slope;
  const sigmoid = 1 / (1 + Math.exp(-x));
  return guessRate + (1 - guessRate - lapseRate) * sigmoid;
}

export function posteriorMean(grid: number[], posterior: number[]): number {
  return grid.reduce((total, threshold, index) => total + threshold * (posterior[index] ?? 0), 0);
}

export function posteriorStdDev(grid: number[], posterior: number[]): number {
  const estimate = posteriorMean(grid, posterior);
  const variance = grid.reduce((total, threshold, index) => {
    const probability = posterior[index] ?? 0;
    const delta = threshold - estimate;
    return total + probability * delta * delta;
  }, 0);
  return Math.sqrt(Math.max(0, variance));
}

export function normalizeDistribution(values: number[]): number[] {
  const total = sum(values);
  if (!Number.isFinite(total) || total <= 0) {
    return Array.from({ length: values.length }, () => 1 / values.length);
  }
  return values.map((value) => value / total);
}

export function updateThresholdState(
  state: ThresholdState,
  trial: Trial,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): ThresholdState {
  const wasCorrect = trial.isCorrect === true;
  const likelihoods = state.thresholdGrid.map((threshold) => {
    const pCorrect = psychometricCorrectProbability(trial.contrast, threshold, config);
    return wasCorrect ? pCorrect : 1 - pCorrect;
  });
  const posteriorDistribution = normalizeDistribution(
    state.posteriorDistribution.map((prior, index) => prior * (likelihoods[index] ?? 0)),
  );
  const currentThresholdEstimate = posteriorMean(state.thresholdGrid, posteriorDistribution);
  const thresholdUncertainty = posteriorStdDev(state.thresholdGrid, posteriorDistribution);

  return {
    ...state,
    posteriorDistribution,
    currentThresholdEstimate,
    thresholdUncertainty,
    trialCount: state.trialCount + 1,
    validTrialCount: state.validTrialCount + 1,
    recentResponses: [...state.recentResponses, wasCorrect].slice(-8),
    lastContrast: trial.contrast,
    lastUpdatedAt: trial.answeredAt ?? new Date().toISOString(),
  };
}

export function recordInvalidThresholdExposure(state: ThresholdState, trial: Trial): ThresholdState {
  return {
    ...state,
    trialCount: state.trialCount + 1,
    lastContrast: trial.contrast,
    lastUpdatedAt: trial.answeredAt ?? new Date().toISOString(),
  };
}

export function nextContrastForState(
  state: ThresholdState,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): number {
  const recent = state.recentResponses;
  const recentMistakes = recent.slice(-2).filter((value) => !value).length;
  const recentCorrect = recent.slice(-3).filter(Boolean).length;
  let estimate = state.currentThresholdEstimate;

  if (recentMistakes >= 2) {
    estimate *= 1.25;
  } else if (recentCorrect >= 3) {
    estimate *= 0.92;
  }

  if (state.validTrialCount < 2 && state.thresholdUncertainty > 0.18) {
    estimate = Math.max(estimate, 0.25);
  }

  return clamp(estimate, config.minContrast, config.maxContrast);
}

export function selectSpatialFrequency(
  states: ThresholdState[],
  _config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
  rng: () => number = Math.random,
): ThresholdState {
  const maxUncertainty = Math.max(...states.map((state) => state.thresholdUncertainty), 0.01);
  const maxTrialCount = Math.max(...states.map((state) => state.trialCount), 0);

  return weightedChoice(
    states,
    (state) => {
      const uncertaintyWeight = state.thresholdUncertainty / maxUncertainty;
      const recent = state.recentResponses.slice(-5);
      const recentAccuracy =
        recent.length === 0 ? 0.5 : recent.filter(Boolean).length / recent.length;
      const difficultyWeight = 1 - recentAccuracy;
      const coverageWeight = (maxTrialCount - state.trialCount + 1) / (maxTrialCount + 1);
      return 0.55 * uncertaintyWeight + 0.3 * difficultyWeight + 0.15 * coverageWeight;
    },
    rng,
  );
}

export function replaceThresholdState(
  states: ThresholdState[],
  replacement: ThresholdState,
): ThresholdState[] {
  return states.map((state) =>
    thresholdStateKey(state.taskType, state.spatialFrequency) ===
    thresholdStateKey(replacement.taskType, replacement.spatialFrequency)
      ? replacement
      : state,
  );
}

export function cloneThresholdStates(states: ThresholdState[]): ThresholdState[] {
  return states.map((state) => ({
    ...state,
    thresholdGrid: [...state.thresholdGrid],
    posteriorDistribution: [...state.posteriorDistribution],
    recentResponses: [...state.recentResponses],
  }));
}
