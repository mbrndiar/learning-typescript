import { relayFailure, throwIfAborted } from "./errors.ts";

export interface NumberedLine {
  readonly number: number;
  readonly text: string;
}

export async function* decodeNdjsonLines(
  chunks: AsyncIterable<Uint8Array>,
  signal?: AbortSignal,
): AsyncIterable<NumberedLine> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffered = "";
  let lineNumber = 0;
  try {
    for await (const chunk of chunks) {
      throwIfAborted(signal);
      buffered += decoder.decode(chunk, { stream: true });
      while (true) {
        const newline = buffered.indexOf("\n");
        if (newline < 0) {
          break;
        }
        lineNumber += 1;
        const raw = buffered.slice(0, newline);
        buffered = buffered.slice(newline + 1);
        yield {
          number: lineNumber,
          text: raw.endsWith("\r") ? raw.slice(0, -1) : raw,
        };
      }
    }
    buffered += decoder.decode();
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw relayFailure("invalid_json", "input is not valid UTF-8");
    }
    throw error;
  }
  throwIfAborted(signal);
  if (buffered.length > 0) {
    lineNumber += 1;
    yield {
      number: lineNumber,
      text: buffered.endsWith("\r") ? buffered.slice(0, -1) : buffered,
    };
  }
}
