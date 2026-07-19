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

## ▶️ Run the feedback

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/04_typescript_foundations/solution.test.ts
node --import=tsx --test exercises/04_typescript_foundations/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
