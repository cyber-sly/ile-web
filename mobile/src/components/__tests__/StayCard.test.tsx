import { expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/lib/messagingApp", () => ({ openChat: jest.fn() }));

import StayCard from "../StayCard";

const STAY = {
  id: "s1",
  listing_id: "l1",
  guest_id: "g1",
  status: "requested",
  check_in: "2099-11-05",
  check_out: "2099-11-08",
  nights: 3,
  guests: 2,
  total: 145000,
  listings: { id: "l1", title: "Lekki shortlet", landlord_id: "h1" },
};

function render(role: "host" | "guest", stay = STAY) {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<StayCard stay={stay} role={role} personName="Ada" reviewed={false} onChanged={() => {}} />);
  });
  return r!;
}

const has = (r: ReactTestRenderer, label: string) => r.root.findAllByProps({ accessibilityLabel: label }).length > 0;

test("StayCard shows Accept and Decline to the host for a request, Cancel to the guest", () => {
  const host = render("host");
  expect(has(host, "Accept")).toBe(true);
  expect(has(host, "Decline")).toBe(true);
  expect(has(host, "Cancel stay")).toBe(false);

  const guest = render("guest");
  expect(has(guest, "Accept")).toBe(false);
  expect(has(guest, "Cancel stay")).toBe(true);
});

test("StayCard offers a review after an accepted stay has ended", () => {
  const r = render("guest", { ...STAY, status: "accepted", check_in: "2020-01-01", check_out: "2020-01-03" });
  expect(has(r, "Review Ada")).toBe(true);
  expect(has(r, "Cancel stay")).toBe(false);
});
