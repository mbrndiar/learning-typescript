# 🧠 Exercise 5: Model Delivery States

Model an order so that each delivery state carries only the data valid for that
state.

## 📋 Contract

Define and use:

- a `Delivery` discriminated union with `preparing`, `shipped`, and `delivered`
  states;
- an `Order` interface with readonly `id`, `customer`, and `delivery`
  properties plus an optional `note`;
- `describeDelivery`, which narrows every union variant and checks exhaustiveness
  with `never`; and
- `summarizeOrder`, which includes the note only when present.

Expected delivery text:

- `Preparing order`
- `Shipped with tracking TRACK-1`
- `Delivered to Ada` or `Delivered`

## ▶️ Run the feedback

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/05_modeling_valid_data/solution.test.ts
node --import=tsx --test exercises/05_modeling_valid_data/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
