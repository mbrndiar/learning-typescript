import { ClientProtocolError, ValidationError } from "./index.ts";

export const MAX_REQUEST_BYTES = 64 * 1024;
export const MAX_RESPONSE_BYTES = 1024 * 1024;
export const MAX_JSON_NESTING = 64;

export class BodyLimitError extends ValidationError {
  constructor(maximumBytes: number, cause?: unknown) {
    super(`body exceeds ${maximumBytes} bytes`);
    this.name = "BodyLimitError";
    if (cause !== undefined) this.cause = cause;
  }
}

class StrictJsonParser {
  readonly #source: string;
  #position = 0;

  constructor(source: string) {
    this.#source = source;
  }

  parse(): unknown {
    this.#skipWhitespace();
    const value = this.#parseValue(0);
    this.#skipWhitespace();
    if (this.#position !== this.#source.length) {
      throw new SyntaxError("unexpected data after JSON value");
    }
    return value;
  }

  #parseValue(depth: number): unknown {
    if (depth > MAX_JSON_NESTING) {
      throw new SyntaxError(`JSON nesting exceeds ${MAX_JSON_NESTING}`);
    }
    const character = this.#source[this.#position];
    if (character === "{") return this.#parseObject(depth);
    if (character === "[") return this.#parseArray(depth);
    if (character === '"') return this.#parseString();
    if (character === "t") return this.#parseLiteral("true", true);
    if (character === "f") return this.#parseLiteral("false", false);
    if (character === "n") return this.#parseLiteral("null", null);
    return this.#parseNumber();
  }

  #parseObject(depth: number): Record<string, unknown> {
    this.#position += 1;
    this.#skipWhitespace();
    const result: Record<string, unknown> = Object.create(null);
    const keys = new Set<string>();
    if (this.#source[this.#position] === "}") {
      this.#position += 1;
      return result;
    }
    while (true) {
      if (this.#source[this.#position] !== '"') {
        throw new SyntaxError("object key must be a string");
      }
      const key = this.#parseString();
      if (keys.has(key)) {
        throw new SyntaxError(`duplicate object key: ${key}`);
      }
      keys.add(key);
      this.#skipWhitespace();
      this.#expect(":");
      this.#skipWhitespace();
      result[key] = this.#parseValue(depth + 1);
      this.#skipWhitespace();
      const separator = this.#source[this.#position];
      if (separator === "}") {
        this.#position += 1;
        return result;
      }
      this.#expect(",");
      this.#skipWhitespace();
    }
  }

  #parseArray(depth: number): unknown[] {
    this.#position += 1;
    this.#skipWhitespace();
    const result: unknown[] = [];
    if (this.#source[this.#position] === "]") {
      this.#position += 1;
      return result;
    }
    while (true) {
      result.push(this.#parseValue(depth + 1));
      this.#skipWhitespace();
      const separator = this.#source[this.#position];
      if (separator === "]") {
        this.#position += 1;
        return result;
      }
      this.#expect(",");
      this.#skipWhitespace();
    }
  }

  #parseString(): string {
    const start = this.#position;
    this.#position += 1;
    while (this.#position < this.#source.length) {
      const character = this.#source[this.#position];
      if (character === '"') {
        this.#position += 1;
        return JSON.parse(this.#source.slice(start, this.#position)) as string;
      }
      if (character === "\\") {
        this.#position += 1;
        const escape = this.#source[this.#position];
        if (escape === "u") {
          const hex = this.#source.slice(this.#position + 1, this.#position + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(hex)) {
            throw new SyntaxError("invalid Unicode escape");
          }
          this.#position += 5;
          continue;
        }
        if (escape === undefined || !'"\\/bfnrt'.includes(escape)) {
          throw new SyntaxError("invalid string escape");
        }
      } else if (character !== undefined && character.charCodeAt(0) < 0x20) {
        throw new SyntaxError("unescaped control character");
      }
      this.#position += 1;
    }
    throw new SyntaxError("unterminated string");
  }

  #parseNumber(): number {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(
      this.#source.slice(this.#position),
    );
    if (match === null) {
      throw new SyntaxError("invalid JSON value");
    }
    this.#position += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number)) {
      throw new SyntaxError("JSON number is outside the finite range");
    }
    return number;
  }

  #parseLiteral<T>(literal: string, value: T): T {
    if (!this.#source.startsWith(literal, this.#position)) {
      throw new SyntaxError("invalid JSON literal");
    }
    this.#position += literal.length;
    return value;
  }

  #expect(character: string): void {
    if (this.#source[this.#position] !== character) {
      throw new SyntaxError(`expected ${character}`);
    }
    this.#position += 1;
  }

  #skipWhitespace(): void {
    while (
      this.#source[this.#position] === " " ||
      this.#source[this.#position] === "\n" ||
      this.#source[this.#position] === "\r" ||
      this.#source[this.#position] === "\t"
    ) {
      this.#position += 1;
    }
  }
}

export function parseStrictJsonBytes(bytes: Uint8Array, maximumBytes: number): unknown {
  if (bytes.byteLength > maximumBytes) {
    throw new ValidationError(`JSON body exceeds ${maximumBytes} bytes`);
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new SyntaxError("JSON body must be valid UTF-8", { cause: error });
  }
  return new StrictJsonParser(source).parse();
}

export function parseResponseJson(bytes: Uint8Array): unknown {
  try {
    return parseStrictJsonBytes(bytes, MAX_RESPONSE_BYTES);
  } catch (error) {
    throw new ClientProtocolError("response body is not strict UTF-8 JSON", error);
  }
}

export function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

export async function readBoundedStream(
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (stream === null) return new Uint8Array();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > maximumBytes) {
        try {
          await reader.cancel("body too large");
        } catch (error) {
          throw new BodyLimitError(maximumBytes, error);
        }
        throw new BodyLimitError(maximumBytes);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
