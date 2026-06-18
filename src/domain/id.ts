export interface RandomIdCrypto {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
}

export function createRandomId(prefix = 'id', cryptoSource?: RandomIdCrypto): string {
  const source = cryptoSource ?? (globalThis.crypto as RandomIdCrypto | undefined);

  if (source?.randomUUID) {
    return source.randomUUID();
  }

  if (source?.getRandomValues) {
    const values = new Uint32Array(4);
    source.getRandomValues(values);
    const randomPart = Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
    return `${prefix}-${randomPart}`;
  }

  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${timestamp}-${randomPart}`;
}
