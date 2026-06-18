import { useEffect, useMemo, useRef } from 'react';
import type { TrainingConfig, Trial } from '../domain/types';
import { createDisplayCalibration } from '../vision/displayCalibrator';
import { renderGaborToCanvas, renderPlainGrayToCanvas } from '../vision/gaborRenderer';

export function GaborStimulus({ trial, config }: { trial: Trial; config: TrainingConfig }) {
  const calibration = useMemo(() => createDisplayCalibration(config), [config]);

  if (trial.taskType === 'contrast-detection') {
    return (
      <div className="stimulus-pair" aria-label="Contrast detection stimulus">
        <PatchCanvas
          trial={trial}
          calibration={calibration}
          hasGabor={trial.targetPosition === 'left'}
        />
        <PatchCanvas
          trial={trial}
          calibration={calibration}
          hasGabor={trial.targetPosition === 'right'}
        />
      </div>
    );
  }

  return (
    <div className="stimulus-single" aria-label="Orientation discrimination stimulus">
      <PatchCanvas trial={trial} calibration={calibration} hasGabor />
    </div>
  );
}

interface PatchCanvasProps {
  trial: Trial;
  calibration: ReturnType<typeof createDisplayCalibration>;
  hasGabor: boolean;
}

function PatchCanvas({ trial, calibration, hasGabor }: PatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasGabor) {
      renderPlainGrayToCanvas(canvas, calibration.patchRenderPixels);
      return;
    }

    renderGaborToCanvas(canvas, {
      pixelSize: calibration.patchRenderPixels,
      contrast: trial.contrast,
      spatialFrequencyCyclesPerPixel: calibration.cyclesPerPixel(trial.spatialFrequency),
      orientation: trial.orientation,
      phase: trial.phase,
      sigmaPixels: calibration.sigmaPixels,
    });
  }, [calibration, hasGabor, trial]);

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

