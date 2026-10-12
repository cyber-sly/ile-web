// Sign-in with Google/Apple rules, kept free of native modules for tests.

export type Role = "tenant" | "landlord";

// What came back from the browser after Google: tokens, an error, or nothing
// (the person closed the page).
export function parseAuthRedirect(url: string | null | undefined): { accessToken: string; refreshToken: string } | { error: string } | { cancelled: true } {
  if (!url) return { cancelled: true };
  const params = new URLSearchParams();
  const [, afterHash = ""] = url.split("#");
  const [, query = ""] = url.split("#")[0].split("?");
  for (const part of [query, afterHash]) new URLSearchParams(part).forEach((v, k) => params.set(k, v));
  const problem = params.get("error_description") || params.get("error");
  if (problem) return { error: problem.replace(/\+/g, " ") };
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { accessToken, refreshToken };
  return { cancelled: true };
}

// A brand-new Google/Apple account takes the role picked on the sign-up
// screen (home-seeker by default). Existing accounts keep theirs (null).
export function roleForNewUser(metadata: Record<string, unknown> | null | undefined, chosen: Role | undefined): Role | null {
  if (metadata?.role) return null;
  return chosen === "landlord" ? "landlord" : "tenant";
}

// Which providers are switched on in Supabase (/auth/v1/settings).
export function providersEnabled(settings: { external?: Record<string, boolean> } | null | undefined) {
  const external = settings?.external || {};
  return { google: Boolean(external.google), apple: Boolean(external.apple) };
}
