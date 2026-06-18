import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TRAINING_CONFIG } from './config';
import { sessionReducer } from './sessionReducer';
import { createSession, generateTrial, scoreTrial } from './trialGenerator';

describe('trialGenerator', () => {
  it('freezes generated trial parameters', () => {
    const rng = sequence([0.1, 0.2, 0.3, 0.4]);
    const session = createSession('left');
    const trial = generateTrial(session, 'assessment', rng);

    expect(trial.trialId).toBeTruthy();
    expect(trial.sessionId).toBe(session.sessionId);
    expect(trial.phase).toBeCloseTo(0.3 * Math.PI * 2);
    expect(trial.contrast).toBeGreaterThanOrEqual(DEFAULT_TRAINING_CONFIG.minContrast);
    expect(trial.userAnswer).toBeNull();
  });

  it('marks threshold assessment trials valid when reaction time is usable', () => {
    const session = createSession('right');
    const trial = generateTrial(session, 'assessment', vi.fn(() => 0.1));
    const answered = scoreTrial(trial, trial.correctAnswer, new Date(Date.now() + 500));

    expect(answered.isCorrect).toBe(true);
    expect(answered.isValidTrial).toBe(true);
    expect(answered.invalidReason).toBeNull();
  });

  it('updates threshold state from assessment trials', () => {
    const started = sessionReducer(undefinedState(), { type: 'start', trainingEye: 'left' });
    if (!started.currentTrial || !started.session) {
      throw new Error('expected active trial');
    }
    const initialState = started.session.thresholdStates.find(
      (state) =>
        state.taskType === started.currentTrial?.taskType &&
        state.spatialFrequency === started.currentTrial?.spatialFrequency,
    );
    if (!initialState) throw new Error('expected threshold state');
    const answered = sessionReducer(started, {
      type: 'answer',
      answer: started.currentTrial.correctAnswer,
      answeredAt: new Date(new Date(started.currentTrial.createdAt).getTime() + 500),
    });
    const updatedState = answered.session?.thresholdStates.find(
      (state) =>
        state.taskType === started.currentTrial?.taskType &&
        state.spatialFrequency === started.currentTrial?.spatialFrequency,
    );

    expect(updatedState?.validTrialCount).toBe(initialState.validTrialCount + 1);
    expect(answered.phase).toBe('feedback');
  });

  it('does not update threshold state during threshold-focused training', () => {
    const config = {
      ...DEFAULT_TRAINING_CONFIG,
      taskTypes: ['contrast-detection' as const],
      assessmentTrialCount: 1,
      trainingTrialCount: 1,
      retestTrialCount: 1,
    };
    const started = sessionReducer(undefinedState(), {
      type: 'start',
      trainingEye: 'left',
      config,
    });
    if (!started.currentTrial) throw new Error('expected assessment trial');
    const assessmentFeedback = sessionReducer(started, {
      type: 'answer',
      answer: started.currentTrial.correctAnswer,
      answeredAt: new Date(new Date(started.currentTrial.createdAt).getTime() + 500),
    });
    const training = sessionReducer(assessmentFeedback, { type: 'next' });
    if (!training.currentTrial || !training.session) throw new Error('expected training trial');

    const frozenEstimate = training.session.thresholdStates[0].currentThresholdEstimate;
    const trainingFeedback = sessionReducer(training, {
      type: 'answer',
      answer: training.currentTrial.correctAnswer,
      answeredAt: new Date(new Date(training.currentTrial.createdAt).getTime() + 500),
    });

    expect(training.currentTrial.purpose).toMatch(/^training-/);
    expect(trainingFeedback.session?.thresholdStates[0].currentThresholdEstimate).toBe(frozenEstimate);
  });

  it('updates retest posterior separately from the assessment snapshot', () => {
    const config = {
      ...DEFAULT_TRAINING_CONFIG,
      taskTypes: ['contrast-detection' as const],
      assessmentTrialCount: 1,
      trainingTrialCount: 1,
      retestTrialCount: 1,
    };
    const started = sessionReducer(undefinedState(), {
      type: 'start',
      trainingEye: 'left',
      config,
    });
    if (!started.currentTrial) throw new Error('expected assessment trial');

    const assessmentFeedback = answerCurrentTrial(started);
    const training = sessionReducer(assessmentFeedback, { type: 'next' });
    const trainingFeedback = answerCurrentTrial(training);
    const retest = sessionReducer(trainingFeedback, { type: 'next' });
    if (!retest.currentTrial || !retest.session?.assessmentThresholdStates) {
      throw new Error('expected retest trial');
    }

    const retestStateBefore = retest.session.retestThresholdStates?.find(
      (state) =>
        state.taskType === retest.currentTrial?.taskType &&
        state.spatialFrequency === retest.currentTrial?.spatialFrequency,
    );
    const retestFeedback = answerCurrentTrial(retest);
    const retestStateAfter = retestFeedback.session?.retestThresholdStates?.find(
      (state) =>
        state.taskType === retest.currentTrial?.taskType &&
        state.spatialFrequency === retest.currentTrial?.spatialFrequency,
    );

    expect(retestStateAfter?.validTrialCount).toBe((retestStateBefore?.validTrialCount ?? 0) + 1);
    expect(retestFeedback.session?.assessmentThresholdStates).toEqual(
      retest.session.assessmentThresholdStates,
    );
  });

  it('starts a single selected task mode', () => {
    const started = sessionReducer(undefinedState(), {
      type: 'start',
      trainingEye: 'left',
      config: {
        ...DEFAULT_TRAINING_CONFIG,
        taskTypes: ['orientation-discrimination'],
      },
    });

    expect(started.currentTrial?.taskType).toBe('orientation-discrimination');
    expect(started.session?.config.taskTypes).toEqual(['orientation-discrimination']);
  });

  it('advances from feedback to the next trial', () => {
    const started = sessionReducer(undefinedState(), { type: 'start', trainingEye: 'left' });
    if (!started.currentTrial) {
      throw new Error('expected active trial');
    }

    const answered = sessionReducer(started, {
      type: 'answer',
      answer: started.currentTrial.correctAnswer,
      answeredAt: new Date(new Date(started.currentTrial.createdAt).getTime() + 500),
    });
    const next = sessionReducer(answered, { type: 'next' });

    expect(answered.phase).toBe('feedback');
    expect(next.phase).toBe('assessment');
    expect(next.currentTrial?.trialId).not.toBe(answered.currentTrial?.trialId);
  });
});

function sequence(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

function answerCurrentTrial(state: ReturnType<typeof sessionReducer>) {
  if (!state.currentTrial) {
    throw new Error('expected active trial');
  }

  return sessionReducer(state, {
    type: 'answer',
    answer: state.currentTrial.correctAnswer,
    answeredAt: new Date(new Date(state.currentTrial.createdAt).getTime() + 500),
  });
}

function undefinedState() {
  return {
    phase: 'ready' as const,
    session: null,
    currentTrial: null,
    feedback: null,
  };
}
