// This lesson treats input as untrusted until a runtime check proves its type.
// `unknown` protects the rest of the program; a function type captures the
// small callable contract needed after the value is narrowed.
type NumberFormatter = (value: number) => string;

// Accepting unknown forces this function to be the validation boundary. Callers
// get either a safe count or undefined, never a half-trusted value.
function readCount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  // Number("") is 0 in JavaScript, so trim first to avoid accepting a blank
  // string as a real count.
  if (typeof value === "string" && value.trim() !== "") {
    const converted = Number(value);

    if (Number.isInteger(converted) && converted >= 0) {
      return converted;
    }
  }

  return undefined;
}

const formatCount: NumberFormatter = (value) => `${value} items`;
const inputs: unknown[] = [3, "7", "many", null];

for (const input of inputs) {
  const count = readCount(input);

  // Narrowing with undefined keeps the invalid path explicit before formatting.
  if (count === undefined) {
    console.log("Invalid count");
  } else {
    console.log(formatCount(count));
  }
}
