import { invalidArgumentError, invalidJsonError, invalidValueError } from "./errors.ts";

export const MAX_SAFE_REVISION = 9_007_199_254_740_991;
export const MAX_VALUE_BYTES = 65_536;
export const MAX_CONTAINER_DEPTH = 32;

export type JsonValue =
  | null
  | boolean
  | string
  | number
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type SetExpectation =
  | { readonly kind: "any" }
  | { readonly kind: "absent" }
  | { readonly kind: "exact"; readonly revision: number };

export type DeleteExpectation =
  { readonly kind: "any" } | { readonly kind: "exact"; readonly revision: number };

type RawValue =
  | { readonly kind: "null" }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "number"; readonly token: string }
  | { readonly kind: "array"; readonly values: RawValue[] }
  | {
      readonly kind: "object";
      readonly members: Array<readonly [name: string, value: RawValue]>;
    };

type ArrayFrame = {
  readonly kind: "array";
  readonly node: Extract<RawValue, { kind: "array" }>;
  state: "first" | "value" | "comma";
};

type ObjectFrame = {
  readonly kind: "object";
  readonly node: Extract<RawValue, { kind: "object" }>;
  state: "first" | "key" | "colon" | "value" | "comma";
  name?: string;
};

type Frame = ArrayFrame | ObjectFrame;

export function validateKey(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(value)) {
    throw invalidArgumentError("key", "format");
  }
  return value;
}

export function parseSetExpectation(value: string | undefined): SetExpectation {
  if (value === undefined || value === "any") {
    return { kind: "any" };
  }
  if (value === "absent") {
    return { kind: "absent" };
  }
  return { kind: "exact", revision: parseExactRevision(value) };
}

export function parseDeleteExpectation(value: string | undefined): DeleteExpectation {
  if (value === undefined || value === "any") {
    return { kind: "any" };
  }
  return { kind: "exact", revision: parseExactRevision(value) };
}

export function parseExactRevision(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw invalidArgumentError("expect", "format");
  }
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision > MAX_SAFE_REVISION) {
    throw invalidArgumentError("expect", "format");
  }
  return revision;
}

export function parseRestrictedJson(input: string): JsonValue {
  return parseJson(input, false);
}

export function parseStoredJson(input: string): JsonValue {
  return parseJson(input, true);
}

function parseJson(input: string, requireNormalized: boolean): JsonValue {
  if (Buffer.byteLength(input, "utf8") > MAX_VALUE_BYTES) {
    throw invalidValueError("byte_limit");
  }

  try {
    JSON.parse(input);
  } catch {
    throw invalidJsonError();
  }

  const parser = new RawJsonParser(input);
  const raw = parser.parse();
  const metadata = { normalized: !parser.sawWhitespace };
  const value = normalizeValue(raw, 0, metadata);
  if (requireNormalized && !metadata.normalized) {
    throw invalidValueError("not_normalized");
  }
  return value;
}

class RawJsonParser {
  private position = 0;
  private readonly frames: Frame[] = [];
  sawWhitespace = false;

  constructor(private readonly input: string) {}

  parse(): RawValue {
    let completed = this.startValue();
    let root: RawValue | undefined;

    while (root === undefined) {
      if (completed !== undefined) {
        const parent = this.frames.at(-1);
        if (parent === undefined) {
          root = completed;
          break;
        }
        if (parent.kind === "array" && parent.state === "value") {
          parent.node.values.push(completed);
          parent.state = "comma";
          completed = undefined;
          continue;
        }
        if (
          parent.kind === "object" &&
          parent.state === "value" &&
          parent.name !== undefined
        ) {
          parent.node.members.push([parent.name, completed]);
          delete parent.name;
          parent.state = "comma";
          completed = undefined;
          continue;
        }
        throw invalidJsonError();
      }

      const frame = this.frames.at(-1);
      if (frame === undefined) {
        throw invalidJsonError();
      }
      this.skipWhitespace();

      if (frame.kind === "array") {
        if (frame.state === "first" && this.consume("]")) {
          this.frames.pop();
          completed = frame.node;
        } else if (frame.state === "first" || frame.state === "value") {
          frame.state = "value";
          completed = this.startValue();
        } else if (this.consume("]")) {
          this.frames.pop();
          completed = frame.node;
        } else {
          this.expect(",");
          frame.state = "value";
        }
        continue;
      }

      if (frame.state === "first" && this.consume("}")) {
        this.frames.pop();
        completed = frame.node;
      } else if (frame.state === "first" || frame.state === "key") {
        frame.name = this.parseString();
        frame.state = "colon";
      } else if (frame.state === "colon") {
        this.expect(":");
        frame.state = "value";
      } else if (frame.state === "value") {
        completed = this.startValue();
      } else if (this.consume("}")) {
        this.frames.pop();
        completed = frame.node;
      } else {
        this.expect(",");
        frame.state = "key";
      }
    }

    this.skipWhitespace();
    if (this.position !== this.input.length) {
      throw invalidJsonError();
    }
    return root;
  }

