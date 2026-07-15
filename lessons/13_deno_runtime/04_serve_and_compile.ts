export function route(request: Request): Response {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return Response.json({ status: "ok" });
  }
  if (request.method === "POST" && url.pathname === "/echo") {
    return new Response(request.body, {
      status: 200,
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/octet-stream",
      },
    });
  }
  return Response.json({ error: "not found" }, { status: 404 });
}

export const compileConcepts = [
  "deno compile embeds the runtime and module graph in a standalone executable",
  "permissions passed to deno compile become permissions requested by the executable",
  "cross-compilation uses --target and may download the target runtime on first use",
] as const;

export const nodeCompatibilityNotes = [
  "Node compatibility example (not native): node:http can run through Deno's compatibility layer",
  "Deno-native HTTP uses Deno.serve with Web Request and Response objects",
] as const;

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
    controller.abort();
    await server.finished;
  }
}

if (import.meta.main) {
  console.log(await runLocalServerDemo());
  console.log(compileConcepts.join("\n"));
  console.log(nodeCompatibilityNotes.join("\n"));
}
