import { expect, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ShareStats from "../dashboard/ShareStats";

test("ShareStats shows nothing when the summary is null", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<ShareStats summary={null} />);
  });
  expect(r!.toJSON()).toBeNull();
});

test("ShareStats shows the dashboard line", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(
      <ShareStats summary={{ code: "TUNDE7", balance: 14, joined: 4, listers: 1, views: 120, bookings: 9, seekers_confirmed: 3 }} />
    );
  });
  const t = r!.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(""));
  expect(t).toContain("Your shares: 120 views · 9 bookings · 4 joined with your code · 14 boost days left");
});
