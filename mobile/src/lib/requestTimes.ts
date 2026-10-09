// Choices for "Request another time": the next three weeks, and hourly
// times from 8am to 6pm ("" means any time works).

export function todayInLagos(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

export function requestDays(today: string, count = 21): string[] {
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    return date.toISOString().slice(0, 10);
  });
}

export const REQUEST_TIMES = ["", ...Array.from({ length: 11 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`)];
