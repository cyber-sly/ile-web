import { beforeEach, expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockRequest = jest.fn(async (_req: unknown) => "b1");
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/stays", () => ({
  ...(jest.requireActual("@/lib/stays") as object),
  fetchTakenDates: async () => [{ check_in: "2026-11-10", check_out: "2026-11-12" }],
  requestStay: (req: unknown) => mockRequest(req),
}));

import StayBooking from "../StayBooking";

const LISTING = { id: "l1", title: "Lekki shortlet", category: "stays", price: 45000, max_guests: 2, min_nights: 2, cleaning_fee: 10000 };
const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

async function render() {
  let r: ReactTestRenderer;
  await act(async () => {
    r = create(<StayBooking listing={LISTING} today="2026-11-01" onBooked={() => {}} />);
  });
  return r!;
}

beforeEach(() => {
  mockRequest.mockClear();
});

test("stay booking shows the breakdown for the chosen nights", async () => {
  const r = await render();
  act(() => r.root.findByProps({ accessibilityLabel: "2026-11-05" }).props.onPress());
  act(() => r.root.findByProps({ accessibilityLabel: "2026-11-08" }).props.onPress());
  const t = texts(r);
  expect(t).toContain("3 nights × ₦45,000");
  expect(t).toContain("₦145,000");
});

test("guests stop at the maximum and a short stay is blocked before sending", async () => {
  const r = await render();
  const more = () => r.root.findByProps({ accessibilityLabel: "More guests" });
  act(() => more().props.onPress());
  act(() => more().props.onPress());
  expect(texts(r)).toContain("2 guests");
  act(() => r.root.findByProps({ accessibilityLabel: "2026-11-05" }).props.onPress());
  act(() => r.root.findByProps({ accessibilityLabel: "2026-11-06" }).props.onPress());
  await act(async () => {
    await r.root.findByProps({ accessibilityLabel: "Fix a booking" }).props.onPress();
  });
  expect(texts(r)).toContain("This place needs at least 2 nights.");
  expect(mockRequest).not.toHaveBeenCalled();
});

test("booked nights can't be chosen", async () => {
  const r = await render();
  expect(r.root.findByProps({ accessibilityLabel: "2026-11-10, booked" }).props.disabled).toBe(true);
});
