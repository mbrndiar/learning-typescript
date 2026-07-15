export type TemperatureReading = readonly [city: string, celsius: number];

export function toFahrenheit(celsius: number): number {
  // TODO: Convert Celsius to Fahrenheit.
  return celsius;
}

export function readTemperature(value: unknown): number | undefined {
  // TODO: Narrow numbers and strings, rejecting empty or non-finite values.
  if (typeof value === "number") {
    return value;
  }

  return undefined;
}

export function formatReading(reading: TemperatureReading): string {
  // TODO: Include both temperatures with one digit after the decimal point.
  const [city, celsius] = reading;
  return `${city}: ${celsius}`;
}
