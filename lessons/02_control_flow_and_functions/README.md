# 🧩 2. Control Flow and Functions

## 🎯 Goals

- Choose which statements run with conditions.
- Repeat work with `for` and `while` loops.
- Define functions with parameters and return values.
- Explain block and function scope.
- Use a closure and distinguish local mutation from reassignment elsewhere.

## 🔀 Decisions and repetition

An `if` statement runs a block only when its condition is truthy. Add `else if`
and `else` for alternatives. Keep conditions readable and avoid deeply nested
branches.

A `for` loop is useful when the number of repetitions is known. A `while` loop
continues while a condition remains true, so its body must make progress toward
stopping.

## 🧩 Functions, scope, and closures

A function groups reusable behavior. Parameters are local names that receive
arguments from a call. `return` sends a value back to the caller and immediately
ends that call.

Bindings declared inside braces with `const` or `let` have block scope. A
function cannot expose its local bindings directly. A closure is a function that
continues to access bindings from the surrounding function after that surrounding
call has returned.

Mutation changes existing state, such as incrementing a counter. It is useful but
should have a small, clear owner. Pure functions that only calculate and return a
result are often easier to test.

## ▶️ Run the examples

```bash
node lessons/02_control_flow_and_functions/01_conditions_and_loops.js
node lessons/02_control_flow_and_functions/02_functions_scope_and_closures.js
```

## ⚠️ Common mistakes

- Writing `=` (assignment) when a condition needs `===` (comparison).
- Creating a `while` loop whose condition never becomes false.
- Forgetting `return`, which makes a function produce `undefined`.
- Trying to use a block-scoped binding outside its braces.
- Mutating shared state when a returned value would be clearer.

## ❓ Review questions

1. When does an `else` block run?
2. What must a well-behaved `while` loop eventually do?
3. How are a parameter and an argument related?
4. What happens after a function reaches `return`?
5. Which binding does the counter closure remember?

## 🧠 Exercise

Complete [the matching control flow exercise](../../exercises/02_control_flow_and_functions/README.md).
