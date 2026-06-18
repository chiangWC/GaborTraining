import type { TrainingSession } from '../domain/types';

const STORAGE_KEY = 'gabor-training.sessions.v1';

interface StoredSessionsPayload {
  version: 1;
  sessions: TrainingSession[];
}

export interface ResultStore {
  save(session: TrainingSession): void;
  loadAll(): TrainingSession[];
  clear(): void;
}

export class LocalStorageResultStore implements ResultStore {
  constructor(private readonly storage: Storage = window.localStorage) {}

  save(session: TrainingSession): void {
    const payload = this.readPayload();
    const nextSessions = [
      ...payload.sessions.filter((candidate) => candidate.sessionId !== session.sessionId),
      session,
    ].sort((a, b) => a.startedAt.localeCompare(b.startedAt));

    this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        sessions: nextSessions,
      } satisfies StoredSessionsPayload),
    );
  }

  loadAll(): TrainingSession[] {
    return this.readPayload().sessions;
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }

  private readPayload(): StoredSessionsPayload {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: 1, sessions: [] };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredSessionsPayload>;
      if (parsed.version !== 1 || !Array.isArray(parsed.sessions)) {
        return { version: 1, sessions: [] };
      }
      return {
        version: 1,
        sessions: parsed.sessions,
      };
    } catch {
      return { version: 1, sessions: [] };
    }
  }
}

