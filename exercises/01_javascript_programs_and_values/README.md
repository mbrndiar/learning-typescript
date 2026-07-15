# Exercise 1: Purchase Summary

Practice primitive values, explicit conversion, arithmetic, strings, and strict
equality by completing `buildPurchaseSummary` in `exercise.js`.

## Contract

The function receives:

1. an item name;
2. a numeric unit price; and
3. a quantity written as text.

Convert the quantity with `Number`, calculate the total, and return this exact
shape:

```text
3 × Pen at $2.50 = $7.50
```

Use `toFixed(2)` for both prices. Do not read the reference solution until you
have made an attempt.

## Run the reference tests

The repository test suite imports `solution.js`:

```bash
node --test exercises/01_javascript_programs_and_values/solution.test.js
```

To check your starter implementation instead, temporarily change the test import
locally from `solution.js` to `exercise.js`, then restore it before committing.
