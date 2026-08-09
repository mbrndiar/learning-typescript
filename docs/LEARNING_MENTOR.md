# Learning Mentor

The optional Learning Mentor is an evidence-based guide for this course. It
selects prerequisite-valid objectives, schedules reviews, runs focused checks,
and keeps reference solutions out of sight until you have made a genuine
attempt. Every lesson, exercise, project, and capstone also works without it.

## Prerequisites

1. Clone recursively, or initialize the pinned mentor after an ordinary clone:

   ```sh
   git submodule update --init --recursive
   ```

2. Install and authenticate at least one supported client:
   [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli),
   [OpenAI Codex](https://developers.openai.com/codex/cli), or
   [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview).
3. Run the client from the repository root so it discovers the project agent,
   shared guided-learning skill, and TypeScript learning path.
4. When using a local toolchain, provide Python 3.11 or newer as `python3` in
   addition to Node.js, Deno, and Bun. Python is mentor infrastructure; no
   JavaScript or TypeScript lesson depends on it. The course containers already
   include Python.

The integration uses relative Git symlinks. Linux, macOS, and WSL are supported.
A native Windows checkout with `core.symlinks=false` turns those links into
plain text files and cannot discover the mentor; use WSL instead.

## Start the mentor

### GitHub Copilot CLI

Start with the repository agent already selected:

```sh
copilot --agent learning-mentor
```

Alternatively, start `copilot` and select it interactively:

```text
/agent learning-mentor
```

### Claude Code

```sh
claude --agent learning-mentor
```

### OpenAI Codex

Codex project custom agents are delegated subagents rather than a CLI
`--agent` selection. Start `codex` from the repository root, then ask:

```text
Delegate this tutoring session to the project custom agent learning-mentor.
```

The canonical agent, shared skill, TypeScript learning path, state rules, and
solution locks are the same in all three clients.

## Tooling environment

The mentor runs the exact Node.js, Deno, Bun, and npm commands declared by the
course manifest. Those commands must be available in the environment where the
agent executes tools.

- With the local-toolchain setup, run the client on the host.
- With a VS Code Dev Container, run the agent integration inside that container.
- `scripts/course-container` supplies course tooling but does not install an AI
  client or automatically redirect a host-side mentor's commands into Docker.

If the mentor cannot reach a required runtime, it can still explain course
material but must report deterministic evaluation as unavailable rather than
recording a pass.

## Who does what

| You                                                  | The mentor                                              |
| ---------------------------------------------------- | ------------------------------------------------------- |
| Start the client and select `learning-mentor`        | Validate the pinned integration and course graph        |
| Read, predict, explain, and edit learner-owned files | Select due reviews and prerequisite-valid objectives    |
| Approve narrowly scoped tool operations              | Inspect your diff and run focused checks                |
| Explicitly request exceptional edits or Git actions  | Stay read-only unless that exact operation is requested |

You do not need to invoke the internal state helper or course adapter during a
normal tutoring session.

## Progress and privacy

The state database records course identity, the observed Git commit, attempts,
practice and mastery evidence, scheduled reviews, and solution unlocks. It does
not belong in the repository and is never committed or pushed.

The effective location depends on where the mentor process runs:

- Native client: `$XDG_DATA_HOME/learning-mentor/state.sqlite3`, falling back to
  `~/.local/share/learning-mentor/state.sqlite3`.
- Client inside the course container or Dev Container: the same path inside the
  container, backed by the `learning-mentor-state` Docker volume.

Running a host client while using `scripts/course-container` for course commands
still uses the host database. The named Docker volume is used only by a mentor
process running inside that container environment.

State is local to that host or Docker volume and is not currently transferred
between machines. After `HEAD` changes, the mentor validates and initializes
the new course version before reading or recording progress. Stable objective
IDs carry mastery and review history forward; attempts remain evidence on their
original commit, and solution unlocks are commit-specific.

## Solution locks and learner ownership

The lock is teaching policy, not filesystem access control. Until the matching
focused check passes or the configured number of genuine attempts is recorded,
the mentor will not read, execute, quote, or summarize the reference solution.

Hands-on changes remain yours. The mentor proposes a minimal diff only when you
request help and applies it only after confirmation. It never discards, resets,
stashes, commits, or pushes learner work without exact authorization.

## Troubleshooting

Validate the course integration with:

```sh
python3 .agents/skills/typescript-learning-path/scripts/course_adapter.py validate
```

A healthy integration prints JSON containing `"status":"valid"` and exits
zero. If the submodule is missing, run
`git submodule update --init --recursive`. If discovery links are plain text
files on Windows, use a WSL checkout with Git symlinks enabled.
