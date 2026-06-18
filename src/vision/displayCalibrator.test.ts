import { describe, expect, it } from 'vitest';
import { DEFAULT_TRAINING_CONFIG } from '../domain/config';
import { calculateScreenPpi, createDisplayCalibration } from './displayCalibrator';

describe('displayCalibrator', () => {
  it('calculates physical screen PPI from a measured reference', () => {
    const ppi = calculateScreenPpi({
      referenceCssPixels: 337,
      referenceWidthCm: 8.56,
      devicePixelRatio: 2,
    });

    expect(ppi).toBeCloseTo(200, 0);
  });

  it('uses configured screen PPI for pixels per degree', () => {
    const base = createDisplayCalibration({
      ...DEFAULT_TRAINING_CONFIG,
      screenPpi: 100,
      viewingDistanceCm: 57,
    });
    const denser = createDisplayCalibration({
      ...DEFAULT_TRAINING_CONFIG,
      screenPpi: 200,
      viewingDistanceCm: 57,
    });

    expect(denser.pixelsPerDegree).toBeCloseTo(base.pixelsPerDegree * 2);
    expect(denser.cyclesPerPixel(8)).toBeCloseTo(base.cyclesPerPixel(8) / 2);
  });
});
