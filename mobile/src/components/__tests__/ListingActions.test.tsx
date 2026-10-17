import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockPush = jest.fn();
let mockUser: { id: string } | null = { id: "seeker" };

jest.mock("expo-router", () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock("@/lib/useSession", () => ({ useSession: () => ({ user: mockUser, session: null, loading: false }) }));
jest.mock("@/lib/messagingApp", () => ({ openChat: jest.fn() }));
jest.mock("@/components/OfflineBanner", () => ({ useOnline: () => true }));

import ListingActions from "../ListingActions";

const listing = { id: "l1", landlord_id: "lister", status: "active", last_confirmed_at: new Date().toISOString() };

function render(l = listing) {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<ListingActions listing={l} />);
  });
  return r!;
}

describe("ListingActions", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUser = { id: "seeker" };
  });

  test("shows Fix a booking and Message for a home-seeker on an available listing", () => {
    const r = render();
    expect(r.root.findAllByProps({ accessibilityLabel: "Fix a booking" }).length).toBeGreaterThan(0);
    expect(r.root.findAllByProps({ accessibilityLabel: "Message the lister" }).length).toBeGreaterThan(0);
  });

  test("shows Edit and Booking times to the owner instead of booking", () => {
    mockUser = { id: "lister" };
    const r = render();
    expect(r.root.findAllByProps({ accessibilityLabel: "Edit listing" }).length).toBeGreaterThan(0);
    expect(r.root.findAllByProps({ accessibilityLabel: "Booking times" }).length).toBeGreaterThan(0);
    expect(r.root.findAllByProps({ accessibilityLabel: "Fix a booking" })).toHaveLength(0);
  });

  test("sends logged-out people to log in", () => {
    mockUser = null;
    const r = render();
    act(() => r.root.findAllByProps({ accessibilityLabel: "Fix a booking" })[0].props.onPress());
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  test("opens the booking sheet for a home-seeker", () => {
    const r = render();
    act(() => r.root.findAllByProps({ accessibilityLabel: "Fix a booking" })[0].props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/book/[id]", params: { id: "l1" } });
  });
});
