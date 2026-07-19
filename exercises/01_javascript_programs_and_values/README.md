# 🧠 Exercise 1: Purchase Summary

Practice primitive values, explicit conversion, arithmetic, strings, and strict
equality by completing `buildPurchaseSummary` in `exercise.js`.

## 📋 Contract

The exported function is fixed harness scaffolding for this first exercise. Its
body receives:

1. an item name;
2. a unit price as an integer number of cents; and
3. a quantity written as text.

Convert the quantity with `Number`, keep the multiplication in exact integer
cents, and divide by 100 only when formatting this exact shape:

```text
3 × Pen at $2.50 = $7.50
```

Use `toFixed(2)` for both displayed prices. Do not read the reference solution
until you have made an attempt.

## ▶️ Run the feedback

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --test exercises/01_javascript_programs_and_values/solution.test.js
node --test exercises/01_javascript_programs_and_values/solution.test.js
```

The first command selects your starter. The second runs the same contract against
the reference solution. The exported function is fixed test-harness scaffolding;
functions and modules are taught in Modules 2 and 3, so in this exercise change
only the function body.
