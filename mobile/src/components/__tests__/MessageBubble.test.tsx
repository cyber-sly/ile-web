import { expect, jest, test } from "@jest/globals";
import { Alert, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import MessageBubble from "../MessageBubble";
import type { ChatRow } from "@/lib/chatMessages";

const row: ChatRow = { id: "m1", created_at: "2026-10-17T12:00:00Z", sender_id: "me", read_at: null, body: "Hello", edited_at: null };

function render(props: Partial<Parameters<typeof MessageBubble>[0]> = {}) {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<MessageBubble row={row} mine seen={false} onRetry={() => {}} {...props} />);
  });
  return r!;
}
const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

test("MessageBubble shows an edited label", () => {
  const r = render({ row: { ...row, edited_at: "2026-10-17T12:01:00Z" } });
  expect(texts(r).some((t) => t.includes("edited"))).toBe(true);
  expect(texts(render()).some((t) => t.includes("edited"))).toBe(false);
});

test("MessageBubble long-press offers Edit only when onEdit is given", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const onEdit = jest.fn();
  const r = render({ onEdit });
  act(() => r.root.findByProps({ accessibilityHint: "Long-press to edit" }).props.onLongPress());
  const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === "Edit")!.onPress!();
  expect(onEdit).toHaveBeenCalled();

  alert.mockClear();
  const plain = render();
  expect(plain.root.findAllByProps({ accessibilityHint: "Long-press to edit" })).toHaveLength(0);
  expect(alert).not.toHaveBeenCalled();
});
