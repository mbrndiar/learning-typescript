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

  assert.equal(found?.text, "Learn generics");
  assert.equal(findById(notes, "missing"), undefined);
});

test("service uses injected collaborators and saves created notes", () => {
  const saved: Note[] = [];
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

  assert.deepEqual(toPreviews(notes), [
    { id: "n1", text: "First" },
    { id: "n2", text: "Second" },
  ]);
});
