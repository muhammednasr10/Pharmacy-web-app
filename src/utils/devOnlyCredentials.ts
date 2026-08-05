/** Demo login password — stripped from production bundles via import.meta.env.DEV. */
export function devOnlyDemoPassword(): string {
  if (import.meta.env.DEV) return "1234567";
  return "";
}
