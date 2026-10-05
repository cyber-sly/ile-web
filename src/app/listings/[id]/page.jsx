import { notFound } from "next/navigation";
import { getListing } from "@/lib/supabaseServer";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { stateLabel } from "@/lib/nigeria";
import {
  categoryOf, typeLabel, priceParts, placeLabel, keyFacts, isAvailable,
} from "@/lib/property";
import ListingDetail from "@/components/ListingDetail";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params) {
  const { id } = await params;
  if (!UUID.test(id)) return null;
  return getListing(id);
}

// "₦350,000/year · 2 beds · Sango Otta, Ogun"
function summary(listing) {
  const { amount, suffix } = priceParts(listing);
  return [`${amount}${suffix}`, ...keyFacts(listing), placeLabel(listing)].filter(Boolean).join(" · ");
}

export async function generateMetadata({ params }) {
  const listing = await load(params);
  if (!listing) return { title: "Listing not found", robots: { index: false } };

  const lead = summary(listing);
  const description = listing.description
    ? `${lead}. ${listing.description.replace(/\s+/g, " ").trim().slice(0, 150)}`
    : `${lead}. Book a free viewing on Ile. No inspection fees.`;
  const image = listing.image_url || listing.image_urls?.[0];
  const title = `${listing.title.trim()} · ${priceParts(listing).amount}`;
  const url = `/listings/${listing.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // Let/sold listings stay reachable for old links but drop out of search.
    robots: isAvailable(listing) ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      title,
      description: lead,
      siteName: SITE_NAME,
      locale: "en_NG",
      ...(image && { images: [{ url: image, alt: listing.title }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: lead,
      ...(image && { images: [image] }),
    },
  };
}

// schema.org markup: the listing as a RealEstateListing with an NGN offer,
// plus breadcrumbs (which Google can show in results).
function structuredData(listing) {
  const url = `${SITE_URL}/listings/${listing.id}`;
  const images = listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [];
  const category = categoryOf(listing);
  const isSale = listing.listing_type === "sale";
  const tab = category === "homes" ? (isSale ? "sale" : null) : category;
  const browse = `${SITE_URL}/listings${tab ? `?tab=${tab}` : ""}`;
  const sep = tab ? "&" : "?";

  const crumbs = [
    { name: "Ile", item: SITE_URL },
    { name: category === "homes" ? (isSale ? "Homes for sale" : "Homes for rent") : category === "land" ? "Land" : "Commercial", item: browse },
    listing.state && { name: stateLabel(listing.state), item: `${browse}${sep}state=${encodeURIComponent(listing.state)}` },
    { name: listing.title.trim(), item: url },
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateListing",
        "@id": `${url}#listing`,
        url,
        name: listing.title.trim(),
        description: listing.description || summary(listing),
        datePosted: listing.created_at,
        ...(images.length && { image: images.slice(0, 6) }),
        offers: {
          "@type": "Offer",
          price: Number(listing.price),
          priceCurrency: "NGN",
          businessFunction: isSale ? "http://purl.org/goodrelations/v1#Sell" : "http://purl.org/goodrelations/v1#LeaseOut",
          availability: isAvailable(listing) ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        },
        about: {
          "@type": category === "homes" ? "Accommodation" : "Place",
          name: typeLabel(listing.property_type),
          ...(category === "homes" && Number(listing.bedrooms) > 0 && { numberOfBedrooms: Number(listing.bedrooms) }),
          ...(category === "homes" && listing.bathrooms && { numberOfBathroomsTotal: Number(listing.bathrooms) }),
          address: {
            "@type": "PostalAddress",
            ...(listing.address && { streetAddress: listing.address }),
            addressLocality: listing.area || listing.lga || listing.location || undefined,
            ...(listing.state && { addressRegion: stateLabel(listing.state) }),
            addressCountry: "NG",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
      },
    ],
  };
}

export default async function ListingPage({ params }) {
  const listing = await load(params);
  if (!listing) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so listing text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(listing)).replace(/</g, "\\u003c") }}
      />
      <ListingDetail initialListing={listing} />
    </>
  );
}
