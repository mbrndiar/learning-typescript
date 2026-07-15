# 🧬 4. TypeScript Foundations

## 🎯 Goals

- Explain what TypeScript checks before a program runs.
- Use inference and annotations with strict compiler settings.
- Type primitives, arrays, tuples, parameters, returns, and function values.
- Narrow `unknown` safely and explain why `any` removes protection.
- Migrate a small JavaScript calculation to TypeScript.

## 🔄 From JavaScript to TypeScript

JavaScript accepts this function but does not describe which arguments are valid:

```js
function lineTotal(price, quantity) {
  return price * quantity;
}
```

The migrated version in `01_migrating_javascript.ts` annotates both parameters
and the return value:

```ts
function lineTotal(price: number, quantity: number): number {
  return price * quantity;
}
```

TypeScript still runs as JavaScript. The type checker analyzes the program first
and reports inconsistent uses. This repository enables `strict` mode and several
additional checks in `tsconfig.base.json`, inherited by the runtime-specific
configurations and the root `tsconfig.json`.

## 🛡️ Inference, annotations, and safe boundaries

TypeScript infers obvious local types, so `const course = "TypeScript"` needs no
annotation. Add annotations at boundaries such as function parameters, exported
values, and data structures whose intended shape is not obvious.

`number[]` is an array of numbers. A tuple such as
`readonly [string, number]` has a fixed position for each type. Function types
describe callable values.

Use `unknown` for a value whose type has not been established. Check it with
`typeof`, `instanceof`, or other runtime tests before using it. Avoid `any`
because it turns off useful checking and lets errors travel through the program.

## ▶️ Run the examples

```bash
npm run lesson -- lessons/04_typescript_foundations/01_migrating_javascript.ts
npm run lesson -- lessons/04_typescript_foundations/02_unknown_and_function_types.ts
```

## ⚠️ Common mistakes

- Annotating every local value instead of allowing clear inference.
- Believing a type annotation validates JSON or other runtime input.
- Using `any` to silence an error rather than understanding the value.
- Treating a tuple like an unlimited array.
- Forgetting that TypeScript errors and runtime errors are different feedback.

## ❓ Review questions

1. When can TypeScript infer a type without an annotation?
2. Why annotate function parameters?
3. How does a tuple differ from an array?
4. What must happen before using an `unknown` value?
5. Why is `any` unsafe?

## 🧠 Exercise

Complete [the matching temperature exercise](../../exercises/04_typescript_foundations/README.md).
