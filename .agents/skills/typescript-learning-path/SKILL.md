---
name: typescript-learning-path
description: Course-owned curriculum map, native checks, and solution boundaries for learning-typescript.
---

# Learning TypeScript learning path

This is the course-owned half of the Learning Mentor integration. The shared
[`guided-learning`](../guided-learning/SKILL.md) skill owns teaching policy,
evidence, state, and review behavior. This skill owns curriculum discovery and
native validation for `learning-typescript`.

The machine-readable authority is [`course.json`](course.json). Do not infer
objective identity from directory numbering; use the stable semantic IDs emitted
by the adapter.

## Adapter

Run from the repository root:

```bash
python3 .agents/skills/typescript-learning-path/scripts/course_adapter.py validate
python3 .agents/skills/typescript-learning-path/scripts/course_adapter.py state-projection
```

The adapter fails closed before state mutation when IDs, prerequisites, paths,
commands, implementation selectors, outcomes, or solution boundaries are invalid.

## Objective checks

Each command explicitly selects the learner implementation. The `env KEY=value`
form is an argument vector, not a shell assignment.

| objective                                    | focused learner check                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `module.javascript-programs-and-values`      | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/01_javascript_programs_and_values/solution.test.js`      |
| `module.control-flow-and-functions`          | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/02_control_flow_and_functions/solution.test.js`          |
| `module.collections-objects-and-modules`     | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/03_collections_objects_and_modules/solution.test.js`     |
| `module.typescript-foundations`              | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/04_typescript_foundations/solution.test.ts`              |
| `module.modeling-valid-data`                 | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/05_modeling_valid_data/solution.test.ts`                 |
| `module.reusable-typed-code`                 | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/06_reusable_typed_code/solution.test.ts`                 |
| `module.errors-files-json-and-packages`      | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/07_errors_files_json_and_packages/solution.test.ts`      |
| `module.testing`                             | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/08_testing/solution.test.ts`                             |
| `module.tooling-debugging-cli-observability` | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/09_tooling_debugging_cli_observability/solution.test.ts` |
| `module.async-and-concurrency`               | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/10_async_and_concurrency/solution.test.ts`               |
| `module.sql-and-sqlite`                      | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/11_sql_and_sqlite/solution.test.ts`                      |
| `module.rest-apis-and-http-clients`          | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/12_rest_apis_and_http_clients/solution.test.ts`          |
| `module.nodejs-runtime`                      | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/13_nodejs_runtime/solution.test.ts`                      |
| `module.deno-runtime`                        | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/14_deno_runtime/solution.test.ts`                        |
| `module.bun-runtime`                         | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/15_bun_runtime/solution.test.ts`                         |
| `module.runtime-portability`                 | `env EXERCISE_IMPLEMENTATION=exercise node --import=tsx --test exercises/16_runtime_portability/solution.test.ts`                 |
| `project.tasks`                              | `env TASKS_IMPLEMENTATION=starter npm run check:tasks:node`                                                                       |
| `capstone.comparative`                       | `env CAPSTONE_IMPLEMENTATION=starter npm run test:capstone:comparative`                                                           |
| `capstone.idiomatic`                         | `env CAPSTONE_IMPLEMENTATION=starter npm run test:capstone:idiomatic:node`                                                        |

## Diagnostics and evidence

- Treat an untouched starter failure as routing information, not completion.
- Record completion only after the focused native check succeeds and the learner
  can explain the result.
- Keep every `solution_paths` entry locked until the objective's
  `solution_unlock_after` attempt threshold is reached.
- Escalate from the focused check to the repository's documented package/full
  verification only after the focused objective is healthy.
