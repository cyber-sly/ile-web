import { expect, test } from "@jest/globals";
import { TextInput } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import Field from "../Field";

test("a password field has a button that shows and hides the password", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<Field label="Password" secureTextEntry value="secret" />);
  });
  const input = () => r.root.findByType(TextInput);
  expect(input().props.secureTextEntry).toBe(true);

  const toggle = r!.root.findByProps({ accessibilityLabel: "Show password" });
  act(() => toggle.props.onPress());
  expect(input().props.secureTextEntry).toBe(false);
  expect(r!.root.findByProps({ accessibilityLabel: "Hide password" })).toBeTruthy();
});

test("other fields have no show-password button", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<Field label="Email" value="a@b.c" />);
  });
  expect(r!.root.findAllByProps({ accessibilityLabel: "Show password" })).toHaveLength(0);
});
