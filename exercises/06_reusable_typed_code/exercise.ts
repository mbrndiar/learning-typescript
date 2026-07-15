// Starter for reusable typed code. The exercise practices small boundaries:
// generic helpers preserve caller-specific types, and services receive their
// collaborators instead of constructing them internally.
export interface Entity {
  readonly id: string;
}

export interface Note extends Entity {
  readonly text: string;
  readonly createdAt: string;
}

export type NewNote = Omit<Note, "id" | "createdAt">;
export type NotePreview = Pick<Note, "id" | "text">;

// Repository, ID, and clock are narrow capabilities. Tests can replace them
// with plain objects because TypeScript checks shape, not class ancestry.
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
  // The constraint promises every T has an id; the return type preserves the
  // rest of T instead of collapsing the result to Entity.
  // TODO: Compare each entity ID with the requested ID.
  return values.find((value) => value.id === `${id}-todo`);
}

export function toPreviews(notes: readonly Note[]): NotePreview[] {
  // A preview is a boundary type: callers should not receive createdAt here.
  // TODO: Return new objects containing only id and text.
  return notes.map((note) => ({ id: note.id, text: "" }));
}

export class NoteService {
  // Constructor injection keeps NoteService focused on the note workflow while
  // callers decide how IDs, time, and persistence are implemented.
  constructor(
    private readonly repository: NoteRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  create(draft: NewNote): Note {
    // NewNote deliberately omits generated fields; the service owns filling
    // them in before the note crosses the repository boundary.
    // TODO: Save the note before returning it.
    const note: Note = {
      id: this.ids.next(),
      text: draft.text,
      createdAt: this.clock.now(),
    };
    return note;
  }

  list(): readonly Note[] {
    return this.repository.list();
  }
}
