import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import PresenceLine from "../PresenceLine";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-17T15:00:00Z"));
});
afterEach(() => {
  jest.useRealTimers();
});

const render = (lastSeenAt: string | null) => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<PresenceLine lastSeenAt={lastSeenAt} />);
  });
  return r!;
};
const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

test("PresenceLine shows Online, Last seen, or nothing", () => {
  expect(texts(render("2026-10-17T14:59:30Z"))).toEqual(["Online"]);
  expect(texts(render("2026-10-17T12:00:00Z"))[0]).toMatch(/^Last seen /);
  expect(render(null).toJSON()).toBeNull();
});

test("PresenceLine moves from Online to Last seen without new data", () => {
  const r = render("2026-10-17T14:59:30Z");
  expect(texts(r)).toEqual(["Online"]);
  act(() => {
    jest.advanceTimersByTime(3 * 60 * 1000);
  });
  expect(texts(r)[0]).toMatch(/^Last seen /);
});
