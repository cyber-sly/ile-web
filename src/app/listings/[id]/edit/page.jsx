"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import ListingForm from "@/components/ListingForm";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import { ArrowLeft } from "lucide-react";

export default function EditListingPage() {
  const { id } = useParams();
  const user = useUser();
  const [listing, setListing] = useState(undefined);

  useEffect(() => {
    supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setListing(data ?? null));
  }, [id]);

  if (user === undefined || listing === undefined) return <PageSkeleton />;

  if (!listing) {
    return (
      <AccessWall title="Listing not found" primary={{ href: "/dashboard", label: "Back to dashboard" }}>
        It may have been deleted.
      </AccessWall>
    );
  }

  if (!user || user.id !== listing.landlord_id) {
    return (
      <AccessWall
        title="You can only edit your own listings"
        primary={user ? { href: "/dashboard", label: "Back to dashboard" } : { href: `/login?next=/listings/${id}/edit`, label: "Log in" }}
      >
        Log in with the account that posted this listing.
      </AccessWall>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <Link href={`/listings/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> View listing
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">Edit listing</h1>
      <p className="mt-2 text-ink-muted">Keep your details and photos accurate and up to date.</p>
      <div className="mt-8">
        <ListingForm listing={listing} userId={user.id} />
      </div>
    </div>
  );
}
