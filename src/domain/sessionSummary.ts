import { mean, roundTo } from './math';
import type { SessionSummary, TrainingSession } from './types';

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

  const frequencyGroups = new Map<number, number[]>();
  for (const state of session.thresholdStates) {
    const group = frequencyGroups.get(state.spatialFrequency) ?? [];
    group.push(state.currentThresholdEstimate);
    frequencyGroups.set(state.spatialFrequency, group);
  }

  const thresholdByFrequency: Record<string, number> = {};
  const sensitivityByFrequency: Record<string, number> = {};
  for (const [frequency, estimates] of frequencyGroups.entries()) {
    const threshold = roundTo(mean(estimates), 4);
    thresholdByFrequency[String(frequency)] = threshold;
    sensitivityByFrequency[String(frequency)] = roundTo(1 / threshold, 2);
  }
  const assessmentThresholdByFrequency = session.assessmentThresholdByFrequency ?? {};
  const thresholdChangeByFrequency: Record<string, number> = {};

  for (const frequency of Object.keys(thresholdByFrequency)) {
    const assessmentThreshold = assessmentThresholdByFrequency[frequency];
    if (assessmentThreshold !== undefined) {
      thresholdChangeByFrequency[frequency] = roundTo(
        thresholdByFrequency[frequency] - assessmentThreshold,
        4,
      );
    }
  }

  return {
    totalTrials: session.trials.length,
    validTrials: validFormalTrials.length,
    invalidTrialCount: session.trials.filter((trial) => !trial.isValidTrial).length,
    accuracy:
      validFormalTrials.length === 0
        ? 0
        : roundTo(correctTrials.length / validFormalTrials.length, 3),
    durationSeconds,
    thresholdByFrequency,
    sensitivityByFrequency,
    assessmentThresholdByFrequency,
    thresholdChangeByFrequency,
    meanReactionTimeMs: Math.round(mean(reactionTimes)),
  };
}
