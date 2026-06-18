import {
  cloneThresholdStates,
  recordInvalidThresholdExposure,
  replaceThresholdState,
  updateThresholdState,
} from './adaptiveController';
import { DEFAULT_TRAINING_CONFIG } from './config';
import { summarizeSession } from './sessionSummary';
import {
  createSession,
  chooseTrainingPurpose,
  findThresholdStateForTrial,
  generateTrial,
  isTrainingPurpose,
  renderFailedTrial,
  scoreTrial,
  thresholdStatesForPurpose,
  timeoutTrial,
} from './trialGenerator';
import type {
  SessionMachine,
  TrainingConfig,
  TrainingEye,
  TrainingSession,
  Trial,
  TrialAnswer,
} from './types';

export type SessionAction =
  | { type: 'start'; trainingEye: TrainingEye; config?: TrainingConfig }
  | { type: 'answer'; answer: TrialAnswer; answeredAt?: Date }
  | { type: 'timeout' }
  | { type: 'renderFailed'; trialId: string }
  | { type: 'next' }
  | { type: 'reset' };

export const initialSessionMachine: SessionMachine = {
  phase: 'ready',
  session: null,
  currentTrial: null,
  feedback: null,
};

export function sessionReducer(
  state: SessionMachine,
  action: SessionAction,
): SessionMachine {
  switch (action.type) {
    case 'start': {
      const session = createSession(action.trainingEye, action.config ?? DEFAULT_TRAINING_CONFIG);
      return {
        phase: 'assessment',
        session,
        currentTrial: generateTrial(session, 'assessment'),
        feedback: null,
      };
    }

    case 'answer': {
      if (!state.session || !state.currentTrial) return state;
      const answeredTrial = scoreTrial(
        state.currentTrial,
        action.answer,
        action.answeredAt ?? new Date(),
        state.session.config,
      );
      const session = applyAnsweredTrial(state.session, answeredTrial);

      return {
        phase: 'feedback',
        session,
        currentTrial: answeredTrial,
        feedback: {
          correct: answeredTrial.isCorrect,
          message: answeredTrial.isCorrect ? 'Correct' : 'Incorrect',
        },
      };
    }

    case 'timeout': {
      if (!state.session || !state.currentTrial) return state;
      const answeredTrial = timeoutTrial(state.currentTrial);
      const session = applyAnsweredTrial(state.session, answeredTrial);

      return {
        phase: 'feedback',
        session,
        currentTrial: answeredTrial,
        feedback: { correct: false, message: 'Timed out' },
      };
    }

    case 'renderFailed': {
      if (
        !state.session ||
        !state.currentTrial ||
        state.currentTrial.trialId !== action.trialId ||
        state.currentTrial.answeredAt !== null
      ) {
        return state;
      }
      const answeredTrial = renderFailedTrial(state.currentTrial);
      const session = applyAnsweredTrial(state.session, answeredTrial);

      return {
        phase: 'feedback',
        session,
        currentTrial: answeredTrial,
        feedback: { correct: false, message: 'Render failed' },
      };
    }

    case 'next': {
      if (!state.session) return state;
      return advanceSession(state.session);
    }

    case 'reset':
      return initialSessionMachine;

    default:
      return state;
  }
}

function applyAnsweredTrial(session: TrainingSession, trial: Trial): TrainingSession {
  if (trial.purpose === 'assessment') {
    return {
      ...session,
      trials: [...session.trials, trial],
      thresholdStates: updateStatesForAssessmentTrial(session, trial),
    };
  }

  if (trial.purpose === 'retest') {
    return {
      ...session,
      trials: [...session.trials, trial],
      retestThresholdStates: updateStatesForAssessmentTrial(session, trial),
    };
  }

  return {
    ...session,
    trials: [...session.trials, trial],
  };
}

function updateStatesForAssessmentTrial(session: TrainingSession, trial: Trial) {
  const sourceStates = thresholdStatesForPurpose(session, trial.purpose);
  const state = findThresholdStateForTrial(sourceStates, trial);
  const updatedState =
    trial.isValidTrial && trial.isCorrect !== null
      ? updateThresholdState(state, trial, session.config)
      : recordInvalidThresholdExposure(state, trial);

  return replaceThresholdState(sourceStates, updatedState);
}

function advanceSession(session: TrainingSession): SessionMachine {
  const assessmentCompleted = session.trials.filter((trial) => trial.purpose === 'assessment').length;
  const trainingCompleted = session.trials.filter((trial) => isTrainingPurpose(trial.purpose)).length;
  const retestCompleted = session.trials.filter((trial) => trial.purpose === 'retest').length;

  if (assessmentCompleted < session.config.assessmentTrialCount) {
    return {
      phase: 'assessment',
      session,
      currentTrial: generateTrial(session, 'assessment'),
      feedback: null,
    };
  }

  const sessionWithAssessmentSnapshot =
    session.assessmentThresholdStates === null
      ? {
          ...session,
          assessmentThresholdStates: cloneThresholdStates(session.thresholdStates),
          retestThresholdStates: cloneThresholdStates(session.thresholdStates),
        }
      : session;

  if (trainingCompleted < session.config.trainingTrialCount) {
    return {
      phase: 'training',
      session: sessionWithAssessmentSnapshot,
      currentTrial: generateTrial(sessionWithAssessmentSnapshot, chooseTrainingPurpose()),
      feedback: null,
    };
  }

  if (retestCompleted < session.config.retestTrialCount) {
    return {
      phase: 'retest',
      session: sessionWithAssessmentSnapshot,
      currentTrial: generateTrial(sessionWithAssessmentSnapshot, 'retest'),
      feedback: null,
    };
  }

  const endedAt = new Date().toISOString();
  const completedSession = {
    ...session,
    endedAt,
  };
  const summary = summarizeSession(completedSession);

  return {
    phase: 'complete',
    session: {
      ...completedSession,
      summary,
    },
    currentTrial: null,
    feedback: null,
  };
}
