import { describe, expect, test } from "@jest/globals";
import { uploadAll } from "../uploadQueue";

const items = [
  { key: "a", media: "A" },
  { key: "b", media: "B" },
  { key: "c", media: "C" },
];

describe("uploadAll", () => {
  test("uploads one at a time in order", async () => {
    const order: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const { urls, failed } = await uploadAll(items, async (m) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      order.push(m);
      await new Promise((r) => setTimeout(r, 1));
      running--;
      return `url-${m}`;
    });
    expect(order).toEqual(["A", "B", "C"]);
    expect(maxRunning).toBe(1);
    expect(urls).toEqual({ a: "url-A", b: "url-B", c: "url-C" });
    expect(failed).toEqual([]);
  });

  test("retries a failing upload then reports it failed", async () => {
    let attemptsB = 0;
    const { urls, failed } = await uploadAll(
      items,
      async (m) => {
        if (m === "B") {
          attemptsB++;
          throw new Error("network");
        }
        return `url-${m}`;
      },
      { retries: 2 }
    );
    expect(attemptsB).toBe(3);
    expect(failed).toEqual(["b"]);
    expect(urls).toEqual({ a: "url-A", c: "url-C" });
  });

  test("skips items already uploaded", async () => {
    const seen: string[] = [];
    const { urls } = await uploadAll(items, async (m) => (seen.push(m), `url-${m}`), { done: { a: "old-A" } });
    expect(seen).toEqual(["B", "C"]);
    expect(urls.a).toBe("old-A");
  });
});

test("reports each upload as soon as it finishes, so progress survives the app closing", async () => {
  const seen: [string, string][] = [];
  await uploadAll(items, async (m) => {
    if (m === "C") throw new Error("killed");
    return `url-${m}`;
  }, { retries: 0, onUploaded: (key, url) => seen.push([key, url]) });
  expect(seen).toEqual([["a", "url-A"], ["b", "url-B"]]);
});
