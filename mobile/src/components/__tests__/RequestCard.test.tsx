import { describe, expect, jest, test } from "@jest/globals";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/lib/messagingApp", () => ({ openChat: jest.fn() }));

import RequestCard from "../dashboard/RequestCard";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

function render(status: string) {
  const request = {
    id: "r1",
    status,
    listing_id: "l1",
    tenant_id: "t1",
    preferred_date: inDays(3),
    preferred_time: "10:00:00",
    proposed_date: inDays(4),
    proposed_time: null,
    listings: { id: "l1", title: "2-bed flat" },
  };
  let r: ReactTestRenderer;
  act(() => {
    r = create(<RequestCard request={request} person={{ name: "Ada", avatar: null }} details={null} rating={null} online onUpdate={async () => {}} onCounter={() => {}} />);
  });
  return r!;
}

const labels = (r: ReactTestRenderer) =>
  r.root.findAll((n) => n.props.accessibilityRole === "button" && typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel);

describe("RequestCard", () => {
  test("shows Confirm, Suggest and Decline for a pending request", () => {
    const l = labels(render("pending"));
    expect(l).toEqual(expect.arrayContaining(["Confirm", "Suggest another time", "Decline"]));
    expect(l).not.toContain("Withdraw");
  });

  test("shows Withdraw only for a countered request", () => {
    const l = labels(render("countered"));
    expect(l).toContain("Withdraw");
    expect(l).not.toContain("Confirm");
    expect(l).not.toContain("Decline");
  });
});
