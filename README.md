# <img src="docs/assets/typescript-logo.svg" alt="TypeScript logo" height="32"> Learning TypeScript

A hands-on introduction to JavaScript, TypeScript, and server-side runtime
programming. The course starts with JavaScript foundations, uses strict
TypeScript with Node.js, and then explores Deno, Bun, and cross-runtime design.
No previous JavaScript or TypeScript experience is required.

## What you will learn

- Write, run, debug, and test modern JavaScript and TypeScript.
- Model valid data and validate untrusted values at application boundaries.
- Work with files, processes, asynchronous code, SQL, HTTP, and structured logs.
- Use native Node.js, Deno, and Bun tooling deliberately.
- Build one domain behind multiple runtime adapters and prove portability.

## Get started

### 1. Clone the course

Git is required for every setup. The recursive clone also initializes Learning
Mentor:

```sh
git clone --recurse-submodules https://github.com/mbrndiar/learning-typescript.git
cd learning-typescript
```

### 2. Choose one tooling setup

#### A. Use the prebuilt container — recommended

Install Docker, then run the course in the image already built and validated by
CI. You do not need Node.js, Deno, or Bun on the host:

```sh
scripts/course-container node \
  lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
```

#### B. Build the container locally

Install Docker and build the image from this checkout. This takes longer the
first time but does not depend on a published course image:

```sh
scripts/course-container --build node \
  lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
```

Docker reuses its build cache on later runs. Re-run the same command whenever
you want to rebuild the local image.

#### C. Install the tooling locally

The recommended native path uses the repository's locked mise toolchain. Mise
installs the runtimes; npm still installs the course dependencies:

```sh
mise install
npm install
node \
  lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
```

For the manual path, install Node.js 24 or 26, Deno 2.9.3, and Bun 1.3.14.
Then install the same pinned dependencies and run the lesson directly:

```sh
node --version
deno --version
bun --version
npm install
node lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
```

`node` is the runtime and the remaining path is the JavaScript file it executes.
When present, `scripts/course-container` runs that same command inside the
selected course image. The first `npm install` may download dependencies and
print substantial setup output; later runs reuse the installed packages.

See the [setup guide](docs/SETUP.md) for installing mise, complete manual
installation steps, supported versions, VS Code Dev Containers, image tags,
caches, and troubleshooting. If programming syntax is entirely new, also use the
[beginner guide](docs/BEGINNER_GUIDE.md).

### 3. Continue with TypeScript

Run a TypeScript lesson through the repository's pinned `tsx` dependency:

```sh
npm run lesson -- lessons/04_typescript_foundations/01_migrating_javascript.ts
```

`npm run lesson` invokes the repository's pinned `lesson` script, which uses
`tsx` to execute full TypeScript syntax. The `--` forwards the following file
path to that script rather than treating it as an npm option.

Inside a container, run the same command after opening a shell with
`scripts/course-container`, or prefix it with `scripts/course-container`.

## Study loop

For each module:

1. Read its README and predict each example's output or failure.
2. Run the examples, change one value, and explain the difference.
3. Answer the review questions without looking back.
4. Complete the matching starter exercise.
5. Run the smallest relevant test, then the wider feedback loop.
6. Compare with the reference solution only after a serious attempt.

## Course outline

1. [JavaScript Programs and Values](lessons/01_javascript_programs_and_values/)
2. [Control Flow and Functions](lessons/02_control_flow_and_functions/)
3. [Collections, Objects, and Modules](lessons/03_collections_objects_and_modules/)
4. [TypeScript Foundations](lessons/04_typescript_foundations/)
5. [Modeling Valid Data](lessons/05_modeling_valid_data/)
6. [Reusable Typed Code](lessons/06_reusable_typed_code/)
7. [Errors, Files, JSON, and Packages](lessons/07_errors_files_json_and_packages/)
8. [Testing](lessons/08_testing/)
9. [Tooling, Debugging, CLI, and Observability](lessons/09_tooling_debugging_cli_observability/)
10. [Asynchronous JavaScript and Concurrency](lessons/10_async_and_concurrency/)
11. [SQL and SQLite](lessons/11_sql_and_sqlite/)
12. [REST APIs and HTTP Clients](lessons/12_rest_apis_and_http_clients/)
13. [Node.js Runtime Deep Dive](lessons/13_nodejs_runtime/)
14. [Deno Runtime Deep Dive](lessons/14_deno_runtime/)
15. [Bun Runtime Deep Dive](lessons/15_bun_runtime/)
16. [Cross-Runtime Portability and Migration](lessons/16_runtime_portability/)

Then complete the [Task REST API applied project](projects/tasks/README.md)
before selecting a [capstone](capstones/README.md).

## Development checks

Run the lesson or focused test connected to your change. The complete Node.js,
Deno, Bun, coverage, portability, project, and interoperability commands are in
[the setup guide](docs/SETUP.md#essential-commands).

## How JavaScript and TypeScript code run and ship

JavaScript runs directly in a runtime such as Node.js, Deno, or Bun. TypeScript
must first be stripped or compiled to JavaScript, or be executed by a runtime or
loader that performs that transformation. Deployment therefore needs the
chosen runtime plus application dependencies; browsers provide their own
JavaScript runtime. A server-side container can package the runtime, compiled
output or source, dependencies, and OS-level tools together.

## Optional Learning Mentor

The repository includes an optional Learning Mentor for GitHub Copilot CLI,
OpenAI Codex, and Claude Code. It follows course prerequisites, schedules
reviews, protects locked solutions, and records evidence without taking
ownership of your work. See the [Learning Mentor guide](docs/LEARNING_MENTOR.md)
for setup, launch commands, state storage, container boundaries, and transfer
between machines.

## Course resources

- [Setup and troubleshooting](docs/SETUP.md)
- [Learning Mentor](docs/LEARNING_MENTOR.md)
- [Beginner guide](docs/BEGINNER_GUIDE.md)
- [Exercise index](exercises/README.md)
- [Applied project](projects/tasks/README.md)
- [Capstone guide](capstones/README.md)
- [Runtime portability guide](docs/RUNTIME_PORTABILITY.md)
- [Cheat sheet](CHEATSHEET.md)

Starter files contain guided TODOs and behavioral tests. Reference solutions
demonstrate one clear approach; different code is valid when it satisfies the
documented contract.
