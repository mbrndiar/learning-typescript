// Starter for the temperature exercise. Keep the exported names and signatures:
// the tests treat them as the public contract for this module.
export type TemperatureReading = readonly [city: string, celsius: number];

// Convert one trusted Celsius number. Validation belongs at the unknown-input
// boundary below, not inside this arithmetic helper.
export function toFahrenheit(celsius: number): number {
  // TODO: Convert Celsius to Fahrenheit.
  return celsius;
}

// Treat value like data from the outside world: it is unknown until runtime
// checks prove it is a finite number.
export function readTemperature(value: unknown): number | undefined {
  // TODO: Narrow numbers and strings, rejecting empty or non-finite values.
  if (typeof value === "number") {
    return value;
  }

  return undefined;
}

// A TemperatureReading is a small named tuple. Destructure it only after the
// type has guaranteed which position is the city and which is Celsius.
export function formatReading(reading: TemperatureReading): string {
  // TODO: Include both temperatures with one digit after the decimal point.
  const [city, celsius] = reading;
  return `${city}: ${celsius}`;
}
