import { describe, expect, it } from 'vitest';
import { DEFAULT_TRAINING_CONFIG } from '../domain/config';
import { initializeThresholdStates } from '../domain/adaptiveController';
import type { TrainingSession } from '../domain/types';
import { LocalStorageResultStore } from './resultStore';

describe('LocalStorageResultStore', () => {
  it('saves and loads sessions', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageResultStore(storage);
    const session = makeSession();

    store.save(session);

    expect(store.loadAll()).toHaveLength(1);
    expect(store.loadAll()[0].sessionId).toBe(session.sessionId);
  });
});

function makeSession(): TrainingSession {
  return {
    sessionId: 'session-1',
    trainingEye: 'left',
    startedAt: new Date(0).toISOString(),
    endedAt: new Date(1000).toISOString(),
    config: DEFAULT_TRAINING_CONFIG,
    trials: [],
    thresholdStates: initializeThresholdStates(),
    assessmentThresholdStates: null,
    retestThresholdStates: null,
    summary: null,
  };
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
