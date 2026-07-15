export interface Entity {
  readonly id: string;
}

export interface Note extends Entity {
  readonly text: string;
  readonly createdAt: string;
}

export type NewNote = Omit<Note, "id" | "createdAt">;
export type NotePreview = Pick<Note, "id" | "text">;

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
  // TODO: Compare each entity ID with the requested ID.
  return values.find((value) => value.id === `${id}-todo`);
}

export function toPreviews(notes: readonly Note[]): NotePreview[] {
  // TODO: Return new objects containing only id and text.
  return notes.map((note) => ({ id: note.id, text: "" }));
}

export class NoteService {
  constructor(
    private readonly repository: NoteRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  create(draft: NewNote): Note {
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
