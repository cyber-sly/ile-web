import "react-native-gesture-handler/jestSetup";
import { expect, test } from "@jest/globals";
import { Modal, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ProfilePhoto from "../ProfilePhoto";

const render = () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<ProfilePhoto uri="https://x.test/ada.jpg" name="Ada" style={{ width: 88, height: 88 }} />);
  });
  return r!;
};
const byLabel = (r: ReactTestRenderer, label: string) => r.root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function");

test("tapping a profile photo opens it full screen with the person's name", () => {
  const r = render();
  expect(r.root.findByType(Modal).props.visible).toBe(false);

  act(() => byLabel(r, "View Ada's photo").props.onPress());

  expect(r.root.findByType(Modal).props.visible).toBe(true);
  const texts = r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));
  expect(texts).toContain("Ada");
  expect(texts).not.toContain("1 / 1");
});

test("the full-screen photo closes with the close button", () => {
  const r = render();
  act(() => byLabel(r, "View Ada's photo").props.onPress());
  act(() => byLabel(r, "Close photos").props.onPress());
  expect(r.root.findByType(Modal).props.visible).toBe(false);
});
