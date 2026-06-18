export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function weightedChoice<T>(
  items: T[],
  weightFor: (item: T) => number,
  rng: () => number = Math.random,
): T {
  if (items.length === 0) {
    throw new Error('weightedChoice requires at least one item');
  }

  const weights = items.map((item) => Math.max(0, weightFor(item)));
  const total = sum(weights);

  if (total <= 0) {
    return items[Math.floor(rng() * items.length)] ?? items[0];
  }

  const target = rng() * total;
  let cursor = 0;
  for (let index = 0; index < items.length; index += 1) {
    cursor += weights[index] ?? 0;
    if (target <= cursor) {
      return items[index] ?? items[0];
    }
  }

  return items[items.length - 1];
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

