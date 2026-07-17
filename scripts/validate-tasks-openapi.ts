import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { compileErrors, parse, validate } from "@readme/openapi-parser";

const FILE = "projects/tasks/docs/openapi.yaml";
const CANONICAL_SHA256 =
  "09e3e6c08fc92dd10bd3c621dbc30e720f05b8684a314fa940b2daed0f7bd44c";

type JsonRecord = Readonly<Record<string, unknown>>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): JsonRecord {
  assert(isRecord(value), `${label} must be an object`);
  return value;
}

function property(value: JsonRecord, key: string, label: string): unknown {
  assert(Object.hasOwn(value, key), `${label} must define ${key}`);
  return value[key];
}

function operation(paths: JsonRecord, pathname: string, method: string): JsonRecord {
  return record(
    property(record(property(paths, pathname, "paths"), pathname), method, pathname),
    `${method.toUpperCase()} ${pathname}`,
  );
}

function assertResponseStatuses(
  paths: JsonRecord,
  pathname: string,
  method: string,
  expected: readonly string[],
): void {
  const responses = record(
    property(operation(paths, pathname, method), "responses", `${method} ${pathname}`),
    `${method} ${pathname} responses`,
  );
  assert(
    JSON.stringify(Object.keys(responses).sort()) ===
      JSON.stringify([...expected].sort()),
    `${method.toUpperCase()} ${pathname} must declare exactly ${expected.join(", ")} responses`,
  );
}

function assertErrorResponse(components: JsonRecord, name: string): void {
  const responses = record(
    property(components, "responses", "components"),
    "responses",
  );
  const response = record(property(responses, name, "responses"), `${name} response`);
  const content = record(
    property(response, "content", `${name} response`),
    `${name} content`,
  );
  const json = record(
    property(content, "application/json", `${name} content`),
    `${name} JSON content`,
  );
  const schema = record(
    property(json, "schema", `${name} JSON content`),
    `${name} schema`,
  );
  assert(
    schema.$ref === "#/components/schemas/Error",
    `${name} must use the shared Error response shape`,
  );
}

const source = await readFile(FILE);
const actualHash = createHash("sha256").update(source).digest("hex");
assert(
  actualHash === CANONICAL_SHA256,
  `${FILE} changed from its canonical byte identity`,
);

const validation = await validate(FILE);
if (!validation.valid) {
  throw new Error(compileErrors(validation));
}

const document = record(await parse(FILE), "OpenAPI document");
assert(document.openapi === "3.1.0", "OpenAPI document must use version 3.1.0");

const paths = record(property(document, "paths", "OpenAPI document"), "paths");
assertResponseStatuses(paths, "/health", "get", ["200", "405", "500"]);
assertResponseStatuses(paths, "/tasks", "get", ["200", "405", "422", "500"]);
assertResponseStatuses(paths, "/tasks", "post", ["201", "400", "405", "422", "500"]);
assertResponseStatuses(paths, "/tasks/{taskId}", "get", [
  "200",
  "404",
  "405",
  "422",
  "500",
]);
assertResponseStatuses(paths, "/tasks/{taskId}", "patch", [
  "200",
  "400",
  "404",
  "405",
  "422",
  "500",
]);
assertResponseStatuses(paths, "/tasks/{taskId}", "delete", [
  "204",
  "404",
  "405",
  "422",
  "500",
]);

const deleteResponses = record(
  property(
    operation(paths, "/tasks/{taskId}", "delete"),
    "responses",
    "DELETE /tasks/{taskId}",
  ),
  "DELETE /tasks/{taskId} responses",
);
const noContent = record(
  property(deleteResponses, "204", "DELETE responses"),
  "204 response",
);
assert(!Object.hasOwn(noContent, "content"), "204 response must not declare a body");

const components = record(
  property(document, "components", "OpenAPI document"),
  "components",
);
for (const response of [
  "InvalidJson",
  "NotFound",
  "MethodNotAllowed",
  "ValidationError",
  "InternalError",
]) {
  assertErrorResponse(components, response);
}

console.log("Tasks OpenAPI 3.1 validation passed");
