import { expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

import ListingRow from "../dashboard/ListingRow";

test("a lister can start editing offline (only publishing needs a connection)", () => {
  const listing = { id: "l1", title: "Flat", price: 100, listing_type: "rent", status: "active", last_confirmed_at: new Date().toISOString() };
  let r: ReactTestRenderer;
  act(() => {
    r = create(<ListingRow listing={listing} online={false} onUpdate={async () => {}} onDelete={async () => {}} />);
  });
  expect(r!.root.findByProps({ accessibilityLabel: "Edit" }).props.disabled).toBeFalsy();
  expect(r!.root.findByProps({ accessibilityLabel: "Mark as let" }).props.disabled).toBe(true);
});
