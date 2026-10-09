// Turns errors from the network, Supabase Auth or Postgres into a sentence a
// person can act on. Messages Ile wrote for people (e.g. "That time is
// already taken…") pass through; anything technical is replaced.

export const OFFLINE_MESSAGE = "You're offline. Check your connection and try again.";
const GENERIC = "Something went wrong. Please try again.";

const NETWORK = /fetch failed|failed to fetch|network request failed|load failed|internet connection appears to be offline|networkerror|timed out|timeout|ECONN|ENOTFOUND/i;

const KNOWN = [
  [/invalid login credentials/i, "That email and password don't match. Try again or reset your password."],
  [/email not confirmed/i, "Please confirm your email first. We sent you a link when you signed up."],
  [/user already registered|already been registered/i, "An account with this email already exists. Log in instead."],
  [/rate limit|too many requests/i, "Too many attempts. Please wait a few minutes and try again."],
  [/database error saving new user/i, "We couldn't create your account just now. Please try again in a moment."],
  [/password should be at least|weak password/i, "Use a longer password: at least 8 characters."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Enter a valid email address."],
  [/same password|should be different from the old password/i, "Choose a password different from your current one."],
  [/jwt expired|invalid jwt|refresh token|session (not found|missing|expired)/i, "Your session has ended. Please log in again."],
  [/permission denied|row-level security|not authorized|forbidden/i, "You don't have permission to do that."],
];

// Signs of a message written for developers, not people.
const TECHNICAL = /violates|constraint|relation "|column "|syntax error|PGRST|null value|invalid input|duplicate key|function .*\(|unexpectedexception|\.swift|\.java|\bat \w+\.|^\s*[{[]/i;

export function friendlyError(error) {
  const message = typeof error === "string" ? error : error?.message || "";
  const status = typeof error === "object" && error ? error.status : undefined;
  if (NETWORK.test(message)) return OFFLINE_MESSAGE;
  if (status === 429) return KNOWN[3][1];
  for (const [pattern, text] of KNOWN) if (pattern.test(message)) return text;
  if (!message.trim() || TECHNICAL.test(message)) return GENERIC;
  return message;
}
