const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

function normalizeTimestamp(value: unknown): string {
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

const observedAt = normalizeTimestamp("2026-07-16T10:01:00+02:00");
console.log(observedAt);
console.log(
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "Europe/Prague",
  }).format(new Date(observedAt)),
);

const started = performance.now();
await Promise.resolve();
const elapsedMilliseconds = performance.now() - started;
console.log(`Non-negative monotonic duration: ${elapsedMilliseconds >= 0}`);
