# 🧱 1. JavaScript Programs and Values

## 🎯 Goals

- Run a JavaScript file with Node.js and display output.
- Use `const` for stable bindings and `let` for changing bindings.
- Recognize primitive values and use arithmetic, comparison, and logical operators.
- Build strings, convert values deliberately, and compare with strict equality.
- Explain floating-point approximation, safe integers, and when `bigint` is needed.

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

## 🔢 The numeric model

JavaScript's `number` is an IEEE 754 binary64 floating-point value. One type
represents integers and fractions, but many decimal fractions are only
approximations in binary:

```javascript
0.1 + 0.2 === 0.3; // false
Number.isSafeInteger(9_007_199_254_740_991); // true
```

Integers are exact only from `Number.MIN_SAFE_INTEGER` through
`Number.MAX_SAFE_INTEGER` (±(2^53 - 1)). Validate IDs, counters, and database
integers with `Number.isSafeInteger` before relying on exact arithmetic. Represent
money as integer minor units such as cents while it remains in that safe range,
then format it only at the display boundary.

`bigint` represents arbitrarily large integers exactly (`9_007_199_254_740_992n`),
but arithmetic cannot mix it directly with `number`, it does not represent
fractions, and it is not accepted by `JSON.stringify`. Choose the representation
at the I/O boundary rather than converting after precision has already been lost.

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
- Using binary floating-point for money or assuming every integer is exact.
- Expecting `typeof null` to say `"null"`; this historical quirk returns
  `"object"`.

## ❓ Review questions

1. What is the difference between a value and a binding?
2. When is `let` necessary?
3. What type of value does a comparison produce?
4. Why is `Number("5") + 1` different from `"5" + 1`?
5. Why should new code normally prefer `===` to `==`?
6. Why are integer cents safer than repeated decimal arithmetic for money?
7. What boundary separates safe `number` integers from values that need `bigint`
   or another representation?

## 🧠 Exercise

Complete [the matching purchase summary exercise](../../exercises/01_javascript_programs_and_values/README.md).
