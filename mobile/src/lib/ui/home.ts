// Home tab rules and content (copied from the website's home page, src/app/page.js).

// Last tab title. While the session is still loading it says "Account", so
// logged-in people don't see "Log in" flash at launch.
export function accountTabTitle(user: unknown, loading = false): "Account" | "Log in" {
  return user || loading ? "Account" : "Log in";
}

// Where to go right after signing up. Only pages we send people to on purpose
// are allowed (from Home's "List your property"); anything else is ignored.
const AFTER_SIGNUP = ["/list/new"] as const;
export function afterSignupRoute(next: string | undefined): (typeof AFTER_SIGNUP)[number] | null {
  return AFTER_SIGNUP.find((p) => p === next) ?? null;
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
    title: "Homes",
    blurb: "Flats, self-contains and duplexes to rent or buy.",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=70",
  },
  {
    tab: "stays",
    title: "Shortlets & hotels",
    blurb: "Shortlet apartments, hotel rooms and Airbnbs by the night.",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=70",
  },
  {
    tab: "land",
    title: "Land",
    blurb: "Plots and farmland, with the title document shown.",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70",
  },
  {
    tab: "commercial",
    title: "Shops & offices",
    blurb: "Space to run your business.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=70",
  },
] as const;

export const HOME_PROMISES = ["Free to search, save and book", "Listings from all 36 states and Abuja", "Prices shown upfront on every listing"] as const;

export const HOME_STEPS = [
  { title: "Search for free", body: "Filter by area, budget and bedrooms. No search fee, ever." },
  { title: "Fix a booking", body: "Pick a time online. Booking on Ile is free." },
  { title: "Move in", body: "Agree terms with the lister and pay them directly." },
] as const;
