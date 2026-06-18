export type TrainingEye = 'left' | 'right';

export type TaskType = 'contrast-detection' | 'orientation-discrimination';

export type TrainingPhase = 'ready' | 'assessment' | 'training' | 'retest' | 'feedback' | 'complete';

export type TrialPurpose =
  | 'assessment'
  | 'training-easy'
  | 'training-core'
  | 'training-challenge'
  | 'retest';

export type TargetPosition = 'left' | 'right';

export type OrientationAnswer = 'tilted-left' | 'tilted-right';

export type TrialAnswer = TargetPosition | OrientationAnswer;

export type TrialInvalidReason =
  | 'too-fast'
  | 'timeout'
  | 'render-failed'
  | 'cancelled';

export type ThresholdByTaskAndFrequency = Record<TaskType, Record<string, number>>;

export interface AdaptiveConfig {
  guessRate: number;
  lapseRate: number;
  targetCorrectRate: number;
  slope: number;
  gridSize: number;
}

export interface TrainingConfig {
  taskTypes: TaskType[];
  spatialFrequencies: number[];
  assessmentTrialCount: number;
  trainingTrialCount: number;
  retestTrialCount: number;
  viewingDistanceCm: number;
  patchSizeDegree: number;
  orientationAngleDegree: number;
  minContrast: number;
  maxContrast: number;
  feedbackDurationMs: number;
  minReactionTimeMs: number;
  timeoutMs: number;
  maxDurationMinutes: number;
  adaptive: AdaptiveConfig;
}

export interface Trial {
  trialId: string;
  sessionId: string;
  trialIndex: number;
  purpose: TrialPurpose;
  isPracticeTrial: boolean;
  taskType: TaskType;
  trainingEye: TrainingEye;
  spatialFrequency: number;
  contrast: number;
  phase: number;
  orientation: number;
  targetPosition: TargetPosition | null;
  correctAnswer: TrialAnswer;
  userAnswer: TrialAnswer | null;
  isCorrect: boolean | null;
  reactionTimeMs: number | null;
  isValidTrial: boolean;
  invalidReason: TrialInvalidReason | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface ThresholdState {
  taskType: TaskType;
  spatialFrequency: number;
  thresholdGrid: number[];
  posteriorDistribution: number[];
  currentThresholdEstimate: number;
  thresholdUncertainty: number;
  trialCount: number;
  validTrialCount: number;
  recentResponses: boolean[];
  lastContrast: number | null;
  lastUpdatedAt: string;
}

export interface SessionSummary {
  totalTrials: number;
  validTrials: number;
  invalidTrialCount: number;
  accuracy: number;
  durationSeconds: number;
  thresholdByTaskAndFrequency: ThresholdByTaskAndFrequency;
  sensitivityByTaskAndFrequency: ThresholdByTaskAndFrequency;
  assessmentThresholdByTaskAndFrequency: ThresholdByTaskAndFrequency;
  thresholdChangeByTaskAndFrequency: ThresholdByTaskAndFrequency;
  meanReactionTimeMs: number;
}

export interface TrainingSession {
  sessionId: string;
  trainingEye: TrainingEye;
  startedAt: string;
  endedAt: string | null;
  config: TrainingConfig;
  trials: Trial[];
  thresholdStates: ThresholdState[];
  assessmentThresholdStates: ThresholdState[] | null;
  retestThresholdStates: ThresholdState[] | null;
  summary: SessionSummary | null;
}

export interface SessionMachine {
  phase: TrainingPhase;
  session: TrainingSession | null;
  currentTrial: Trial | null;
  feedback: { correct: boolean | null; message: string } | null;
}
