import { expect, jest, test } from "@jest/globals";
import { Linking, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

let mockPhone: string | null = "+2348031234567";
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@shared/privacy.js", () => ({ fetchBookingContact: async () => mockPhone }));

import ContactLine from "../ContactLine";

const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

async function render() {
  let r: ReactTestRenderer;
  await act(async () => {
    r = create(<ContactLine kind="stay" id="b1" name="Ada" />);
  });
  return r!;
}

test("ContactLine shows the number with a Call button", async () => {
  mockPhone = "+2348031234567";
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  const r = await render();
  expect(texts(r)).toContain("0803 123 4567");
  act(() => r.root.findByProps({ accessibilityLabel: "Call Ada" }).props.onPress());
  expect(open).toHaveBeenCalledWith("tel:+2348031234567");
});

test("ContactLine says to use chat when there's no number", async () => {
  mockPhone = null;
  const r = await render();
  expect(texts(r)).toContain("No phone number added. Use chat.");
});
