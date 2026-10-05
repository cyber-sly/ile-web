"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadFiles, removeFiles } from "@/lib/uploadMedia";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/format";
import { ImagePlus, VideoIcon, X, MapPin, Star } from "lucide-react";

const MAX_PHOTOS = 20;
const MAX_PHOTO_MB = 10;
const MAX_VIDEO_MB = 50; // Supabase's default per-file upload limit

const EMPTY = {
  title: "",
  listingType: "rent",
  location: "",
  address: "",
  price: "",
  bedrooms: "",
  description: "",
  features: "",
};

function fromListing(l) {
  return {
    title: l.title || "",
    listingType: l.listing_type || "rent",
    location: l.location || "",
    address: l.address || "",
    price: l.price ?? "",
    bedrooms: l.bedrooms ?? "",
    description: l.description || "",
    features: (l.features || []).join(", "),
  };
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

// Create (no `listing`) or edit (with `listing`) a property listing.
export default function ListingForm({ listing, userId }) {
  const router = useRouter();
  const editing = Boolean(listing);

  const [values, setValues] = useState(() => (listing ? fromListing(listing) : EMPTY));
  const initialImages = useMemo(
    () => (listing?.image_urls?.length ? listing.image_urls : listing?.image_url ? [listing.image_url] : []),
    [listing]
  );
  const [keptImages, setKeptImages] = useState(initialImages);
  const [keptVideos, setKeptVideos] = useState(listing?.video_urls || []);
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("");

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const isSale = values.listingType === "sale";
  const saving = status !== "";

  // Local previews for newly picked photos; revoked when the list changes.
  const previews = useMemo(() => newImages.map((f) => URL.createObjectURL(f)), [newImages]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function pickImages(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const tooBig = files.filter((f) => f.size > MAX_PHOTO_MB * 1024 * 1024);
    const ok = files.filter((f) => f.size <= MAX_PHOTO_MB * 1024 * 1024);
    const room = MAX_PHOTOS - keptImages.length - newImages.length;
    setNewImages((prev) => [...prev, ...ok.slice(0, Math.max(room, 0))]);
    setErrors((er) => ({
      ...er,
      photos: tooBig.length
        ? `${tooBig.length} photo(s) skipped: each must be under ${MAX_PHOTO_MB}MB.`
        : ok.length > room
          ? `You can add up to ${MAX_PHOTOS} photos.`
          : undefined,
    }));
  }

  function pickVideos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const ok = files.filter((f) => f.size <= MAX_VIDEO_MB * 1024 * 1024);
    setNewVideos((prev) => [...prev, ...ok]);
    setErrors((er) => ({
      ...er,
      videos: ok.length < files.length ? `Videos must be under ${MAX_VIDEO_MB}MB each.` : undefined,
    }));
  }

  function validate() {
    const er = {};
    if (!values.title.trim()) er.title = "Give your listing a title.";
    if (!values.location.trim()) er.location = "Add the area and city.";
    if (!(Number(values.price) > 0)) er.price = "Enter a price above ₦0.";
    if (values.bedrooms === "" || Number(values.bedrooms) < 0 || !Number.isInteger(Number(values.bedrooms)))
      er.bedrooms = "Enter a whole number (0 for land or shops).";
    // Replace field errors (so fixed fields clear) but keep upload warnings.
    setErrors((prev) => ({ photos: prev.photos, videos: prev.videos, ...er }));
    return Object.keys(er).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    let uploadedImages = [];
    let uploadedVideos = [];
    try {
      if (newImages.length) {
        setStatus(`Uploading photos (0 of ${newImages.length})…`);
        uploadedImages = await uploadFiles("listing-images", userId, newImages, (done, total) =>
          setStatus(`Uploading photos (${done} of ${total})…`)
        );
      }
      if (newVideos.length) {
        setStatus(`Uploading videos (0 of ${newVideos.length})…`);
        uploadedVideos = await uploadFiles("listing-videos", userId, newVideos, (done, total) =>
          setStatus(`Uploading videos (${done} of ${total})…`)
        );
      }
    } catch (err) {
      setFormError(`Upload failed: ${err.message}`);
      setStatus("");
      return;
    }

    setStatus(editing ? "Saving changes…" : "Publishing…");
    const imageUrls = [...keptImages, ...uploadedImages];
    const videoUrls = [...keptVideos, ...uploadedVideos];
    const row = {
      title: values.title.trim(),
      location: values.location.trim(),
      address: values.address.trim(),
      price: Number(values.price),
      bedrooms: Number(values.bedrooms),
      listing_type: values.listingType,
      description: values.description.trim(),
      features: values.features.split(",").map((f) => f.trim()).filter(Boolean),
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      video_urls: videoUrls,
    };

    const { data, error } = editing
      ? await supabase.from("listings").update(row).eq("id", listing.id).select("id").single()
      : await supabase.from("listings").insert({ ...row, landlord_id: userId }).select("id").single();

    if (error) {
      setFormError(error.message);
      setStatus("");
      return;
    }

    if (editing) {
      removeFiles("listing-images", initialImages.filter((u) => !keptImages.includes(u)));
      removeFiles("listing-videos", (listing.video_urls || []).filter((u) => !keptVideos.includes(u)));
    }

    router.push(`/listings/${data.id}`);
  }

  const photoCount = keptImages.length + newImages.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Section title="The basics">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Listing type</legend>
          <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] bg-cream p-1">
            {[
              { value: "rent", label: "For rent" },
              { value: "sale", label: "For sale" },
            ].map((t) => (
              <label
                key={t.value}
                className={`cursor-pointer rounded-lg py-2.5 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm ${
                  values.listingType === t.value ? "bg-surface text-palm shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="listingType"
                  value={t.value}
                  checked={values.listingType === t.value}
                  onChange={set("listingType")}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Title"
          placeholder="e.g. 3 bedroom flat with BQ"
          hint="Lead with the size and type of property."
          maxLength={90}
          value={values.title}
          onChange={set("title")}
          error={errors.title}
          required
        />
        <Field
          label="Area and city"
          icon={MapPin}
          placeholder="e.g. Lekki Phase 1, Lagos"
          value={values.location}
          onChange={set("location")}
          error={errors.location}
          required
        />
        <Field
          label="Street address"
          optional
          placeholder="e.g. 12 Admiralty Way"
          hint="Shown on the listing so people can find the property."
          value={values.address}
          onChange={set("address")}
        />
      </Section>

      <Section title="Price and size">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={isSale ? "Asking price (₦)" : "Rent per year (₦)"}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder={isSale ? "e.g. 45000000" : "e.g. 2500000"}
            hint={Number(values.price) > 0 ? `Shows as ${formatNaira(values.price)}${isSale ? "" : " /year"}` : undefined}
            value={values.price}
            onChange={set("price")}
            error={errors.price}
            required
          />
          <Field
            label="Bedrooms"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="e.g. 3"
            hint="Use 0 for land, shops and offices."
            value={values.bedrooms}
            onChange={set("bedrooms")}
            error={errors.bedrooms}
            required
          />
        </div>
      </Section>

      <Section title="Describe it" description="Help people decide before they book a viewing.">
        <Field
          as="textarea"
          label="Description"
          optional
          rows={6}
          placeholder="What makes this place worth seeing? Mention power, water, security, road access and the neighbourhood."
          value={values.description}
          onChange={set("description")}
        />
        <Field
          label="Features"
          optional
          placeholder="e.g. 24/7 power, Fenced compound, Parking for 2 cars"
          hint="Separate each feature with a comma."
          value={values.features}
          onChange={set("features")}
        />
      </Section>

      <Section
        title="Photos and video"
        description={`Add up to ${MAX_PHOTOS} photos. The first photo is the cover. Bright, recent photos get more viewings.`}
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {keptImages.map((url, i) => (
            <Thumb
              key={url}
              src={url}
              cover={i === 0}
              onRemove={() => setKeptImages((prev) => prev.filter((u) => u !== url))}
            />
          ))}
          {previews.map((url, i) => (
            <Thumb
              key={url}
              src={url}
              cover={keptImages.length === 0 && i === 0}
              isNew
              onRemove={() => setNewImages((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          {photoCount < MAX_PHOTOS && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] border-2 border-dashed border-line-strong text-sm font-semibold text-palm transition-colors hover:border-palm hover:bg-palm-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm">
              <ImagePlus size={24} aria-hidden="true" />
              Add photos
              <input type="file" accept="image/*" multiple onChange={pickImages} className="sr-only" />
            </label>
          )}
        </div>
        {errors.photos && <p className="text-sm font-medium text-clay">{errors.photos}</p>}

        <div>
          {[...keptVideos.map((url) => ({ key: url, label: "Current video", remove: () => setKeptVideos((p) => p.filter((u) => u !== url)) })),
            ...newVideos.map((f, i) => ({ key: `${f.name}-${i}`, label: f.name, remove: () => setNewVideos((p) => p.filter((_, j) => j !== i)) }))].map((v) => (
            <div key={v.key} className="mb-2 flex items-center gap-3 rounded-[var(--radius-control)] border border-line px-3.5 py-2.5">
              <VideoIcon size={18} className="shrink-0 text-palm" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{v.label}</span>
              <button type="button" onClick={v.remove} aria-label={`Remove ${v.label}`} className="rounded-full p-1.5 text-ink-muted hover:bg-clay-soft hover:text-clay">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <label className={button({ variant: "neutral", className: "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm" })}>
            <VideoIcon size={17} aria-hidden="true" /> Add a video tour
            <input type="file" accept="video/*" multiple onChange={pickVideos} className="sr-only" />
          </label>
          <p className="mt-1.5 text-sm text-ink-muted">Optional. Up to {MAX_VIDEO_MB}MB per video.</p>
          {errors.videos && <p className="mt-1 text-sm font-medium text-clay">{errors.videos}</p>}
        </div>
      </Section>

      {/* Stays reachable on long forms; sits above the phone tab bar. */}
      <div className="sticky bottom-16 z-20 -mx-4 border-t border-line bg-cream/95 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-[var(--radius-card)] sm:border md:bottom-4">
        {formError && <Alert className="mb-3">{formError}</Alert>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted" aria-live="polite">
            {status || (editing ? "Changes go live as soon as you save." : "Listing is free. You can edit it any time.")}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()} disabled={saving} className={button({ variant: "ghost" })}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={button({ size: "lg", className: "flex-1 sm:flex-none" })}>
              {saving ? "Please wait…" : editing ? "Save changes" : "Publish listing"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Thumb({ src, cover, isNew, onRemove }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[var(--radius-control)] bg-line">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {cover && (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-[11px] font-semibold text-white">
          <Star size={11} aria-hidden="true" /> Cover
        </span>
      )}
      {isNew && !cover && (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-palm px-2 py-0.5 text-[11px] font-semibold text-white">
          New
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-clay"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
