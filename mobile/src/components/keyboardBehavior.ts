// Android in SDK 57 is edge-to-edge, so the window no longer resizes for the
// keyboard; "height" shrinks the form instead.
export function keyboardBehavior(os: string): "padding" | "height" {
  return os === "ios" ? "padding" : "height";
}
