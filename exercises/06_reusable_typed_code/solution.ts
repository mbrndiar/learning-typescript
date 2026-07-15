// Reference solution for reusable typed code. The domain types stay small, and
// behavior depends on injected capabilities so storage, time, and IDs can vary
// without changing the NoteService.
export interface Entity {
  readonly id: string;
}

export interface Note extends Entity {
  readonly text: string;
  readonly createdAt: string;
}

export type NewNote = Omit<Note, "id" | "createdAt">;
export type NotePreview = Pick<Note, "id" | "text">;

// These interfaces describe only what NoteService needs at its boundary.
export interface NoteRepository {
  save(note: Note): void;
  list(): readonly Note[];
}

export interface IdGenerator {
  next(): string;
}

export interface Clock {
  now(): string;
}

export function findById<T extends Entity>(
  values: readonly T[],
  id: string,
): T | undefined {
  // T extends Entity is just enough constraint to read id while preserving
  // fields such as Note.text for the caller who receives the result.
  return values.find((value) => value.id === id);
}

// Return a new read model so callers cannot accidentally rely on fields that
// this boundary does not promise to expose.
export function toPreviews(notes: readonly Note[]): NotePreview[] {
  return notes.map(({ id, text }) => ({ id, text }));
}

export class NoteService {
  // Dependencies are constructor parameters to make ownership and replacement
  // explicit: this class owns note rules, not persistence or clocks.
  constructor(
    private readonly repository: NoteRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  // Create fills generated fields, persists the complete Note, and returns the
  // same trusted value to the caller.
  create(draft: NewNote): Note {
    const note: Note = {
      id: this.ids.next(),
      text: draft.text,
      createdAt: this.clock.now(),
    };
    this.repository.save(note);
    return note;
  }

  // The repository decides storage; the service only exposes its readonly view.
  list(): readonly Note[] {
    return this.repository.list();
  }
}