  private startValue(): RawValue | undefined {
    this.skipWhitespace();
    const character = this.input[this.position];
    if (character === "n") {
      this.expectText("null");
      return { kind: "null" };
    }
    if (character === "t") {
      this.expectText("true");
      return { kind: "boolean", value: true };
    }
    if (character === "f") {
      this.expectText("false");
      return { kind: "boolean", value: false };
    }
    if (character === '"') {
      return { kind: "string", value: this.parseString() };
    }
    if (character === "[") {
      this.position += 1;
      const node: Extract<RawValue, { kind: "array" }> = {
        kind: "array",
        values: [],
      };
      this.frames.push({ kind: "array", node, state: "first" });
      return undefined;
    }
    if (character === "{") {
      this.position += 1;
      const node: Extract<RawValue, { kind: "object" }> = {
        kind: "object",
        members: [],
      };
      this.frames.push({ kind: "object", node, state: "first" });
      return undefined;
    }
    if (character === "-" || isDigit(character)) {
      return { kind: "number", token: this.parseNumber() };
    }
    throw invalidJsonError();
  }

  private parseString(): string {
    this.expect('"');
    let value = "";
    while (this.position < this.input.length) {
      const character = this.input[this.position];
      this.position += 1;
      if (character === '"') {
        return value;
      }
      if (character !== "\\") {
        value += character;
        continue;
      }

      const escaped = this.input[this.position];
      this.position += 1;
      switch (escaped) {
        case '"':
        case "\\":
        case "/":
          value += escaped;
          break;
        case "b":
          value += "\b";
          break;
        case "f":
          value += "\f";
          break;
        case "n":
          value += "\n";
          break;
        case "r":
          value += "\r";
          break;
        case "t":
          value += "\t";
          break;
        case "u": {
          const digits = this.input.slice(this.position, this.position + 4);
          this.position += 4;
          value += String.fromCharCode(Number.parseInt(digits, 16));
          break;
        }
        default:
          throw invalidJsonError();
      }
    }
    throw invalidJsonError();
  }

  private parseNumber(): string {
    const start = this.position;
    this.consume("-");
    if (this.consume("0")) {
      // JSON.parse already established that a second leading digit is absent.
    } else {
      while (isDigit(this.input[this.position])) {
        this.position += 1;
      }
    }
    if (this.consume(".")) {
      while (isDigit(this.input[this.position])) {
        this.position += 1;
      }
    }
    const exponent = this.input[this.position];
    if (exponent === "e" || exponent === "E") {
      this.position += 1;
      if (this.input[this.position] === "+" || this.input[this.position] === "-") {
        this.position += 1;
      }
      while (isDigit(this.input[this.position])) {
        this.position += 1;
      }
    }
    return this.input.slice(start, this.position);
  }

  private skipWhitespace(): void {
    while (" \n\r\t".includes(this.input[this.position] ?? "\0")) {
      this.sawWhitespace = true;
      this.position += 1;
    }
  }

  private consume(expected: string): boolean {
    if (this.input[this.position] !== expected) {
      return false;
    }
    this.position += 1;
    return true;
  }

  private expect(expected: string): void {
    if (!this.consume(expected)) {
      throw invalidJsonError();
    }
  }

  private expectText(expected: string): void {
    if (!this.input.startsWith(expected, this.position)) {
      throw invalidJsonError();
    }
    this.position += expected.length;
  }
}

