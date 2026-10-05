"use client";

import { useUser } from "@/lib/useUser";
import ListingForm from "@/components/ListingForm";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";

export default function NewListingPage() {
  const user = useUser();

  if (user === undefined) return <PageSkeleton />;

  if (!user) {
    return (
      <AccessWall
        title="Create a free account to list"
        primary={{ href: "/signup?role=landlord&next=/listings/new", label: "Create lister account" }}
        secondary={{ href: "/login?next=/listings/new", label: "Log in" }}
      >
        Listing on Ile is free for owners, agents, caretakers and developers.
      </AccessWall>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">List a property</h1>
      <p className="mt-2 text-ink-muted">Homes, land or commercial space. Free to list, and it takes about five minutes.</p>
      <div className="mt-8">
        <ListingForm userId={user.id} />
      </div>
    </div>
  );
}
