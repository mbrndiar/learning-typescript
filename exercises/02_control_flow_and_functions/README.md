# 🧠 Exercise 2: Scores, Loops, and a Counter

Complete three small functions in `exercise.js`.

## 📋 Contract

- `classifyScore(score)` returns `"excellent"` for 90 or more, `"passed"` for
  70 through 89, and `"practice"` otherwise.
- `sumTo(limit)` uses a loop to add every integer from 1 through `limit`. It
  returns `0` when `limit` is below 1.
- `createCounter(start)` returns a closure. Each call increments its private
  count by one and returns the new count.

Keep mutation local to the counter closure.

## ▶️ Run the reference tests

```bash
node --test exercises/02_control_flow_and_functions/solution.test.js
```

To test your work, temporarily import `exercise.js` from the test file and restore
the solution import afterward.
