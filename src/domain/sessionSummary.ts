import { mean, roundTo } from './math';
import type { SessionSummary, ThresholdByTaskAndFrequency, ThresholdState, TrainingConfig, TrainingSession } from './types';

export function summarizeSession(session: TrainingSession): SessionSummary {
  const validFormalTrials = session.trials.filter((trial) => trial.isValidTrial);
  const correctTrials = validFormalTrials.filter((trial) => trial.isCorrect);
  const reactionTimes = validFormalTrials.flatMap((trial) =>
    trial.reactionTimeMs === null ? [] : [trial.reactionTimeMs],
  );
  const durationSeconds = Math.round(
    ((session.endedAt ? new Date(session.endedAt).getTime() : Date.now()) -
      new Date(session.startedAt).getTime()) /
      1000,
  );

  const retestStates = session.retestThresholdStates ?? session.thresholdStates;
  const assessmentStates = session.assessmentThresholdStates ?? session.thresholdStates;
  const thresholdByTaskAndFrequency = thresholdsByTaskAndFrequency(retestStates);
  const assessmentThresholdByTaskAndFrequency = thresholdsByTaskAndFrequency(assessmentStates);
  const sensitivityByTaskAndFrequency = computeSensitivityByTaskAndFrequency(
    thresholdByTaskAndFrequency,
    session.config,
  );
  const thresholdChangeByTaskAndFrequency = computeThresholdChangeByTaskAndFrequency(
    assessmentThresholdByTaskAndFrequency,
    thresholdByTaskAndFrequency,
    session.config,
  );

  return {
    totalTrials: session.trials.length,
    validTrials: validFormalTrials.length,
    invalidTrialCount: session.trials.filter((trial) => !trial.isValidTrial).length,
    accuracy:
      validFormalTrials.length === 0
        ? 0
        : roundTo(correctTrials.length / validFormalTrials.length, 3),
    durationSeconds,
    thresholdByTaskAndFrequency,
    sensitivityByTaskAndFrequency,
    assessmentThresholdByTaskAndFrequency,
    thresholdChangeByTaskAndFrequency,
    meanReactionTimeMs: Math.round(mean(reactionTimes)),
  };
}

export function thresholdsByTaskAndFrequency(
  states: ThresholdState[],
): ThresholdByTaskAndFrequency {
  const result = emptyThresholdByTaskAndFrequency();

  for (const state of states) {
    result[state.taskType][String(state.spatialFrequency)] = roundTo(
      state.currentThresholdEstimate,
      4,
    );
  }

  return result;
}

function computeSensitivityByTaskAndFrequency(
  thresholds: ThresholdByTaskAndFrequency,
  config: TrainingConfig,
): ThresholdByTaskAndFrequency {
  const result = emptyThresholdByTaskAndFrequency();

  for (const taskType of config.taskTypes) {
    for (const frequency of Object.keys(thresholds[taskType] ?? {})) {
      const threshold = thresholds[taskType][frequency];
      if (threshold !== undefined) {
        result[taskType][frequency] = roundTo(1 / threshold, 2);
      }
    }
  }

  return result;
}

function computeThresholdChangeByTaskAndFrequency(
  assessment: ThresholdByTaskAndFrequency,
  retest: ThresholdByTaskAndFrequency,
  config: TrainingConfig,
): ThresholdByTaskAndFrequency {
  const result = emptyThresholdByTaskAndFrequency();

  for (const taskType of config.taskTypes) {
    for (const frequency of Object.keys(retest[taskType] ?? {})) {
      const assessmentThreshold = assessment[taskType][frequency];
      const retestThreshold = retest[taskType][frequency];
      if (assessmentThreshold !== undefined && retestThreshold !== undefined) {
        result[taskType][frequency] = roundTo(retestThreshold - assessmentThreshold, 4);
      }
    }
  }

  return result;
}

function emptyThresholdByTaskAndFrequency(): ThresholdByTaskAndFrequency {
  return {
    'contrast-detection': {},
    'orientation-discrimination': {},
  };
}
