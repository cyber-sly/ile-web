import { describe, expect, test } from "@jest/globals";
import { logOutDevice, removeToken, saveToken } from "../pushTokens";

function fakeClient(error: { message: string } | null = null) {
  const calls: [string, unknown][] = [];
  return {
    calls,
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args]);
      return { data: null, error };
    },
  };
}

describe("push tokens", () => {
  test("saveToken registers this device for whoever is logged in", async () => {
    const client = fakeClient();
    await saveToken(client, "ExponentPushToken[abc]", "android");
    expect(client.calls).toEqual([["register_push_token", { p_token: "ExponentPushToken[abc]", p_platform: "android" }]]);
  });

  test("saveToken reports a failure", async () => {
    await expect(saveToken(fakeClient({ message: "nope" }), "ExponentPushToken[abc]", "ios")).rejects.toThrow("nope");
  });

  test("removeToken removes only this device", async () => {
    const client = fakeClient();
    await removeToken(client, "ExponentPushToken[abc]");
    expect(client.calls).toEqual([["unregister_push_token", { p_token: "ExponentPushToken[abc]" }]]);
  });
});

test("logging out removes this phone's token before the session ends", async () => {
  const order: string[] = [];
  const client = {
    rpc: async (name: string) => {
      order.push(name);
      return { data: null, error: null };
    },
  };
  let stored: string | null = "ExponentPushToken[abc]";
  const storage = {
    get: async () => stored,
    clear: async () => {
      order.push("clear");
      stored = null;
    },
  };
  await logOutDevice(client, storage, async () => {
    order.push("signOut");
  });
  expect(order).toEqual(["unregister_push_token", "clear", "signOut"]);
});

test("logging out still signs out when there is no token or removing fails", async () => {
  const signedOut: boolean[] = [];
  const client = { rpc: async () => Promise.reject(new Error("offline")) };
  await logOutDevice(client, { get: async () => "ExponentPushToken[x]", clear: async () => {} }, async () => {
    signedOut.push(true);
  });
  await logOutDevice(client, { get: async () => null, clear: async () => {} }, async () => {
    signedOut.push(true);
  });
  expect(signedOut).toEqual([true, true]);
});
