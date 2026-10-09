// Profile choices and display helpers with no browser or Supabase
// dependencies, so server pages (like /u/[id]) can use them too.

// Choices offered in the profile form. Values must match
// supabase/profiles_extended.sql.
export const LANGUAGES = [
  "English", "Nigerian Pidgin", "Yoruba", "Hausa", "Igbo", "Edo", "Ijaw", "Efik", "Ibibio", "Tiv", "Kanuri", "Fulfulde", "French",
];

export const REGISTRATION_BODIES = [
  { value: "esvarbon", label: "ESVARBON", full: "Estate Surveyors and Valuers Registration Board of Nigeria" },
  { value: "niesv", label: "NIESV", full: "Nigerian Institution of Estate Surveyors and Valuers" },
  { value: "lasrera", label: "LASRERA", full: "Lagos State Real Estate Regulatory Authority" },
  { value: "redan", label: "REDAN", full: "Real Estate Developers Association of Nigeria" },
  { value: "other", label: "Other", full: "Another professional body" },
];

export const OCCUPATIONS = [
  { value: "professional", label: "Working professional" },
  { value: "self_employed", label: "Self-employed" },
  { value: "business_owner", label: "Business owner" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
];

export const MOVE_IN = [
  { value: "now", label: "As soon as possible" },
  { value: "one_month", label: "Within a month" },
  { value: "three_months", label: "In 1–3 months" },
  { value: "later", label: "Just looking for now" },
];

const label = (list, v) => list.find((x) => x.value === v)?.label;
export const occupationLabel = (v) => label(OCCUPATIONS, v);
export const moveInLabel = (v) => label(MOVE_IN, v);
export const registrationLabel = (v) => REGISTRATION_BODIES.find((r) => r.value === v)?.label;

export function formatResponseTime(minutes) {
  if (minutes === null || minutes === undefined) return null;
  if (minutes <= 60) return "Usually replies within an hour";
  if (minutes <= 6 * 60) return "Usually replies within a few hours";
  if (minutes <= 24 * 60) return "Usually replies within a day";
  return "Usually replies within a few days";
}

// How complete a profile is, and what's missing (most useful first).
export function profileCompleteness(profile, isLister) {
  if (!profile) return { percent: 0, missing: [] };
  const checks = [
    { done: Boolean(profile.full_name?.trim()), label: "your name" },
    { done: Boolean(profile.avatar_url), label: "a profile photo" },
    { done: Boolean(profile.bio?.trim()), label: "a short bio" },
    { done: (profile.languages || []).length > 0, label: "languages you speak" },
    ...(isLister
      ? [
          { done: Boolean(profile.lister_type), label: "whether you're an owner, agent, caretaker or developer" },
          { done: (profile.areas_covered || []).length > 0, label: "the areas you cover" },
        ]
      : [{ done: Boolean(profile.home_state), label: "where you live" }]),
  ];
  const done = checks.filter((c) => c.done).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter((c) => !c.done).map((c) => c.label) };
}
