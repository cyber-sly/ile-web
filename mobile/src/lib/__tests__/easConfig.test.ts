import { expect, test } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

test("eas.json has a development build profile with the dev client", () => {
  const eas = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "eas.json"), "utf8"));
  expect(eas.build.development.developmentClient).toBe(true);
  expect(eas.build.development.distribution).toBe("internal");
  expect(eas.build.development.android.buildType).toBe("apk");
  expect(eas.build.production).toBeDefined();
});