function normalizeValue(
  raw: RawValue,
  depth: number,
  metadata: { normalized: boolean },
): JsonValue {
  switch (raw.kind) {
    case "null":
      return null;
    case "boolean":
      return raw.value;
    case "string":
      assertScalarString(raw.value);
      return raw.value;
    case "number": {
      const normalized = normalizeNumber(raw.token);
      if (normalized.canonical !== raw.token) {
        metadata.normalized = false;
      }
      return normalized.value;
    }
    case "array": {
      const nextDepth = checkedDepth(depth);
      return raw.values.map((value) => normalizeValue(value, nextDepth, metadata));
    }
    case "object": {
      const nextDepth = checkedDepth(depth);
      const lastIndices = new Map<string, number>();
      raw.members.forEach(([name], index) => {
        if (lastIndices.has(name)) {
          metadata.normalized = false;
        }
        lastIndices.set(name, index);
      });

      const entries: Array<[string, JsonValue]> = [];
      raw.members.forEach(([name, value], index) => {
        if (lastIndices.get(name) !== index) {
          return;
        }
        assertScalarString(name);
        entries.push([name, normalizeValue(value, nextDepth, metadata)]);
      });
      return Object.fromEntries(entries) as { [key: string]: JsonValue };
    }
  }
}

function checkedDepth(depth: number): number {
  const next = depth + 1;
  if (next > MAX_CONTAINER_DEPTH) {
    throw invalidValueError("depth_limit");
  }
  return next;
}

function assertScalarString(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw invalidValueError("unpaired_surrogate");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw invalidValueError("unpaired_surrogate");
    }
  }
}

function normalizeNumber(token: string): { value: number; canonical: string } {
  const binary64 = Number(token);
  if (!Number.isFinite(binary64)) {
    throw invalidValueError("non_finite_number");
  }

  const negative = token.startsWith("-");
  const unsigned = negative ? token.slice(1) : token;
  const exponentIndex = unsigned.search(/[eE]/);
  const mantissa = exponentIndex === -1 ? unsigned : unsigned.slice(0, exponentIndex);
  const exponentText = exponentIndex === -1 ? "0" : unsigned.slice(exponentIndex + 1);
  const decimalIndex = mantissa.indexOf(".");
  const integerPart = decimalIndex === -1 ? mantissa : mantissa.slice(0, decimalIndex);
  const fraction = decimalIndex === -1 ? "" : mantissa.slice(decimalIndex + 1);
  const digits = integerPart + fraction;

  if (/^0+$/.test(digits)) {
    return { value: 0, canonical: "0" };
  }

  const exponent = parseSaturatingExponent(exponentText);
  const scale = fraction.length - exponent;
  let magnitude: string;
  if (scale <= 0) {
    const significant = digits.replace(/^0+/, "");
    const zeroCount = -scale;
    if (significant.length + zeroCount > 16) {
      throw invalidValueError("number_out_of_range");
    }
    magnitude = significant + "0".repeat(zeroCount);
  } else {
    if (scale > digits.length) {
      throw invalidValueError("non_integral_number");
    }
    const split = digits.length - scale;
    if (/[^0]/.test(digits.slice(split))) {
      throw invalidValueError("non_integral_number");
    }
    magnitude = digits.slice(0, split).replace(/^0+/, "") || "0";
  }

  if (
    magnitude.length > 16 ||
    (magnitude.length === 16 && magnitude > String(MAX_SAFE_REVISION))
  ) {
    throw invalidValueError("number_out_of_range");
  }
  const canonical = magnitude === "0" ? "0" : `${negative ? "-" : ""}${magnitude}`;
  return { value: Number(canonical), canonical };
}

function parseSaturatingExponent(value: string): number {
  const negative = value.startsWith("-");
  const digits = value.replace(/^[+-]/, "").replace(/^0+/, "") || "0";
  if (digits.length > 6) {
    return negative ? -1_000_000 : 1_000_000;
  }
  const magnitude = Number(digits);
  return negative ? -magnitude : magnitude;
}

function isDigit(value: string | undefined): boolean {
  return value !== undefined && value >= "0" && value <= "9";
}
