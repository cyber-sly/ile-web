import { describe, expect, test } from "@jest/globals";
import { applyFilterChange, readFilters } from "@shared/search.js";
import { activeFilterChips } from "../filterChips";

const filters = (values: Record<string, string>) => readFilters(new URLSearchParams(values));

describe("activeFilterChips", () => {
  test("activeFilterChips lists applied filters in order with readable labels", () => {
    const chips = activeFilterChips(
      filters({ tab: "commercial", state: "Lagos", lga: "Eti-Osa", purpose: "sale", min: "1500000", max: "5000000", title: "c_of_o", q: "Lekki" })
    );
    expect(chips.map((c) => c.key)).toEqual(["state", "lga", "purpose", "min", "max", "title"]);
    expect(chips.find((c) => c.key === "lga")?.label).toBe("Eti-Osa");
    expect(chips.find((c) => c.key === "purpose")?.label).toBe("For sale");
    expect(chips.find((c) => c.key === "min")?.label).toBe("From ₦1.5m");
    expect(chips.find((c) => c.key === "max")?.label).toBe("Up to ₦5m");
    expect(activeFilterChips(filters({ tab: "rent", beds: "2" }))).toEqual([{ key: "beds", label: "2+ beds" }]);
    expect(activeFilterChips(filters({ tab: "rent" }))).toEqual([]);
  });

  test("the any-land filter reads Land", () => {
    expect(activeFilterChips(filters({ tab: "sale", ptype: "land" }))).toEqual([{ key: "ptype", label: "Land" }]);
  });

  test("removing the state chip also clears the LGA", () => {
    const next = applyFilterChange(filters({ tab: "rent", state: "Lagos", lga: "Eti-Osa" }), { state: "" });
    expect(next.lga).toBe("");
    expect(activeFilterChips(next).map((c) => c.key)).not.toContain("lga");
  });
});
