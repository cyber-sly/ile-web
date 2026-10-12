import { beforeEach, expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockGoogle = jest.fn();
jest.mock("expo-router", () => ({ router: { dismissAll: jest.fn(), canDismiss: () => true } }));
jest.mock("expo-apple-authentication", () => ({ AppleAuthenticationButton: () => null, AppleAuthenticationButtonType: {}, AppleAuthenticationButtonStyle: {} }));
jest.mock("@/lib/oauth", () => ({
  useSocialProviders: () => ({ google: true, apple: false }),
  signInWithGoogle: (...a: unknown[]) => mockGoogle(...a),
  signInWithApple: jest.fn(),
}));

import SocialButtons from "../SocialButtons";

const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

beforeEach(() => {
  mockGoogle.mockReset();
});

test("shows a plain message for a sign-in error", async () => {
  mockGoogle.mockImplementation(async () => ({ error: "Network request failed" }));
  let r: ReactTestRenderer;
  act(() => {
    r = create(<SocialButtons />);
  });
  await act(async () => {
    await r!.root.findByProps({ accessibilityLabel: "Continue with Google" }).props.onPress();
  });
  expect(texts(r!)).toContain("You're offline. Check your connection and try again.");
});

test("passes the role and 'Keep me logged in' to Google sign-in", async () => {
  mockGoogle.mockImplementation(async () => ({ cancelled: true }));
  let r: ReactTestRenderer;
  act(() => {
    r = create(<SocialButtons role="landlord" remember={false} />);
  });
  await act(async () => {
    await r!.root.findByProps({ accessibilityLabel: "Continue with Google" }).props.onPress();
  });
  expect(mockGoogle).toHaveBeenCalledWith("landlord", false);
});

test("SocialButtons on top shows the buttons before the divider", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<SocialButtons placement="top" />);
  });
  const order = texts(r!);
  expect(order.indexOf("Continue with Google")).toBeGreaterThanOrEqual(0);
  expect(order.indexOf("Continue with Google")).toBeLessThan(order.indexOf("or"));
});
