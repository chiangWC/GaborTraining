import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { TrainingConfig, Trial } from '../domain/types';
import { createDisplayCalibration } from '../vision/displayCalibrator';
import { renderGaborToCanvas, renderPlainGrayToCanvas } from '../vision/gaborRenderer';

export function GaborStimulus({
  trial,
  config,
  onRenderFailed,
}: {
  trial: Trial;
  config: TrainingConfig;
  onRenderFailed: (trialId: string) => void;
}) {
  const calibration = useMemo(() => createDisplayCalibration(config), [config]);
  const failedTrialIds = useRef(new Set<string>());
  const reportRenderFailed = useCallback(
    (trialId: string) => {
      if (failedTrialIds.current.has(trialId)) return;
      failedTrialIds.current.add(trialId);
      onRenderFailed(trialId);
    },
    [onRenderFailed],
  );

  if (trial.taskType === 'contrast-detection') {
    return (
      <div className="stimulus-pair" aria-label="Contrast detection stimulus">
        <PatchCanvas
          trial={trial}
          calibration={calibration}
          hasGabor={trial.targetPosition === 'left'}
          onRenderFailed={reportRenderFailed}
        />
        <PatchCanvas
          trial={trial}
          calibration={calibration}
          hasGabor={trial.targetPosition === 'right'}
          onRenderFailed={reportRenderFailed}
        />
      </div>
    );
  }

  return (
    <div className="stimulus-single" aria-label="Orientation discrimination stimulus">
      <PatchCanvas
        trial={trial}
        calibration={calibration}
        hasGabor
        onRenderFailed={reportRenderFailed}
      />
    </div>
  );
}

interface PatchCanvasProps {
  trial: Trial;
  calibration: ReturnType<typeof createDisplayCalibration>;
  hasGabor: boolean;
  onRenderFailed: (trialId: string) => void;
}

function PatchCanvas({ trial, calibration, hasGabor, onRenderFailed }: PatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const didRender = hasGabor
      ? renderGaborToCanvas(canvas, {
          pixelSize: calibration.patchRenderPixels,
          contrast: trial.contrast,
          spatialFrequencyCyclesPerPixel: calibration.cyclesPerPixel(trial.spatialFrequency),
          orientation: trial.orientation,
          phase: trial.phase,
          sigmaPixels: calibration.sigmaPixels,
        })
      : renderPlainGrayToCanvas(canvas, calibration.patchRenderPixels);

    if (!didRender && trial.answeredAt === null) {
      onRenderFailed(trial.trialId);
    }
  }, [calibration, hasGabor, onRenderFailed, trial]);

  return (
    <canvas
      ref={canvasRef}
      className="gabor-canvas"
      width={calibration.patchRenderPixels}
      height={calibration.patchRenderPixels}
      style={{
        width: `${calibration.patchCssPixels}px`,
        height: `${calibration.patchCssPixels}px`,
      }}
    />
  );
}
