import { describe, expect, test } from "@jest/globals";
import { forgetPendingToken, logOutDevice, removeToken, saveToken } from "../pushTokens";

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

test("removeToken reports a failure (supabase-js resolves with an error offline)", async () => {
  const client = { rpc: async () => ({ data: null, error: { message: "Network request failed" } }) };
  await expect(removeToken(client, "ExponentPushToken[abc]")).rejects.toThrow("Network request failed");
});

test("an offline logout keeps the token so it can be removed later", async () => {
  const client = { rpc: async () => ({ data: null, error: { message: "Network request failed" } }) };
  let stored: string | null = "ExponentPushToken[abc]";
  let signedOut = false;
  await logOutDevice(client, { get: async () => stored, clear: async () => { stored = null; } }, async () => {
    signedOut = true;
  });
  expect(signedOut).toBe(true);
  expect(stored).toBe("ExponentPushToken[abc]");
});

test("a token left from an offline logout is removed once back online", async () => {
  const calls: string[] = [];
  let stored: string | null = "ExponentPushToken[abc]";
  const client = { rpc: async (name: string) => (calls.push(name), { data: null, error: null }) };
  await forgetPendingToken(client, { get: async () => stored, clear: async () => { stored = null; } });
  expect(calls).toEqual(["unregister_push_token"]);
  expect(stored).toBeNull();
});
