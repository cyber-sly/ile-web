import { expect, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ReviewList from "../ReviewList";

const allText = (r: ReactTestRenderer) =>
  r.root
    .findAllByType(Text)
    .map((t) => [].concat(t.props.children).join(""))
    .join(" | ");

test("shows reviews without reviewer names", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(
      <ReviewList
        reviews={[{ id: "r1", rating: 4, comment: "Lovely flat, honest lister", listing_accurate: true, created_at: "2026-10-01T10:00:00Z", listings: { id: "l1", title: "2-bed flat" }, reviewer_id: "secret-user", reviewer_name: "Hidden Person" }]}
      />
    );
  });
  const text = allText(r!);
  expect(text).toContain("Lovely flat, honest lister");
  expect(text).toContain("2-bed flat");
  expect(text).not.toContain("Hidden Person");
  expect(text).not.toContain("secret-user");
});

test("shows an empty state when there are no reviews", () => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<ReviewList reviews={[]} />);
  });
  expect(allText(r!)).toContain("No reviews yet");
});
