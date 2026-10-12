// Home tab rules and content (copied from the website's home page, src/app/page.js).

export function accountTabTitle(user: unknown): "Account" | "Log in" {
  return user ? "Account" : "Log in";
}

// What the "Fresh on Ile" section shows.
export function freshSectionState({
  isPending,
  online,
  count,
  isError = false,
}: {
  isPending: boolean;
  online: boolean;
  count: number;
  isError?: boolean;
}) {
  if (count > 0) return "list" as const;
  if (isError) return "error" as const;
  if (isPending) return online ? ("loading" as const) : ("offline" as const);
  return "empty" as const;
}

export const HOME_CATEGORIES = [
  {
    tab: "rent",
    title: "Homes for rent",
    blurb: "Flats, self-contains and duplexes.",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=70",
  },
  {
    tab: "sale",
    title: "Homes for sale",
    blurb: "Own your home, with the asking price upfront.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=70",
  },
  {
    tab: "land",
    title: "Land",
    blurb: "Plots and farmland, with the title document shown.",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70",
  },
  {
    tab: "commercial",
    title: "Shops and offices",
    blurb: "Space to run your business.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=70",
  },
] as const;

export const HOME_PROMISES = ["Free to search, save and view", "No inspection or search fees", "Prices shown upfront on every listing"] as const;

export const HOME_STEPS = [
  { title: "Search for free", body: "Filter by area, budget and bedrooms. No search fee, ever." },
  { title: "Book a viewing", body: "Pick a time online. Viewings are free, with no inspection fee." },
  { title: "Move in", body: "Agree terms with the lister and pay them directly." },
] as const;
