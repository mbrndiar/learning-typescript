# 6. Reusable Typed Code

## Goals

- Write generic functions that preserve information about their inputs.
- Add constraints when generic code needs specific properties.
- Derive focused types with utility types.
- Use classes without tightly coupling behavior to concrete dependencies.
- Explain composition, structural typing, dependency injection, and module
  boundaries.

## Generics and utility types

A generic type parameter represents a type chosen by the caller. `T` is a common
name when there is one parameter. A constraint such as `T extends HasId` says the
generic can accept many shapes, but every accepted value must have an `id`.

Utility types transform existing types. `Pick` selects properties, `Omit`
excludes properties, `Partial` makes selected properties optional, and `Readonly`
prevents assignments through the resulting properties. Derive related types when
that keeps one source of truth clear.

## Classes, composition, and boundaries

A class can bundle state and behavior, but it should not automatically create
every dependency it uses. Composition builds behavior from smaller collaborators.
Dependency injection supplies those collaborators from outside, usually through a
constructor.

TypeScript uses structural typing: a value is compatible when it has the required
shape, even if it never declared that it implements the interface. This makes
small test doubles and interchangeable adapters straightforward.

Interfaces at module boundaries let domain behavior depend on capabilities such
as `save` or `write`, not on files, databases, or network clients. Keep boundaries
small and pass dependencies explicitly.

## Run the examples

```bash
npm run lesson -- lessons/06_reusable_typed_code/01_generics_and_utility_types.ts
npm run lesson -- lessons/06_reusable_typed_code/02_classes_composition_and_injection.ts
```

## Common mistakes

- Adding a generic parameter that does not connect inputs to outputs.
- Using an unsafe assertion instead of expressing a generic constraint.
- Making an interface much larger than its consumer needs.
- Constructing concrete dependencies inside domain classes.
- Choosing inheritance when composition of small capabilities is clearer.

## Review questions

1. What information does a generic function preserve?
2. Why might a generic need an `extends` constraint?
3. What does `Pick<Product, "id" | "name">` produce?
4. What makes TypeScript structurally typed?
5. How does dependency injection improve testing and replacement of adapters?

## Exercise

Complete [the matching note service exercise](../../exercises/06_reusable_typed_code/README.md).
