import { expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

jest.mock("expo-linear-gradient", () => ({ LinearGradient: () => null }));

import Hero from "../Hero";

test("search tab labels stay on one line on small phones (never 'Commercia/l')", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<Hero onSearch={() => {}} onList={() => {}} />);
  });
  const label = r!.root.findAllByType(Text).find((t) => t.props.children === "Commercial")!;
  expect(label.props.numberOfLines).toBe(1);
  expect(label.props.adjustsFontSizeToFit).toBe(true);
});
