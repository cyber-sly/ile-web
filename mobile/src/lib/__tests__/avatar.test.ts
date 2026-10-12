import { describe, expect, test } from "@jest/globals";
import { avatarTarget, replaceAvatar } from "../avatarRules";

describe("avatarTarget", () => {
  test("crops the centre square of a portrait and a landscape photo", () => {
    expect(avatarTarget(3000, 4000)).toEqual({ originX: 0, originY: 500, width: 3000, height: 3000 });
    expect(avatarTarget(4000, 3000)).toEqual({ originX: 500, originY: 0, width: 3000, height: 3000 });
    expect(avatarTarget(512, 512)).toEqual({ originX: 0, originY: 0, width: 512, height: 512 });
  });
});

describe("replaceAvatar", () => {
  test("removes the old photo only after the profile saves", async () => {
    const order: string[] = [];
    const url = await replaceAvatar(
      {
        upload: async () => (order.push("upload"), "https://x/avatars/u1/new.jpg"),
        save: async (u) => void order.push(`save:${u}`),
        remove: async (u) => void order.push(`remove:${u}`),
      },
      "file:///new.jpg",
      "https://x/avatars/u1/old.jpg"
    );
    expect(url).toBe("https://x/avatars/u1/new.jpg");
    expect(order).toEqual(["upload", "save:https://x/avatars/u1/new.jpg", "remove:https://x/avatars/u1/old.jpg"]);
  });

  test("a failed save keeps the old photo and cleans up the new upload", async () => {
    const order: string[] = [];
    await expect(
      replaceAvatar(
        {
          upload: async () => (order.push("upload"), "new-url"),
          save: async () => {
            order.push("save");
            throw new Error("offline");
          },
          remove: async (u) => void order.push(`remove:${u}`),
        },
        "file:///new.jpg",
        "old-url"
      )
    ).rejects.toThrow("offline");
    expect(order).toEqual(["upload", "save", "remove:new-url"]);
  });
});
