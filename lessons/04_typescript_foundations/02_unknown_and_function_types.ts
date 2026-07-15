import { log } from "node:console";

type NumberFormatter = (value: number) => string;

function readCount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

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

  if (count === undefined) {
    log("Invalid count");
  } else {
    log(formatCount(count));
  }
}
