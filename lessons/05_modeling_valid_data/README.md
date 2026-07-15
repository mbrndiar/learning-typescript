# 🧬 5. Modeling Valid Data

## 🎯 Goals

- Name object shapes with type aliases and interfaces.
- Combine possibilities with unions and restrict values with literal types.
- Model states with discriminated unions.
- Narrow a union before using state-specific properties.
- Use optional and `readonly` properties deliberately.
- Check exhaustive branches with `never`.

## 🧬 Types that express rules

A type alias can name any type, including a union. An interface names an object
contract and can be extended. Prefer whichever makes the model clearest rather
than treating one as universally better.

Literal types restrict a value to exact possibilities such as `"reader"` or
`"editor"`. A union uses `|` to say that a value may be one of several types.
Optional properties use `?`; they may be absent. `readonly` prevents assignment
through that property after creation.

## 🧬 Discriminated unions and narrowing

A discriminated union gives each variant a common property with a distinct
literal value, often named `kind`, `state`, or `status`. Checking that property
narrows the value, making only the correct variant's properties available.

An exhaustive `switch` can pass its default value to a function accepting
`never`. If a new variant is later added but not handled, TypeScript reports the
missing case.

Types prevent invalid combinations in checked code, but external values still
need runtime validation before becoming trusted domain values.

## ▶️ Run the examples

```bash
npm run lesson -- lessons/05_modeling_valid_data/01_aliases_interfaces_and_unions.ts
npm run lesson -- lessons/05_modeling_valid_data/02_discriminated_unions.ts
```

## ⚠️ Common mistakes

- Making every property optional instead of modeling distinct valid states.
- Using a broad `string` when only a few literal values are valid.
- Reading a union variant's property before narrowing.
- Assuming `readonly` deeply freezes an object at runtime.
- Adding a union variant without updating every exhaustive branch.

## ❓ Review questions

1. What kinds of types can a type alias name?
2. What does an optional property permit?
3. Which property discriminates the example union?
4. How does a condition narrow a union?
5. Why is `never` useful in an exhaustive switch?

## 🧠 Exercise

Complete [the matching delivery exercise](../../exercises/05_modeling_valid_data/README.md).
