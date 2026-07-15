# 🧺 3. Collections, Objects, and Modules

## 🎯 Goals

- Store ordered values in arrays and named values in objects.
- Use `Map` for keyed data and `Set` for unique data.
- Read values with destructuring and copy values with spread.
- Accept multiple arguments with rest and iterate over collections.
- Export and import ES module values with explicit file extensions.
- throw and catch `Error` objects when an operation cannot continue.

## 🧺 Choosing a collection

Arrays store values in order and use zero-based numeric indexes. Objects group
named properties. `Map` accepts keys of any type and provides explicit keyed
operations. `Set` keeps each value only once.

Destructuring gives selected entries or properties local names. Spread (`...`)
copies entries into a new array or object. Rest also uses `...`, but gathers
remaining function arguments or destructured values.

`for...of` visits iterable values without managing an index. Array methods such
as `map`, `filter`, and `reduce` are useful when their names match the operation.

## 🗂️ Modules and errors

An ES module exports values that another module imports. Local import specifiers
include the `.js` extension because that is the file Node.js executes.

Throw an `Error` when a function cannot fulfill its contract. Catch an error only
when the current code can recover, add useful context, or present it at a program
boundary. Preserve the original message instead of silently ignoring failures.

The second example imports the first example. Importing evaluates the imported
module once, so its demonstration output appears before the second file's output.

## ▶️ Run the examples

```bash
node lessons/03_collections_objects_and_modules/01_collections_and_objects.js
node lessons/03_collections_objects_and_modules/02_modules_and_errors.js
```

## ⚠️ Common mistakes

- Reading an array index that does not exist and receiving `undefined`.
- Mutating an original array or object when a copy was intended.
- Using an object when `Map` operations better express keyed data.
- Omitting the extension from a local ES module import.
- Throwing strings instead of `Error` objects or catching and ignoring errors.

## ❓ Review questions

1. When would you choose a `Set` instead of an array?
2. What does array index `0` mean?
3. How do spread and rest differ?
4. Why does a local import include `.js`?
5. When should a function throw an error?

## 🧠 Exercise

Complete [the matching catalog exercise](../../exercises/03_collections_objects_and_modules/README.md).
