import { expect, test } from "@jest/globals";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const SRC = join(__dirname, "../../..");
const read = (file: string) => readFileSync(join(SRC, file), "utf8");

function filesUnder(dir: string): string[] {
  return readdirSync(join(SRC, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (name === "__tests__") return [];
    return statSync(join(SRC, rel)).isDirectory() ? filesUnder(rel) : rel.endsWith(".tsx") ? [rel] : [];
  });
}

const SWEPT = [
  "app/(tabs)/saved.tsx",
  "app/(tabs)/inbox.tsx",
  "app/(tabs)/account.tsx",
  "app/chat/[id].tsx",
  "app/u/[id].tsx",
  "app/notifications.tsx",
  "app/book/[id].tsx",
  "app/list/[id]/times.tsx",
  "app/account/profile.tsx",
  "app/account/password.tsx",
  "app/account/delete.tsx",
  "components/MyViewings.tsx",
  "components/ViewingCard.tsx",
  "components/ReviewSheet.tsx",
  "components/ReportSheet.tsx",
  "components/NotificationsCard.tsx",
  ...filesUnder("components/dashboard"),
  ...filesUnder("components/wizard"),
];

test("screens no longer use the old status badge or bare loading spinners for lists", () => {
  for (const file of SWEPT) expect([file, read(file).includes("@/components/StatusBadge")]).toEqual([file, false]);
  for (const file of ["app/(tabs)/saved.tsx", "app/(tabs)/inbox.tsx", "components/MyViewings.tsx", "components/dashboard/Dashboard.tsx"]) {
    expect([file, /CardSkeleton|RowSkeleton/.test(read(file))]).toEqual([file, true]);
  }
});
