// Deno starts with no file, environment, or subprocess authority. This lesson
// keeps each capability narrow so failures explain missing permissions instead
// of accidentally succeeding with ambient access.
const encoder = new TextEncoder();

function parentDirectory(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index < 0 ? "." : path.slice(0, index) || "/";
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function removeIfPresent(path: string, options?: Deno.RemoveOptions): Promise<void> {
  try {
    await Deno.remove(path, options);
  } catch (error: unknown) {
    if (!hasCode(error, "ENOENT")) {
      throw error;
    }
  }
}

// Write-then-rename prevents readers from seeing a half-written file. The
// temporary file is private and removed even when replacement fails.
export async function atomicWriteText(path: string, text: string): Promise<void> {
  await Deno.mkdir(parentDirectory(path), { recursive: true });
  const temporary = `${path}.${Deno.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await Deno.writeFile(temporary, encoder.encode(text), { createNew: true, mode: 0o600 });
    await Deno.rename(temporary, path);
  } finally {
    await removeIfPresent(temporary);
  }
}

// Querying permissions is non-interactive, so examples can run in CI without
// accidentally prompting for broader authority.
export async function permissionStates(
  path: string,
): Promise<Record<string, "granted" | "denied" | "prompt">> {
  const entries = await Promise.all([
    Deno.permissions.query({ name: "read", path }),
    Deno.permissions.query({ name: "write", path }),
    Deno.permissions.query({ name: "env", variable: "DENO_COURSE_DIR" }),
    Deno.permissions.query({ name: "run", command: Deno.execPath() }),
  ]);
  return {
    read: entries[0].state,
    write: entries[1].state,
    env: entries[2].state,
    run: entries[3].state,
  };
}

export async function runNativeApiDemo(directory: string): Promise<readonly string[]> {
  const file = `${directory}/permissions.json`;
  await atomicWriteText(file, `${JSON.stringify({ runtime: "deno", secureByDefault: true })}\n`);
  const stored = JSON.parse(await Deno.readTextFile(file)) as { runtime: string };

  // The subprocess grant is scoped to the Deno executable; piping output keeps
  // the child result explicit instead of inheriting terminal state.
  const command = new Deno.Command(Deno.execPath(), {
    args: ["eval", 'console.log("child-ok")'],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    throw new Error(new TextDecoder().decode(output.stderr).trim() || "child command failed");
  }

  return [
    `file=${stored.runtime}`,
    `env=${Deno.env.get("DENO_COURSE_DIR") ?? "unset"}`,
    `command=${new TextDecoder().decode(output.stdout).trim()}`,
  ];
}

if (import.meta.main) {
  const directory = Deno.env.get("DENO_COURSE_DIR") ??
    "lessons/14_deno_runtime/.lesson-data";
  try {
    console.log((await runNativeApiDemo(directory)).join("\n"));
    console.log(JSON.stringify(await permissionStates(directory)));
  } finally {
    await removeIfPresent(directory, { recursive: true });
  }
}
