import { describe, expect, it } from 'vitest';
import { createRandomId } from './id';

describe('createRandomId', () => {
  it('uses randomUUID when available', () => {
    const id = createRandomId('trial', {
      randomUUID: () => 'native-id',
    });

    expect(id).toBe('native-id');
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const id = createRandomId('trial', {
      getRandomValues: (array) => {
        const values = array as unknown as Uint32Array;
        values.set([1, 2, 3, 4]);
        return array;
      },
    });

    expect(id).toBe('trial-00000001000000020000000300000004');
  });
});
