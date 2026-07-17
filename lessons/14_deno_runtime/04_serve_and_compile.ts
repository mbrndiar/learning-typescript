// Deno.serve uses Web Request and Response objects, which makes handlers easy
// to test without a socket and portable across Web-standard runtimes.
// Server lifecycle and permissions stay outside this pure route function.
export function route(request: Request): Response {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return Response.json({ status: "ok" });
  }
  if (request.method === "POST" && url.pathname === "/echo") {
    // Returning the original body preserves streaming behavior instead of
    // buffering an arbitrary upload before responding.
    return new Response(request.body, {
      status: 200,
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/octet-stream",
      },
    });
  }
  return Response.json({ error: "not found" }, { status: 404 });
}

// Compiled executables carry both code and requested authority, so
// permissions are part of the distribution contract.
export const compileConcepts = [
  "deno compile embeds the runtime and module graph in a standalone executable",
  "permissions passed to deno compile become permissions requested by the executable",
  "cross-compilation uses --target and may download the target runtime on first use",
] as const;

export const nodeCompatibilityNotes = [
  "Node compatibility example (not native): node:http can run through Deno's compatibility layer",
  "Deno-native HTTP uses Deno.serve with Web Request and Response objects",
] as const;

// Binding loopback and port 0 avoids exposing the lesson on the network or
// colliding with a fixed local port.
export async function runLocalServerDemo(): Promise<string> {
  const controller = new AbortController();
  const server = Deno.serve(
    {
      hostname: "127.0.0.1",
      port: 0,
      signal: controller.signal,
      onListen: () => undefined,
    },
    route,
  );

  try {
    const address = server.addr;
    if (address.transport !== "tcp") {
      throw new Error("expected a TCP listener");
    }
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const value = await response.json() as { status: string };
    return `${response.status}:${value.status}`;
  } finally {
    // Abort plus server.finished gives tests a deterministic shutdown point
    // and satisfies Deno's resource sanitizer.
    controller.abort();
    await server.finished;
  }
}

if (import.meta.main) {
  console.log(await runLocalServerDemo());
  console.log(compileConcepts.join("\n"));
  console.log(nodeCompatibilityNotes.join("\n"));
}
