"use client";

import { useUser, isLandlord } from "@/lib/useUser";
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
        Listing on Ile is free for owners, agents and caretakers.
      </AccessWall>
    );
  }

  if (!isLandlord(user)) {
    return (
      <AccessWall
        title="This account is set up for finding homes"
        primary={{ href: "/signup?role=landlord&next=/listings/new", label: "Create a lister account" }}
        secondary={{ href: "/listings", label: "Keep browsing" }}
      >
        To list a property, use a lister account. You can sign up again with a different email.
      </AccessWall>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">List a property</h1>
      <p className="mt-2 text-ink-muted">Free to list. It takes about five minutes.</p>
      <div className="mt-8">
        <ListingForm userId={user.id} />
      </div>
    </div>
  );
}
