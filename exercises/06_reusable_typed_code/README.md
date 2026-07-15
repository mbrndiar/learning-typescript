# 🧠 Exercise 6: Injected Note Service

Build reusable typed code around a small note domain.

## 📋 Contract

- `findById<T extends Entity>` preserves the specific item type while requiring
  an `id`.
- `NewNote` uses `Omit` to derive the input accepted when creating a note.
- `NotePreview` uses `Pick` for a smaller read model.
- `NoteRepository`, `IdGenerator`, and `Clock` are narrow module-boundary
  interfaces.
- `NoteService` receives those dependencies through its constructor. `create`
  builds, saves, and returns a note.
- `toPreviews` returns only each note's `id` and `text`.

The tests intentionally inject plain objects. Structural typing makes them
compatible without inheritance or a framework.

## ▶️ Run the reference tests

```bash
node --import=tsx --test exercises/06_reusable_typed_code/solution.test.ts
```

Temporarily import `exercise.ts` while implementing your version.
