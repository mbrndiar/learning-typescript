// Reference solution for the temperature exercise. Runtime validation happens
// once at the unknown boundary, then the rest of the module works with trusted
// numbers and a readonly tuple.
export type TemperatureReading = readonly [city: string, celsius: number];

// Convert a trusted Celsius value to Fahrenheit.
export function toFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

// Return a finite temperature from unknown input, or undefined when the value
// cannot safely become part of the domain model.
export function readTemperature(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  // Trim before Number() because JavaScript converts an empty string to 0.
  if (typeof value === "string" && value.trim() !== "") {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : undefined;
  }

  return undefined;
}

// Format a validated tuple without mutating it; the tuple labels document why
// the first slot is text and the second is the numeric temperature.
export function formatReading(reading: TemperatureReading): string {
  const [city, celsius] = reading;
  const fahrenheit = toFahrenheit(celsius);

  return `${city}: ${celsius.toFixed(1)}°C / ${fahrenheit.toFixed(1)}°F`;
}
