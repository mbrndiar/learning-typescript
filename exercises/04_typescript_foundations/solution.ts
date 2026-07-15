export type TemperatureReading = readonly [city: string, celsius: number];

export function toFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function readTemperature(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : undefined;
  }

  return undefined;
}

export function formatReading(reading: TemperatureReading): string {
  const [city, celsius] = reading;
  const fahrenheit = toFahrenheit(celsius);

  return `${city}: ${celsius.toFixed(1)}°C / ${fahrenheit.toFixed(1)}°F`;
}
