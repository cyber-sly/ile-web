// When a viewing can be reviewed or marked done. Pure, so the website and
// the app apply exactly the same rule (mirrors leave_review() in SQL).

// Today's date in Nigeria, as YYYY-MM-DD, to match how viewing dates are stored.
function todayInLagos() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

// Mirrors leave_review(): the viewing was marked done, or it was confirmed
// and its date has passed.
export function canReview(inspection) {
  const today = todayInLagos();
  if (inspection.status === "done") return inspection.preferred_date <= today;
  return inspection.status === "confirmed" && inspection.preferred_date < today;
}

// Listers can mark a viewing done on or after its date.
export function viewingDateReached(inspection) {
  return inspection.preferred_date <= todayInLagos();
}
