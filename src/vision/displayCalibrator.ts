import type { TrainingConfig } from '../domain/types';
import { DEFAULT_SCREEN_PPI } from '../domain/config';

export interface DisplayCalibration {
  viewingDistanceCm: number;
  screenPpi: number;
  pixelsPerDegree: number;
  pointsPerDegree: number;
  patchCssPixels: number;
  patchRenderPixels: number;
  sigmaPixels: number;
  cyclesPerPixel: (spatialFrequencyCpd: number) => number;
}

export interface ScreenPpiCalibrationInput {
  referenceCssPixels: number;
  referenceWidthCm: number;
  devicePixelRatio?: number;
}

export function createDisplayCalibration(config: TrainingConfig): DisplayCalibration {
  const devicePixelRatio =
    typeof window === 'undefined' ? 1 : Math.max(window.devicePixelRatio || 1, 1);
  const pixelsPerCm = config.screenPpi / 2.54;
  const cmPerDegree = 2 * config.viewingDistanceCm * Math.tan(Math.PI / 360);
  const pixelsPerDegree = pixelsPerCm * cmPerDegree;
  const pointsPerDegree = pixelsPerDegree / devicePixelRatio;
  const patchCssPixels = Math.round(pointsPerDegree * config.patchSizeDegree);
  const patchRenderPixels = Math.max(256, Math.round(pixelsPerDegree * config.patchSizeDegree));
  const sigmaPixels = pixelsPerDegree * (config.patchSizeDegree / 6);

  return {
    viewingDistanceCm: config.viewingDistanceCm,
    screenPpi: config.screenPpi,
    pixelsPerDegree,
    pointsPerDegree,
    patchCssPixels,
    patchRenderPixels,
    sigmaPixels,
    cyclesPerPixel: (spatialFrequencyCpd: number) => spatialFrequencyCpd / pixelsPerDegree,
  };
}

export function calculateScreenPpi({
  referenceCssPixels,
  referenceWidthCm,
  devicePixelRatio = 1,
}: ScreenPpiCalibrationInput): number {
  if (referenceCssPixels <= 0 || referenceWidthCm <= 0 || devicePixelRatio <= 0) {
    return DEFAULT_SCREEN_PPI;
  }

  const cssPixelsPerCm = referenceCssPixels / referenceWidthCm;
  return cssPixelsPerCm * devicePixelRatio * 2.54;
}
