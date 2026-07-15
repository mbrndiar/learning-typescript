# 🧠 Exercise 4: Typed Temperature Readings

Migrate a small temperature formatter to strict TypeScript.

## 📋 Contract

- `TemperatureReading` is a readonly tuple containing a city and Celsius value.
- `toFahrenheit(celsius)` returns `celsius * 9 / 5 + 32`.
- `readTemperature(value)` accepts `unknown`. Return a finite number when the
  value is already a number or is non-empty numeric text; otherwise return
  `undefined`.
- `formatReading(reading)` returns text such as
  `Oslo: 10.0°C / 50.0°F`.

Do not use `any` or a type assertion. Narrow `unknown` with runtime checks.

## ▶️ Run the reference tests

```bash
node --import=tsx --test exercises/04_typescript_foundations/solution.test.ts
```

Temporarily point the test import at `exercise.ts` to run the same examples
against your implementation.
