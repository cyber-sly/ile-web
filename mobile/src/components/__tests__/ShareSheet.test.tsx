import { describe, expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

let mockSharing: object | null = null;
jest.mock("expo-modules-core", () => ({
  ...(jest.requireActual("expo-modules-core") as object),
  requireOptionalNativeModule: (name: string) => (name === "ExpoSharing" ? mockSharing : null),
}));
jest.mock("@/lib/supabase", () => ({ supabase: {} }));

import ShareSheet from "../ShareSheet";

const LISTING = { id: "l1", title: "2-bed flat", price: 350000, listing_type: "rent", lga: "Ikeja", state: "Lagos" };
const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

function render() {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<ShareSheet listing={LISTING} code="TUNDE7" visible onClose={() => {}} />);
  });
  return r!;
}

describe("ShareSheet", () => {
  test("image option hidden when the sharing module is missing", () => {
    mockSharing = null;
    const t = texts(render());
    expect(t).toContain("Send link");
    expect(t).not.toContain("Post to Status / Stories");
  });

  test("image option shown when sharing is available", () => {
    mockSharing = {};
    expect(texts(render())).toContain("Post to Status / Stories");
  });
});
