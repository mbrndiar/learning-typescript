import assert from "node:assert/strict";
import test from "node:test";

import {
  findById,
  NoteService,
  toPreviews,
  type Note,
  type NoteRepository,
} from "./solution.ts";

test("generic lookup preserves the entity type", () => {
  const notes: Note[] = [
    { id: "n1", text: "Learn generics", createdAt: "2026-01-01T09:00:00Z" },
  ];
  const found = findById(notes, "n1");

  // Accessing text on the result is the point of the generic: lookup did not
  // erase the more specific Note shape.
  assert.equal(found?.text, "Learn generics");
  assert.equal(findById(notes, "missing"), undefined);
});

test("service uses injected collaborators and saves created notes", () => {
  const saved: Note[] = [];
  // This plain object is a deliberate structural-typing test double; no class
  // or inheritance relationship is required.
  const repository: NoteRepository = {
    save(note): void {
      saved.push(note);
    },
    list(): readonly Note[] {
      return saved;
    },
  };
  const service = new NoteService(
    repository,
    { next: () => "n1" },
    { now: () => "2026-01-01T09:00:00Z" },
  );

  const note = service.create({ text: "Use composition" });

  assert.deepEqual(note, {
    id: "n1",
    text: "Use composition",
    createdAt: "2026-01-01T09:00:00Z",
  });
  assert.deepEqual(service.list(), [note]);
});

test("utility-derived previews expose only selected properties", () => {
  const notes: Note[] = [
    { id: "n1", text: "First", createdAt: "2026-01-01T09:00:00Z" },
    { id: "n2", text: "Second", createdAt: "2026-01-01T10:00:00Z" },
  ];

  // createdAt exists on the source notes, so this scenario guards the preview
  // boundary against leaking fields the type intentionally omits.
  assert.deepEqual(toPreviews(notes), [
    { id: "n1", text: "First" },
    { id: "n2", text: "Second" },
  ]);
});
