import { expect, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ListingTypeBadge } from "../kit/Badge";

const text = (r: ReactTestRenderer) =>
  r.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(""))
    .join(" ");

test("kit Badge renders the website label for each listing type", () => {
  let sale: ReactTestRenderer;
  let rent: ReactTestRenderer;
  act(() => {
    sale = create(<ListingTypeBadge type="sale" />);
    rent = create(<ListingTypeBadge type="rent" />);
  });
  expect(text(sale!)).toContain("For sale");
  expect(text(rent!)).toContain("For rent");
});
