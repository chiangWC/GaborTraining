import type { TrainingConfig } from '../domain/types';

export interface DisplayCalibration {
  viewingDistanceCm: number;
  pixelsPerDegree: number;
  pointsPerDegree: number;
  patchCssPixels: number;
  patchRenderPixels: number;
  sigmaPixels: number;
  cyclesPerPixel: (spatialFrequencyCpd: number) => number;
}

const DEFAULT_PPI = 110;

export function createDisplayCalibration(config: TrainingConfig): DisplayCalibration {
  const devicePixelRatio =
    typeof window === 'undefined' ? 1 : Math.max(window.devicePixelRatio || 1, 1);
  const pixelsPerCm = DEFAULT_PPI / 2.54;
  const cmPerDegree = 2 * config.viewingDistanceCm * Math.tan(Math.PI / 360);
  const pixelsPerDegree = pixelsPerCm * cmPerDegree;
  const pointsPerDegree = pixelsPerDegree / devicePixelRatio;
  const patchCssPixels = Math.round(pointsPerDegree * config.patchSizeDegree);
  const patchRenderPixels = Math.max(256, Math.round(pixelsPerDegree * config.patchSizeDegree));
  const sigmaPixels = pixelsPerDegree * (config.patchSizeDegree / 6);

  return {
    viewingDistanceCm: config.viewingDistanceCm,
    pixelsPerDegree,
    pointsPerDegree,
    patchCssPixels,
    patchRenderPixels,
    sigmaPixels,
    cyclesPerPixel: (spatialFrequencyCpd: number) => spatialFrequencyCpd / pixelsPerDegree,
  };
}

