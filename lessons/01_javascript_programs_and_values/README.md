# 🧱 1. JavaScript Programs and Values

## 🎯 Goals

- Run a JavaScript file with Node.js and display output.
- Use `const` for stable bindings and `let` for changing bindings.
- Recognize primitive values and use arithmetic, comparison, and logical operators.
- Build strings, convert values deliberately, and compare with strict equality.

## 🧱 Programs, bindings, and values

A program is a text file containing instructions. Node.js reads the file from top
to bottom. `console.log` displays a value so that you can observe what the program
did.

Use `const` when a name will keep referring to the same value. Use `let` when the
program must assign a new value later. JavaScript primitives include strings,
numbers, booleans, `undefined`, `null`, big integers, and symbols. This module
focuses on the first five.

Operators combine values. `+`, `-`, `*`, and `/` perform arithmetic; comparison
operators produce booleans; and template literals use backticks to place values
inside strings. Parentheses make the intended order of operations clear.

JavaScript sometimes converts values automatically, but explicit conversions are
easier to understand. Use `Number(value)`, `String(value)`, or `Boolean(value)`.
Prefer `===` and `!==` so comparison does not perform surprising conversions.

## ▶️ Run the examples

From the repository root:

```bash
node lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
node lessons/01_javascript_programs_and_values/02_operators_strings_and_conversions.js
```

Before each run, predict every displayed line.

## ⚠️ Common mistakes

- Using `let` for every binding instead of starting with `const`.
- Putting numeric text such as `"5"` into arithmetic without converting it.
- Using `==` when strict equality (`===`) communicates the intent.
- Forgetting that `+` joins strings when either operand is a string.
- Expecting `typeof null` to say `"null"`; this historical quirk returns
  `"object"`.

## ❓ Review questions

1. What is the difference between a value and a binding?
2. When is `let` necessary?
3. What type of value does a comparison produce?
4. Why is `Number("5") + 1` different from `"5" + 1`?
5. Why should new code normally prefer `===` to `==`?

## 🧠 Exercise

Complete [the matching purchase summary exercise](../../exercises/01_javascript_programs_and_values/README.md).
