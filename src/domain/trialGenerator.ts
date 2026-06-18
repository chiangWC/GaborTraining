import {
  initializeThresholdStates,
  nextContrastForState,
  selectSpatialFrequency,
  thresholdStateKey,
} from './adaptiveController';
import { DEFAULT_TRAINING_CONFIG } from './config';
import { createRandomId } from './id';
import { clamp, weightedChoice } from './math';
import type {
  OrientationAnswer,
  TargetPosition,
  TaskType,
  ThresholdState,
  TrainingConfig,
  TrainingEye,
  TrainingSession,
  Trial,
  TrialPurpose,
} from './types';

export function createSession(
  trainingEye: TrainingEye,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): TrainingSession {
  const now = new Date().toISOString();
  return {
    sessionId: createRandomId('session'),
    trainingEye,
    startedAt: now,
    endedAt: null,
    config,
    trials: [],
    thresholdStates: initializeThresholdStates(config),
    assessmentThresholdStates: null,
    retestThresholdStates: null,
    summary: null,
  };
}

export function generateTrial(
  session: TrainingSession,
  purpose: TrialPurpose,
  rng: () => number = Math.random,
): Trial {
  const config = session.config;
  const taskType = chooseTaskType(session, config, rng);
  const thresholdState = chooseThresholdState(session, taskType, purpose, config, rng);
  const contrast = contrastForPurpose(thresholdState, purpose, config, rng);
  const phase = rng() * Math.PI * 2;
  const targetPosition = taskType === 'contrast-detection' ? chooseTargetPosition(rng) : null;
  const orientation =
    taskType === 'orientation-discrimination'
      ? chooseOrientation(config.orientationAngleDegree, rng)
      : 0;

  return {
    trialId: createRandomId('trial'),
    sessionId: session.sessionId,
    trialIndex: session.trials.length + 1,
    purpose,
    isPracticeTrial: false,
    taskType,
    trainingEye: session.trainingEye,
    spatialFrequency: thresholdState.spatialFrequency,
    contrast,
    phase,
    orientation,
    targetPosition,
    correctAnswer: correctAnswerFor(taskType, targetPosition, orientation),
    userAnswer: null,
    isCorrect: null,
    reactionTimeMs: null,
    isValidTrial: false,
    invalidReason: null,
    createdAt: new Date().toISOString(),
    answeredAt: null,
  };
}

export function scoreTrial(
  trial: Trial,
  userAnswer: Trial['correctAnswer'],
  answeredAt: Date,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
): Trial {
  const reactionTimeMs = answeredAt.getTime() - new Date(trial.createdAt).getTime();
  const isCorrect = userAnswer === trial.correctAnswer;
  const invalidReason =
    reactionTimeMs < config.minReactionTimeMs
      ? 'too-fast'
      : reactionTimeMs > config.timeoutMs
        ? 'timeout'
        : null;

  return {
    ...trial,
    userAnswer,
    isCorrect,
    reactionTimeMs,
    isValidTrial: invalidReason === null,
    invalidReason,
    answeredAt: answeredAt.toISOString(),
  };
}

export function timeoutTrial(trial: Trial): Trial {
  return {
    ...trial,
    userAnswer: null,
    isCorrect: false,
    reactionTimeMs: null,
    isValidTrial: false,
    invalidReason: 'timeout',
    answeredAt: new Date().toISOString(),
  };
}

export function cancelledTrial(trial: Trial): Trial {
  return {
    ...trial,
    isValidTrial: false,
    invalidReason: 'cancelled',
    answeredAt: new Date().toISOString(),
  };
}

function chooseTaskType(
  session: TrainingSession,
  config: TrainingConfig,
  rng: () => number,
): TaskType {
  const completedFormalCounts = new Map<TaskType, number>(
    config.taskTypes.map((taskType) => [taskType, 0]),
  );

  for (const trial of session.trials) {
    if (!trial.isPracticeTrial) {
      completedFormalCounts.set(
        trial.taskType,
        (completedFormalCounts.get(trial.taskType) ?? 0) + 1,
      );
    }
  }

  const maxCount = Math.max(...completedFormalCounts.values(), 0);
  return weightedChoice(
    config.taskTypes,
    (taskType) => maxCount - (completedFormalCounts.get(taskType) ?? 0) + 1,
    rng,
  );
}

