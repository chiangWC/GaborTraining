import { Activity, ArrowLeft, ArrowRight, Eye, RotateCcw, Ruler, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { DEFAULT_TRAINING_CONFIG, taskTypeLabel } from './domain/config';
import { roundTo } from './domain/math';
import {
  initialSessionMachine,
  sessionReducer,
} from './domain/sessionReducer';
import type {
  TaskType,
  TrainingEye,
  TrainingSession,
  Trial,
  TrialAnswer,
  TrialPurpose,
} from './domain/types';
import { LocalStorageResultStore } from './storage/resultStore';
import { GaborStimulus } from './components/GaborStimulus';
import { calculateScreenPpi } from './vision/displayCalibrator';

const store = new LocalStorageResultStore();
const calibrationReferences = {
  'bank-card': { label: 'Bank card', widthCm: 8.56 },
  'ten-cm-ruler': { label: '10 cm ruler', widthCm: 10 },
} as const;
type CalibrationReference = keyof typeof calibrationReferences;

export function App() {
  const [machine, dispatch] = useReducer(sessionReducer, initialSessionMachine);
  const [trainingEye, setTrainingEye] = useState<TrainingEye>('left');
  const [taskType, setTaskType] = useState<TaskType>('contrast-detection');
  const [calibrationReference, setCalibrationReference] =
    useState<CalibrationReference>('bank-card');
  const [referenceCssPixels, setReferenceCssPixels] = useState(340);
  const [viewingDistanceCm, setViewingDistanceCm] = useState(
    DEFAULT_TRAINING_CONFIG.viewingDistanceCm,
  );
  const [savedSessions, setSavedSessions] = useState<TrainingSession[]>(() => store.loadAll());
  const screenPpi = useMemo(
    () =>
      calculateScreenPpi({
        referenceCssPixels,
        referenceWidthCm: calibrationReferences[calibrationReference].widthCm,
        devicePixelRatio: getDevicePixelRatio(),
      }),
    [calibrationReference, referenceCssPixels],
  );

  useEffect(() => {
    if (machine.phase !== 'feedback') return;
    const timer = window.setTimeout(() => {
      dispatch({ type: 'next' });
    }, machine.session?.config.feedbackDurationMs ?? DEFAULT_TRAINING_CONFIG.feedbackDurationMs);

    return () => window.clearTimeout(timer);
  }, [machine.phase, machine.session?.config.feedbackDurationMs]);

  useEffect(() => {
    if (machine.phase !== 'complete' || !machine.session) return;
    store.save(machine.session);
    setSavedSessions(store.loadAll());
  }, [machine.phase, machine.session]);

  const progress = useMemo(() => {
    const session = machine.session;
    if (!session) return { completed: 0, total: 0, label: 'Ready' };

    const currentPurpose = machine.currentTrial?.purpose;
    const assessment = session.trials.filter((trial) => trial.purpose === 'assessment').length;
    const training = session.trials.filter((trial) => isTrainingPurpose(trial.purpose)).length;
    const retest = session.trials.filter((trial) => trial.purpose === 'retest').length;

    if (machine.phase === 'assessment' || currentPurpose === 'assessment') {
      return {
        completed: assessment,
        total: session.config.assessmentTrialCount,
        label: '快速测阈值',
      };
    }
    if (machine.phase === 'training' || (currentPurpose && isTrainingPurpose(currentPurpose))) {
      return {
        completed: training,
        total: session.config.trainingTrialCount,
        label: '阈值附近训练',
      };
    }
    if (machine.phase === 'retest' || currentPurpose === 'retest') {
      return {
        completed: retest,
        total: session.config.retestTrialCount,
        label: '简短复测',
      };
    }
    return {
      completed: assessment + training + retest,
      total:
        session.config.assessmentTrialCount +
        session.config.trainingTrialCount +
        session.config.retestTrialCount,
      label: 'Complete',
    };
  }, [machine.currentTrial?.purpose, machine.phase, machine.session]);

  const start = () => {
    dispatch({
      type: 'start',
      trainingEye,
      config: {
        ...DEFAULT_TRAINING_CONFIG,
        taskTypes: [taskType],
        viewingDistanceCm,
        screenPpi,
      },
    });
  };

  const reset = () => {
    dispatch({ type: 'reset' });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Eye size={22} />
          </div>
          <div>
            <p className="eyebrow">Gabor Visual Training</p>
            <h1>弱视视觉知觉训练</h1>
          </div>
        </div>
        <div className="session-pill">
          <Activity size={16} />
          {machine.phase === 'ready' ? '未开始' : progress.label}
        </div>
      </header>

      {machine.phase === 'ready' && (
        <SetupScreen
          trainingEye={trainingEye}
          setTrainingEye={setTrainingEye}
          taskType={taskType}
          setTaskType={setTaskType}
          calibrationReference={calibrationReference}
          setCalibrationReference={setCalibrationReference}
          referenceCssPixels={referenceCssPixels}
          setReferenceCssPixels={setReferenceCssPixels}
          viewingDistanceCm={viewingDistanceCm}
          setViewingDistanceCm={setViewingDistanceCm}
          screenPpi={screenPpi}
          onStart={start}
          savedSessions={savedSessions}
        />
      )}

      {(machine.phase === 'assessment' ||
        machine.phase === 'training' ||
        machine.phase === 'retest' ||
        machine.phase === 'feedback') &&
        machine.session &&
        machine.currentTrial && (
          <TrainingScreen
            trial={machine.currentTrial}
            session={machine.session}
            progress={progress}
            onAnswer={(answer) => dispatch({ type: 'answer', answer })}
            onRenderFailed={(trialId) => dispatch({ type: 'renderFailed', trialId })}
            onReset={reset}
            isFeedback={machine.phase === 'feedback'}
            feedback={machine.feedback}
          />
        )}

      {machine.phase === 'complete' && machine.session?.summary && (
        <ResultScreen session={machine.session} onReset={reset} />
      )}
    </main>
  );
}

interface SetupScreenProps {
  trainingEye: TrainingEye;
  setTrainingEye: (eye: TrainingEye) => void;
  taskType: TaskType;
  setTaskType: (taskType: TaskType) => void;
  calibrationReference: CalibrationReference;
  setCalibrationReference: (reference: CalibrationReference) => void;
  referenceCssPixels: number;
  setReferenceCssPixels: (pixels: number) => void;
  viewingDistanceCm: number;
  setViewingDistanceCm: (distanceCm: number) => void;
  screenPpi: number;
  onStart: () => void;
  savedSessions: TrainingSession[];
}

function SetupScreen({
  trainingEye,
  setTrainingEye,
  taskType,
  setTaskType,
  calibrationReference,
  setCalibrationReference,
  referenceCssPixels,
  setReferenceCssPixels,
  viewingDistanceCm,
  setViewingDistanceCm,
  screenPpi,
  onStart,
  savedSessions,
}: SetupScreenProps) {
  const latestSession = savedSessions[savedSessions.length - 1];

  return (
    <section className="setup-layout">
      <div className="setup-primary">
        <div className="notice-band">
          <ShieldAlert size={22} />
          <div>
            <h2>训练前确认</h2>
            <p>结果仅用于训练趋势观察，不提供医学诊断，也不承诺治疗效果。</p>
          </div>
        </div>

        <div className="instruction-grid">
          <div>
            <span className="step-index">01</span>
            <p>保持固定观看距离，建议约 57 cm。</p>
          </div>
          <div>
            <span className="step-index">02</span>
            <p>保持屏幕亮度稳定，不在强反光环境中训练。</p>
          </div>
          <div>
            <span className="step-index">03</span>
            <p>遮盖非训练眼，只使用所选训练眼完成任务。</p>
          </div>
          <div>
            <span className="step-index">04</span>
            <p>出现眼痛、头痛、复视或明显不适时立即停止。</p>
          </div>
        </div>

        <div className="eye-selector" aria-label="Training eye">
          <button
            type="button"
            className={trainingEye === 'left' ? 'segmented active' : 'segmented'}
            onClick={() => setTrainingEye('left')}
          >
            Left Eye
          </button>
          <button
            type="button"
            className={trainingEye === 'right' ? 'segmented active' : 'segmented'}
            onClick={() => setTrainingEye('right')}
          >
            Right Eye
          </button>
        </div>

        <div className="task-selector" aria-label="Training task">
          <button
            type="button"
            className={taskType === 'contrast-detection' ? 'task-card active' : 'task-card'}
            onClick={() => setTaskType('contrast-detection')}
          >
            <strong>Contrast Detection</strong>
            <span>左右两区，选择含有 Gabor 条纹的位置。</span>
          </button>
          <button
            type="button"
            className={taskType === 'orientation-discrimination' ? 'task-card active' : 'task-card'}
            onClick={() => setTaskType('orientation-discrimination')}
          >
            <strong>Orientation Discrimination</strong>
            <span>中央条纹，判断向左倾或向右倾。</span>
          </button>
        </div>

        <DisplayCalibrationPanel
          calibrationReference={calibrationReference}
          setCalibrationReference={setCalibrationReference}
          referenceCssPixels={referenceCssPixels}
          setReferenceCssPixels={setReferenceCssPixels}
          viewingDistanceCm={viewingDistanceCm}
          setViewingDistanceCm={setViewingDistanceCm}
          screenPpi={screenPpi}
        />

        <button type="button" className="primary-action" onClick={onStart}>
          Start Training
          <ArrowRight size={18} />
        </button>
      </div>

      <aside className="setup-panel">
        <h2>本次默认参数</h2>
        <Metric label="Assessment" value={`${DEFAULT_TRAINING_CONFIG.assessmentTrialCount} trials`} />
        <Metric label="Training" value={`${DEFAULT_TRAINING_CONFIG.trainingTrialCount} trials`} />
        <Metric label="Retest" value={`${DEFAULT_TRAINING_CONFIG.retestTrialCount} trials`} />
        <Metric label="Frequencies" value="1, 2, 4, 8, 12 cpd" />
        <Metric label="Task" value={taskTypeLabel[taskType]} />
        <Metric label="Screen PPI" value={Math.round(screenPpi)} />
        <Metric label="Viewing distance" value={`${viewingDistanceCm} cm`} />
        {latestSession?.summary && (
          <div className="last-session">
            <p className="eyebrow">Last saved session</p>
            <strong>{Math.round(latestSession.summary.accuracy * 100)}%</strong>
            <span>{latestSession.summary.validTrials} valid trials</span>
          </div>
        )}
      </aside>
    </section>
  );
}

interface DisplayCalibrationPanelProps {
  calibrationReference: CalibrationReference;
  setCalibrationReference: (reference: CalibrationReference) => void;
  referenceCssPixels: number;
  setReferenceCssPixels: (pixels: number) => void;
  viewingDistanceCm: number;
  setViewingDistanceCm: (distanceCm: number) => void;
  screenPpi: number;
}

function DisplayCalibrationPanel({
  calibrationReference,
  setCalibrationReference,
  referenceCssPixels,
  setReferenceCssPixels,
  viewingDistanceCm,
  setViewingDistanceCm,
  screenPpi,
}: DisplayCalibrationPanelProps) {
  const reference = calibrationReferences[calibrationReference];
  const setClampedReferenceCssPixels = (pixels: number) => {
    setReferenceCssPixels(Math.min(Math.max(Math.round(pixels), 120), 620));
  };
  const setClampedViewingDistance = (distanceCm: number) => {
    setViewingDistanceCm(Math.min(Math.max(Math.round(distanceCm), 30), 120));
  };

  return (
    <div className="calibration-panel">
      <div className="calibration-title">
        <Ruler size={18} />
        <div>
          <h3>Display calibration</h3>
          <p>Match the reference bar to {reference.label.toLowerCase()} width.</p>
        </div>
      </div>

      <div className="calibration-reference-selector" aria-label="Calibration reference">
        {Object.entries(calibrationReferences).map(([key, item]) => (
          <button
            key={key}
            type="button"
            className={calibrationReference === key ? 'segmented active' : 'segmented'}
            onClick={() => setCalibrationReference(key as CalibrationReference)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="calibration-scale" aria-label="Physical reference width">
        <div style={{ width: `${referenceCssPixels}px` }} />
      </div>

      <div className="calibration-controls">
        <label>
          Reference bar
          <input
            type="range"
            min="120"
            max="620"
            value={referenceCssPixels}
            onChange={(event) => setClampedReferenceCssPixels(Number(event.target.value))}
          />
        </label>
        <label>
          Width px
          <input
            type="number"
            min="120"
            max="620"
            value={referenceCssPixels}
            onChange={(event) => setClampedReferenceCssPixels(Number(event.target.value))}
          />
        </label>
        <label>
          Distance cm
          <input
            type="number"
            min="30"
            max="120"
            value={viewingDistanceCm}
            onChange={(event) => setClampedViewingDistance(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="calibration-metrics">
        <Metric label="Reference" value={`${reference.widthCm} cm`} />
        <Metric label="Estimated PPI" value={Math.round(screenPpi)} />
      </div>
    </div>
  );
}

interface TrainingScreenProps {
  trial: Trial;
  session: TrainingSession;
  progress: { completed: number; total: number; label: string };
  onAnswer: (answer: TrialAnswer) => void;
  onRenderFailed: (trialId: string) => void;
  onReset: () => void;
  isFeedback: boolean;
  feedback: { correct: boolean | null; message: string } | null;
}

function TrainingScreen({
  trial,
  session,
  progress,
  onAnswer,
  onRenderFailed,
  onReset,
  isFeedback,
  feedback,
}: TrainingScreenProps) {
  const progressPercent = progress.total === 0 ? 0 : (progress.completed / progress.total) * 100;
  const displayedTrialNumber = trial.answeredAt ? progress.completed : progress.completed + 1;
  const leftAnswer: TrialAnswer =
    trial.taskType === 'contrast-detection' ? 'left' : 'tilted-left';
  const rightAnswer: TrialAnswer =
    trial.taskType === 'contrast-detection' ? 'right' : 'tilted-right';

  useEffect(() => {
    if (isFeedback) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onAnswer(leftAnswer);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onAnswer(rightAnswer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFeedback, leftAnswer, onAnswer, rightAnswer]);

  return (
    <section className="training-layout">
      <div className="training-header">
        <div>
          <p className="eyebrow">{progress.label}</p>
          <h2>{taskTypeLabel[trial.taskType]}</h2>
        </div>
        <button type="button" className="icon-action" onClick={onReset} aria-label="Reset session">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="progress-track" aria-label="Training progress">
        <div style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="trial-meta">
        <Metric label="Eye" value={session.trainingEye === 'left' ? 'Left' : 'Right'} />
        <Metric label="Frequency" value={`${trial.spatialFrequency} cpd`} />
        <Metric label="Contrast" value={trial.contrast.toFixed(3)} />
        <Metric label="Purpose" value={purposeLabel[trial.purpose]} />
        <Metric label="Trial" value={`${displayedTrialNumber}/${progress.total}`} />
      </div>

      <GaborStimulus trial={trial} config={session.config} onRenderFailed={onRenderFailed} />

      {isFeedback && feedback && <InlineFeedback feedback={feedback} trial={trial} />}
      <p className="keyboard-hint">Use ← / → keys or the buttons below to answer.</p>
      <AnswerControls trial={trial} onAnswer={onAnswer} disabled={isFeedback} />
    </section>
  );
}

function AnswerControls({
  trial,
  onAnswer,
  disabled,
}: {
  trial: Trial;
  onAnswer: (answer: TrialAnswer) => void;
  disabled: boolean;
}) {
  if (trial.taskType === 'contrast-detection') {
    return (
      <div className="answer-row">
        <button type="button" className="answer-button" onClick={() => onAnswer('left')} disabled={disabled}>
          <ArrowLeft size={18} />
          Left
        </button>
        <button type="button" className="answer-button" onClick={() => onAnswer('right')} disabled={disabled}>
          Right
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="answer-row">
      <button type="button" className="answer-button" onClick={() => onAnswer('tilted-left')} disabled={disabled}>
        <ArrowLeft size={18} />
        Tilted Left
      </button>
      <button type="button" className="answer-button" onClick={() => onAnswer('tilted-right')} disabled={disabled}>
        Tilted Right
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

function InlineFeedback({
  feedback,
  trial,
}: {
  feedback: { correct: boolean | null; message: string };
  trial: Trial;
}) {
  const detail = trial.isValidTrial
    ? `${trial.reactionTimeMs ?? 0} ms`
    : 'Not included in threshold update';

  return (
    <div
      className={feedback.correct ? 'inline-feedback correct' : 'inline-feedback incorrect'}
      role="status"
      aria-live="polite"
    >
      <strong>{feedback.message}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ResultScreen({ session, onReset }: { session: TrainingSession; onReset: () => void }) {
  const summary = session.summary;
  if (!summary) return null;
  const resultRows = session.config.taskTypes.flatMap((taskType) =>
    session.config.spatialFrequencies.map((frequency) => ({
      taskType,
      frequency,
      label:
        session.config.taskTypes.length === 1
          ? `${frequency} cpd`
          : `${taskTypeLabel[taskType]} ${frequency} cpd`,
    })),
  );

  return (
    <section className="result-layout">
      <div className="result-header">
        <div>
          <p className="eyebrow">Session Complete</p>
          <h2>多空间频率阈值结果</h2>
        </div>
        <button type="button" className="primary-action compact" onClick={onReset}>
          New Session
          <RotateCcw size={17} />
        </button>
      </div>

      <div className="summary-grid">
        <Metric label="Training eye" value={session.trainingEye === 'left' ? 'Left' : 'Right'} />
        <Metric label="Total trials" value={summary.totalTrials} />
        <Metric label="Valid trials" value={summary.validTrials} />
        <Metric label="Accuracy" value={`${Math.round(summary.accuracy * 100)}%`} />
        <Metric label="Duration" value={`${Math.round(summary.durationSeconds / 60)} min`} />
        <Metric label="Mean RT" value={`${summary.meanReactionTimeMs} ms`} />
      </div>

      <div className="chart-section">
        <div>
          <h3>Retest threshold</h3>
          <div className="frequency-table">
            {resultRows.map(({ taskType, frequency, label }) => {
              const threshold = summary.thresholdByTaskAndFrequency[taskType]?.[String(frequency)] ?? 0;
              return (
                <div className="frequency-row" key={`${taskType}:${frequency}`}>
                  <span>{label}</span>
                  <div className="bar-track threshold">
                    <div
                      style={{
                        width: `${Math.max(4, threshold * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{roundTo(threshold, 3)}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3>Short-term threshold change</h3>
          <div className="frequency-table">
            {resultRows.map(({ taskType, frequency, label }) => {
              const change = summary.thresholdChangeByTaskAndFrequency[taskType]?.[String(frequency)] ?? 0;
              const magnitude = Math.min(Math.abs(change) * 400, 100);
              return (
                <div className="frequency-row" key={`${taskType}:${frequency}`}>
                  <span>{label}</span>
                  <div className={change <= 0 ? 'bar-track sensitivity' : 'bar-track threshold'}>
                    <div style={{ width: `${Math.max(4, magnitude)}%` }} />
                  </div>
                  <strong>{change > 0 ? '+' : ''}{roundTo(change, 3)}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="result-note">
        Threshold 越低表示在本训练任务中能识别更低对比度的 Gabor 条纹；change 为复测阈值减去初测阈值，负值表示本次短期阈值下降。
      </p>
    </section>
  );
}

const purposeLabel: Record<TrialPurpose, string> = {
  assessment: 'Assessment',
  'training-easy': 'Easy',
  'training-core': 'Core',
  'training-challenge': 'Challenge',
  retest: 'Retest',
};

function isTrainingPurpose(purpose: TrialPurpose): boolean {
  return (
    purpose === 'training-easy' ||
    purpose === 'training-core' ||
    purpose === 'training-challenge'
  );
}

function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return Math.max(window.devicePixelRatio || 1, 1);
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
