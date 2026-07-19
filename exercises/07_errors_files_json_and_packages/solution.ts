export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

// CONTRACT: validate untrusted JSON before returning Task objects the rest of
// the program may rely on.
export function parseTasks(value: unknown): Task[] {
  // The outer container is part of the contract; an object with numeric keys
  // is not the same boundary shape as a JSON array.
  if (!Array.isArray(value)) {
    throw new TypeError("tasks must be an array");
  }

  return value.map((item, index) => {
    // JavaScript reports null as an object, so reject it before property
    // checks. The index makes boundary errors actionable for callers.
    if (typeof item !== "object" || item === null) {
      throw new TypeError(`tasks[${index}] must be an object`);
    }

    // Record allows field inspection while each field remains unknown until a
    // guard proves its type and value constraints.
    const record = item as Record<string, unknown>;
    if (!Number.isInteger(record.id) || (record.id as number) <= 0) {
      throw new TypeError(`tasks[${index}].id must be a positive integer`);
    }
    if (typeof record.title !== "string" || record.title.trim() === "") {
      throw new TypeError(`tasks[${index}].title must be non-empty`);
    }
    if (typeof record.done !== "boolean") {
      throw new TypeError(`tasks[${index}].done must be a boolean`);
    }

    // Trimming here centralizes normalization at the input boundary.
    return {
      id: record.id as number,
      title: record.title.trim(),
      done: record.done,
    };
  });
}

export function normalizeTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("timestamp must be a string");
  }
  const match = timestampPattern.exec(value);
  if (match === null) {
    throw new TypeError("timestamp must use RFC 3339 date-time syntax");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offset = match[8] ?? "";
  const offsetHour = offset === "Z" ? 0 : Number(offset.slice(1, 3));
  const offsetMinute = offset === "Z" ? 0 : Number(offset.slice(4, 6));
  if (
    !validCalendarDate(year, month, day) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    throw new RangeError("timestamp contains an impossible calendar value");
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new RangeError("timestamp is outside the supported Date range");
  }
  return new Date(milliseconds).toISOString();
}
