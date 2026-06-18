export interface GaborRenderParams {
  pixelSize: number;
  contrast: number;
  spatialFrequencyCyclesPerPixel: number;
  orientation: number;
  phase: number;
  sigmaPixels: number;
}

export function renderGaborToCanvas(
  canvas: HTMLCanvasElement,
  params: GaborRenderParams,
): boolean {
  const size = Math.max(1, Math.round(params.pixelSize));
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return false;

  const imageData = context.createImageData(size, size);
  const center = size / 2;
  const cosTheta = Math.cos(params.orientation);
  const sinTheta = Math.sin(params.orientation);
  const twoPiF = 2 * Math.PI * params.spatialFrequencyCyclesPerPixel;
  const twoSigmaSquared = 2 * params.sigmaPixels * params.sigmaPixels;

  for (let py = 0; py < size; py += 1) {
    const y = py - center;
    for (let px = 0; px < size; px += 1) {
      const x = px - center;
      const xPrime = x * cosTheta + y * sinTheta;
      const yPrime = -x * sinTheta + y * cosTheta;
      const gaussian = Math.exp(-(xPrime * xPrime + yPrime * yPrime) / twoSigmaSquared);
      const sinusoidal = Math.cos(twoPiF * xPrime + params.phase);
      const value = 0.5 + 0.5 * params.contrast * gaussian * sinusoidal;
      const gray = Math.round(Math.min(Math.max(value, 0), 1) * 255);
      const offset = (py * size + px) * 4;
      imageData.data[offset] = gray;
      imageData.data[offset + 1] = gray;
      imageData.data[offset + 2] = gray;
      imageData.data[offset + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return true;
}

export function renderPlainGrayToCanvas(canvas: HTMLCanvasElement, pixelSize: number): boolean {
  const size = Math.max(1, Math.round(pixelSize));
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return false;

  context.fillStyle = 'rgb(128 128 128)';
  context.fillRect(0, 0, size, size);
  return true;
}

