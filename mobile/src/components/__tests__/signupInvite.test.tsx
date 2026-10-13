import { beforeEach, expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockSignUp = jest.fn(async (_args: unknown) => ({ data: { session: null }, error: null }));
const mockExists = jest.fn(async (_code: string) => true);

jest.mock("expo-router", () => ({
  router: { dismissAll: jest.fn(), push: jest.fn(), replace: jest.fn(), canDismiss: () => true, canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ supabase: { auth: { signUp: (args: unknown) => mockSignUp(args) } } }));
jest.mock("@/lib/secureStore", () => ({ setRememberMe: jest.fn(async () => {}) }));
jest.mock("@/lib/oauth", () => ({ useSocialProviders: () => ({ google: false, apple: false }) }));
jest.mock("@/lib/referrals", () => ({
  ...(jest.requireActual("@/lib/referrals") as object),
  inviteCodeExists: (code: string) => mockExists(code),
}));

import SignupScreen from "../../app/(auth)/signup";

const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

async function signUpWith(code: string) {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<SignupScreen />);
  });
  const type = (label: string, value: string) => act(() => r.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value));
  type("Full name", "Ada Obi");
  type("Email", "ada@example.com");
  type("Password", "longpassword1");
  type("Invite code", code);
  await act(async () => {
    await r.root.findByProps({ accessibilityLabel: "Create account" }).props.onPress();
  });
  return r!;
}

beforeEach(() => {
  mockSignUp.mockClear();
  mockExists.mockReset();
});

test("sign-up sends a valid invite code", async () => {
  mockExists.mockImplementation(async () => true);
  await signUpWith(" tunde7");
  const args = mockSignUp.mock.calls[0][0] as { options: { data: Record<string, string> } };
  expect(args.options.data.invite_code).toBe("TUNDE7");
});

test("sign-up reports an unknown invite code and still creates the account", async () => {
  mockExists.mockImplementation(async () => false);
  const r = await signUpWith("NOPE9");
  const args = mockSignUp.mock.calls[0][0] as { options: { data: Record<string, string> } };
  expect(args.options.data.invite_code).toBeUndefined();
  expect(texts(r)).toContain("We couldn't find that invite code, so it wasn't added.");
});