function chooseThresholdState(
  session: TrainingSession,
  taskType: TaskType,
  purpose: TrialPurpose,
  config: TrainingConfig,
  rng: () => number,
): ThresholdState {
  const sourceStates = thresholdStatesForPurpose(session, purpose);
  const taskStates = sourceStates.filter((state) => state.taskType === taskType);
  if (taskStates.length === 0) {
    throw new Error(`Missing threshold states for ${taskType}`);
  }

  if (isTrainingPurpose(purpose)) {
    const maxTrainingCount = Math.max(
      ...taskStates.map((state) => countTrainingTrials(session, taskType, state.spatialFrequency)),
      0,
    );
    const maxThreshold = Math.max(...taskStates.map((state) => state.currentThresholdEstimate), 0.01);

    return weightedChoice(
      taskStates,
      (state) => {
        const coverageWeight =
          maxTrainingCount - countTrainingTrials(session, taskType, state.spatialFrequency) + 1;
        const difficultyWeight = state.currentThresholdEstimate / maxThreshold;
        return 0.7 * coverageWeight + 0.3 * difficultyWeight;
      },
      rng,
    );
  }

  return selectSpatialFrequency(taskStates, config, rng);
}

export function thresholdStatesForPurpose(
  session: TrainingSession,
  purpose: TrialPurpose,
): ThresholdState[] {
  if (purpose === 'retest') {
    return session.retestThresholdStates ?? session.assessmentThresholdStates ?? session.thresholdStates;
  }

  if (isTrainingPurpose(purpose)) {
    return session.assessmentThresholdStates ?? session.thresholdStates;
  }

  return session.thresholdStates;
}

export function chooseTrainingPurpose(rng: () => number = Math.random): TrialPurpose {
  const roll = rng();
  if (roll < 0.2) return 'training-easy';
  if (roll < 0.8) return 'training-core';
  return 'training-challenge';
}

export function isTrainingPurpose(purpose: TrialPurpose): boolean {
  return (
    purpose === 'training-easy' ||
    purpose === 'training-core' ||
    purpose === 'training-challenge'
  );
}

function contrastForPurpose(
  state: ThresholdState,
  purpose: TrialPurpose,
  config: TrainingConfig,
  rng: () => number,
): number {
  if (purpose === 'assessment' || purpose === 'retest') {
    return nextContrastForState(state, config);
  }

  const threshold = state.currentThresholdEstimate;
  const [minFactor, maxFactor] =
    purpose === 'training-easy'
      ? [1.3, 1.6]
      : purpose === 'training-core'
        ? [0.9, 1.2]
        : [0.75, 0.9];
  const factor = minFactor + (maxFactor - minFactor) * rng();

  return clamp(threshold * factor, config.minContrast, config.maxContrast);
}

function countTrainingTrials(
  session: TrainingSession,
  taskType: TaskType,
  spatialFrequency: number,
): number {
  return session.trials.filter(
    (trial) =>
      isTrainingPurpose(trial.purpose) &&
      trial.taskType === taskType &&
      trial.spatialFrequency === spatialFrequency,
  ).length;
}

function chooseTargetPosition(rng: () => number): TargetPosition {
  return rng() < 0.5 ? 'left' : 'right';
}

function chooseOrientation(angleDegree: number, rng: () => number): number {
  const direction = rng() < 0.5 ? 1 : -1;
  return direction * angleDegree * (Math.PI / 180);
}

function correctAnswerFor(
  taskType: TaskType,
  targetPosition: TargetPosition | null,
  orientation: number,
): TargetPosition | OrientationAnswer {
  if (taskType === 'contrast-detection') {
    if (targetPosition === null) {
      throw new Error('Contrast detection trial requires a target position');
    }
    return targetPosition;
  }

  return orientation > 0 ? 'tilted-left' : 'tilted-right';
}

export function findThresholdStateForTrial(
  states: ThresholdState[],
  trial: Trial,
): ThresholdState {
  const key = thresholdStateKey(trial.taskType, trial.spatialFrequency);
  const state = states.find(
    (candidate) => thresholdStateKey(candidate.taskType, candidate.spatialFrequency) === key,
  );
  if (!state) {
    throw new Error(`Missing threshold state for trial ${trial.trialId}`);
  }
  return state;
}
