import { describe, expect, test } from "@jest/globals";
import { deleteAccountOnPhone, logOutEverywhere } from "../accountRules";

describe("logOutEverywhere", () => {
  test("removes this phone's token, then logs out everywhere", async () => {
    const order: string[] = [];
    const result = await logOutEverywhere({
      removeToken: async () => void order.push("token"),
      signOutGlobal: async () => (order.push("global"), { error: null }),
      signOutLocal: async () => void order.push("local"),
    });
    expect(order).toEqual(["token", "global"]);
    expect(result).toEqual({ offline: false });
  });

  test("still logs this phone out when offline", async () => {
    const order: string[] = [];
    const result = await logOutEverywhere({
      removeToken: async () => {
        throw new Error("offline");
      },
      signOutGlobal: async () => (order.push("global"), { error: { message: "Network request failed" } }),
      signOutLocal: async () => void order.push("local"),
    });
    expect(order).toEqual(["global", "local"]);
    expect(result).toEqual({ offline: true });
  });
});

describe("deleteAccountOnPhone", () => {
  test("clears this phone only after the account is deleted", async () => {
    const order: string[] = [];
    await deleteAccountOnPhone({ deleteAccount: async () => void order.push("delete"), clearDevice: async () => void order.push("clear") });
    expect(order).toEqual(["delete", "clear"]);
  });

  test("leaves the phone alone when deletion fails", async () => {
    const order: string[] = [];
    await expect(
      deleteAccountOnPhone({
        deleteAccount: async () => {
          throw new Error("Nothing was deleted");
        },
        clearDevice: async () => void order.push("clear"),
      })
    ).rejects.toThrow("Nothing was deleted");
    expect(order).toEqual([]);
  });
});

test("a successful deletion is reported as done even if tidying the phone fails", async () => {
  await expect(
    deleteAccountOnPhone({
      deleteAccount: async () => {},
      clearDevice: async () => {
        throw new Error("storage busy");
      },
    })
  ).resolves.toBeUndefined();
});
