import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { useEffect } from "react";
import { act, create } from "react-test-renderer";
import { useSearchText } from "../useSearchText";

type Result = [string, (t: string) => void];
const seen: { latest: Result | null } = { latest: null };
function Probe({ q, change }: { q: string; change: (c: { q: string }) => void }) {
  const result = useSearchText(q, change);
  useEffect(() => {
    seen.latest = result;
  });
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test("a search restored after the screen opens fills the box and is not wiped", () => {
  const change = jest.fn();
  let r: ReturnType<typeof create>;
  act(() => {
    r = create(<Probe q="" change={change} />);
  });
  act(() => {
    r!.update(<Probe q="lekki" change={change} />);
  });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(seen.latest![0]).toBe("lekki");
  expect(change).not.toHaveBeenCalled();
});

test("typing searches after a pause", () => {
  const change = jest.fn();
  act(() => {
    create(<Probe q="" change={change} />);
  });
  act(() => {
    seen.latest![1]("yaba");
  });
  act(() => {
    jest.advanceTimersByTime(400);
  });
  expect(change).toHaveBeenCalledWith({ q: "yaba" });
});
