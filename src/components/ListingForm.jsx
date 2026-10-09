"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadFiles, removeFiles, checkFiles, IMAGE_ACCEPT, VIDEO_ACCEPT } from "@/lib/uploadMedia";
import { NIGERIA, STATES, stateLabel } from "@/lib/nigeria";
import { fetchMyProfile } from "@/lib/profile";
import {
  CATEGORIES, PROPERTY_TYPES, FURNISHING, TITLE_DOCUMENTS, SIZE_UNITS, LISTER_TYPES,
  periodOptions, periodLabel, defaultPeriod, moveInCost, feeWarning,
} from "@/lib/property";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/format";
import { ImagePlus, VideoIcon, X, MapPin, Star, Home, Trees, Store } from "lucide-react";

const MAX_PHOTOS = 20;
const MAX_PHOTO_MB = 10;
const MAX_VIDEO_MB = 50; // matches the listing-videos bucket limit
const MAX_VIDEOS = 5;
const CATEGORY_ICONS = { homes: Home, land: Trees, commercial: Store };

const EMPTY = {
  category: "homes",
  listingType: "rent",
  propertyType: "flat",
  listerType: "owner",
  state: "",
  lga: "",
  area: "",
  address: "",
  title: "",
  price: "",
  pricePeriod: "year",
  bedrooms: "",
  bathrooms: "",
  toilets: "",
  furnishing: "",
  serviced: false,
  sizeValue: "",
  sizeUnit: "sqm",
  titleDocument: "",
  parkingSpaces: "",
  agencyFee: "",
  legalFee: "",
  caution: "",
  serviceCharge: "",
  description: "",
  features: "",
};

const str = (v) => (v === null || v === undefined ? "" : String(v));

function fromListing(l) {
  return {
    category: l.category || "homes",
    listingType: l.listing_type || "rent",
    propertyType: l.property_type || "flat",
    listerType: l.lister_type || "owner",
    state: l.state || "",
    lga: l.lga || "",
    // Older listings only have free-text `location`; offer it as the area.
    area: l.area || (l.state ? "" : l.location || ""),
    address: l.address || "",
    title: l.title || "",
    price: str(l.price),
    pricePeriod: l.price_period || defaultPeriod(l.listing_type),
    bedrooms: str(l.bedrooms),
    bathrooms: str(l.bathrooms),
    toilets: str(l.toilets),
    furnishing: l.furnishing || "",
    serviced: Boolean(l.serviced),
    sizeValue: str(l.size_value),
    sizeUnit: l.size_unit || "sqm",
    titleDocument: l.title_document || "",
    parkingSpaces: str(l.parking_spaces),
    agencyFee: str(l.agency_fee_percent),
    legalFee: str(l.legal_fee_percent),
    caution: str(l.caution_deposit),
    serviceCharge: str(l.service_charge),
    description: l.description || "",
    features: (l.features || []).join(", "),
  };
}

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

function Section({ title, description, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-7">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

// Card-style radio group (category, listed by).
function CardChoice({ legend, name, value, options, onChange, columns = "grid-cols-3" }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className={`grid gap-2.5 ${columns}`}>
        {options.map((o) => {
          const on = value === o.value;
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-[var(--radius-control)] border-2 p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm ${
                on ? "border-palm bg-palm-soft" : "border-line hover:border-line-strong"
              }`}
            >
              <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
              {Icon && <Icon size={20} className={on ? "text-palm" : "text-ink-muted"} aria-hidden="true" />}
              <span className="font-semibold text-ink">{o.label}</span>
              {o.blurb && <span className="text-xs text-ink-muted">{o.blurb}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Two-option segmented control (rent/sale).
function Segmented({ legend, name, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-control)] bg-cream p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-lg py-2.5 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm ${
              value === o.value ? "bg-surface text-palm shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Create (no `listing`) or edit (with `listing`) a property listing.
export default function ListingForm({ listing, userId }) {
  const router = useRouter();
  const editing = Boolean(listing);

  const [v, setValues] = useState(() => (listing ? fromListing(listing) : EMPTY));
  const initialImages = useMemo(
    () => (listing?.image_urls?.length ? listing.image_urls : listing?.image_url ? [listing.image_url] : []),
    [listing]
  );
  const [keptImages, setKeptImages] = useState(initialImages);
  const [keptVideos, setKeptVideos] = useState(listing?.video_urls || []);
  const [newImages, setNewImages] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("");

  const saving = status !== "";
  const isHomes = v.category === "homes";
  const isLand = v.category === "land";
  const isRent = v.listingType === "rent";

  const set = (key) => (e) => setValues((prev) => ({ ...prev, [key]: e.target.value }));
  const patch = (changes) => setValues((prev) => ({ ...prev, ...changes }));

  function setCategory(category) {
    const firstType = PROPERTY_TYPES.find((t) => t.category === category).value;
    patch({ category, propertyType: firstType, pricePeriod: defaultPeriod(v.listingType) });
  }

  function setListingType(listingType) {
    patch({ listingType, pricePeriod: defaultPeriod(listingType) });
  }

  // New listings start with the "I usually list as" choice from the profile.
  useEffect(() => {
    if (editing) return;
    fetchMyProfile()
      .then((p) => p?.lister_type && setValues((prev) => ({ ...prev, listerType: p.lister_type })))
      .catch(() => {});
  }, [editing]);

  // Suggest area names other listers have used in this LGA.
  useEffect(() => {
    if (!v.lga) return;
    let cancelled = false;
    supabase
      .from("listings")
      .select("area")
      .eq("lga", v.lga)
      .not("area", "is", null)
      .limit(300)
      .then(({ data }) => {
        if (cancelled) return;
        setAreaSuggestions([...new Set((data || []).map((r) => r.area?.trim()).filter(Boolean))].sort());
      });
    return () => {
      cancelled = true;
    };
  }, [v.lga]);

  // Local previews for newly picked photos; revoked when the list changes.
  const previews = useMemo(() => newImages.map((f) => URL.createObjectURL(f)), [newImages]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  // Files are checked by their actual contents (not their name) before upload.
  function rejectionMessage(rejected, maxMb, kindLabel, formats) {
    const badType = rejected.filter((r) => r.reason === "type").length;
    const tooBig = rejected.filter((r) => r.reason === "size").length;
    return [
      badType && `${badType} file(s) skipped: ${kindLabel} must be ${formats}.`,
      tooBig && `${tooBig} file(s) skipped: each must be under ${maxMb}MB.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function pickImages(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const { ok, rejected } = await checkFiles(files, "image", MAX_PHOTO_MB);
    const room = Math.max(MAX_PHOTOS - keptImages.length - newImages.length, 0);
    setNewImages((prev) => [...prev, ...ok.slice(0, room)]);
    const parts = [rejectionMessage(rejected, MAX_PHOTO_MB, "photos", "JPG, PNG, WebP or HEIC")];
    if (ok.length > room) parts.push(`You can add up to ${MAX_PHOTOS} photos.`);
    setErrors((er) => ({ ...er, photos: parts.filter(Boolean).join(" ") || undefined }));
  }

  async function pickVideos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const { ok, rejected } = await checkFiles(files, "video", MAX_VIDEO_MB);
    const room = Math.max(MAX_VIDEOS - keptVideos.length - newVideos.length, 0);
    setNewVideos((prev) => [...prev, ...ok.slice(0, room)]);
    const parts = [rejectionMessage(rejected, MAX_VIDEO_MB, "videos", "MP4, MOV or WebM")];
    if (ok.length > room) parts.push(`You can add up to ${MAX_VIDEOS} videos.`);
    setErrors((er) => ({ ...er, videos: parts.filter(Boolean).join(" ") || undefined }));
  }

  // The row as it would be saved; also drives the live cost preview.
  const row = {
    category: v.category,
    listing_type: v.listingType,
    property_type: v.propertyType,
    lister_type: v.listerType,
    state: v.state || null,
    lga: v.lga || null,
    area: v.area.trim() || null,
    location: [v.area.trim() || v.lga, stateLabel(v.state)].filter(Boolean).join(", "),
    address: v.address.trim(),
    title: v.title.trim(),
    price: Number(v.price) || 0,
    price_period: v.pricePeriod,
    bedrooms: isHomes ? num(v.bedrooms) ?? 0 : 0,
    bathrooms: isHomes ? num(v.bathrooms) : null,
    toilets: isLand ? null : num(v.toilets),
    furnishing: isHomes ? v.furnishing || null : null,
    serviced: isHomes ? v.serviced : false,
    size_value: num(v.sizeValue),
    size_unit: v.sizeValue ? (isLand ? v.sizeUnit : "sqm") : null,
    title_document: isLand ? v.titleDocument || null : null,
    parking_spaces: isLand ? null : num(v.parkingSpaces),
    agency_fee_percent: num(v.agencyFee),
    legal_fee_percent: num(v.legalFee),
    caution_deposit: isRent ? num(v.caution) : null,
    service_charge: isLand ? null : num(v.serviceCharge),
    description: v.description.trim(),
    features: v.features.split(",").map((f) => f.trim()).filter(Boolean),
  };
  const cost = moveInCost(row);
  const warning = feeWarning(row);

  function validate() {
    const er = {};
    if (!v.state) er.state = "Choose a state.";
    if (!v.lga) er.lga = "Choose an LGA.";
    if (!v.title.trim()) er.title = "Give your listing a title.";
    if (!(Number(v.price) > 0)) er.price = "Enter a price above ₦0.";
    if (isHomes && (v.bedrooms === "" || Number(v.bedrooms) < 0 || !Number.isInteger(Number(v.bedrooms))))
      er.bedrooms = "Enter a whole number of bedrooms (0 for a room or studio).";
    if (isLand && !(Number(v.sizeValue) > 0)) er.sizeValue = "Enter the plot size.";
    for (const k of ["agencyFee", "legalFee"]) {
      if (v[k] !== "" && (Number(v[k]) < 0 || Number(v[k]) > 100)) er[k] = "Enter a percentage between 0 and 100.";
    }
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
    // Saving counts as confirming the listing is current.
    const toSave = {
      ...row,
      image_url: imageUrls[0] ?? null,
      image_urls: imageUrls,
      video_urls: videoUrls,
      last_confirmed_at: new Date().toISOString(),
    };

    const { data, error } = editing
      ? await supabase.from("listings").update(toSave).eq("id", listing.id).select("id").single()
      : await supabase.from("listings").insert({ ...toSave, landlord_id: userId }).select("id").single();

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
  const typeOptions = PROPERTY_TYPES.filter((t) => t.category === v.category);
  const periods = periodOptions(v.listingType, v.category);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Section title="What are you listing?">
        <CardChoice
          legend="Category"
          name="category"
          value={v.category}
          onChange={setCategory}
          options={CATEGORIES.map((c) => ({ ...c, icon: CATEGORY_ICONS[c.value] }))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Segmented
            legend="Rent or sell"
            name="listingType"
            value={v.listingType}
            onChange={setListingType}
            options={[
              { value: "rent", label: isHomes ? "For rent" : "For rent / lease" },
              { value: "sale", label: "For sale" },
            ]}
          />
          <Field as="select" label="Property type" value={v.propertyType} onChange={set("propertyType")}>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Field>
        </div>
        <CardChoice
          legend="Who is listing?"
          name="listerType"
          value={v.listerType}
          onChange={(listerType) => patch({ listerType })}
          columns="grid-cols-2 sm:grid-cols-4"
          options={LISTER_TYPES}
        />
      </Section>

      <Section title="Location" description="Home-seekers search by state, LGA and area.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            as="select"
            label="State"
            value={v.state}
            onChange={(e) => patch({ state: e.target.value, lga: "" })}
            error={errors.state}
            required
          >
            <option value="">Choose a state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {stateLabel(s)}
              </option>
            ))}
          </Field>
          <Field
            as="select"
            label="LGA"
            value={v.lga}
            onChange={set("lga")}
            disabled={!v.state}
            error={errors.lga}
            hint={!v.state ? "Choose a state first." : undefined}
            required
          >
            <option value="">{v.state ? "Choose an LGA" : "—"}</option>
            {(NIGERIA[v.state] || []).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Field>
        </div>
        <Field
          label="Area or neighbourhood"
          icon={MapPin}
          placeholder="e.g. Lekki Phase 1, Wuse 2, Bodija"
          hint="The name people actually use for the area."
          list="area-suggestions"
          maxLength={100}
          value={v.area}
          onChange={set("area")}
        />
        <datalist id="area-suggestions">
          {(v.lga ? areaSuggestions : []).map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <Field
          label="Street address"
          optional
          placeholder="e.g. 12 Admiralty Way"
          hint="Shown on the listing so people can find the property."
          maxLength={200}
          value={v.address}
          onChange={set("address")}
        />
      </Section>

      <Section title="Details">
        {isHomes && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-5">
              <Field label="Bedrooms" type="number" inputMode="numeric" min={0} step={1} value={v.bedrooms} onChange={set("bedrooms")} error={errors.bedrooms} required />
              <Field label="Bathrooms" optional type="number" inputMode="numeric" min={0} step={1} value={v.bathrooms} onChange={set("bathrooms")} />
              <Field label="Toilets" optional type="number" inputMode="numeric" min={0} step={1} value={v.toilets} onChange={set("toilets")} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field as="select" label="Furnishing" optional value={v.furnishing} onChange={set("furnishing")}>
                <option value="">Not specified</option>
                {FURNISHING.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Field>
              <Field label="Size (sqm)" optional type="number" inputMode="numeric" min={1} value={v.sizeValue} onChange={set("sizeValue")} />
            </div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={v.serviced}
                onChange={(e) => patch({ serviced: e.target.checked })}
                className="mt-0.5 h-5 w-5 accent-[var(--color-palm)]"
              />
              <span>
                <span className="font-semibold text-ink">Serviced</span>
                <span className="block text-sm text-ink-muted">Shared power, water, security or cleaning is managed for residents.</span>
              </span>
            </label>
          </>
        )}

        {isLand && (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Plot size" type="number" inputMode="decimal" min={0} step="any" value={v.sizeValue} onChange={set("sizeValue")} error={errors.sizeValue} required />
              <Field as="select" label="Unit" value={v.sizeUnit} onChange={set("sizeUnit")}>
                {SIZE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Field>
            </div>
            <Field
              as="select"
              label="Title document"
              value={v.titleDocument}
              onChange={set("titleDocument")}
              hint="Buyers filter by title. Only choose what you can show at a viewing."
            >
              <option value="">Not specified</option>
              {TITLE_DOCUMENTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Field>
          </>
        )}

        {v.category === "commercial" && (
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            <Field label="Size (sqm)" optional type="number" inputMode="numeric" min={1} value={v.sizeValue} onChange={set("sizeValue")} />
            <Field label="Parking" optional type="number" inputMode="numeric" min={0} step={1} value={v.parkingSpaces} onChange={set("parkingSpaces")} hint="Spaces" />
            <Field label="Toilets" optional type="number" inputMode="numeric" min={0} step={1} value={v.toilets} onChange={set("toilets")} />
          </div>
        )}
      </Section>

      <Section title="Price and costs" description="Show the full cost upfront. Listings with clear costs earn more trust.">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field
            label={isRent ? "Rent (₦)" : "Price (₦)"}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={v.price}
            onChange={set("price")}
            error={errors.price}
            hint={Number(v.price) > 0 ? `${formatNaira(v.price)} ${periodLabel(v.pricePeriod)}` : undefined}
            required
          />
          <Field as="select" label="Per" value={v.pricePeriod} onChange={set("pricePeriod")} disabled={periods.length < 2}>
            {periods.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p)}
              </option>
            ))}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          <Field label="Agency fee (%)" optional type="number" inputMode="decimal" min={0} max={100} step="any" placeholder="e.g. 10" value={v.agencyFee} onChange={set("agencyFee")} error={errors.agencyFee} />
          <Field label="Legal / agreement fee (%)" optional type="number" inputMode="decimal" min={0} max={100} step="any" placeholder="e.g. 10" value={v.legalFee} onChange={set("legalFee")} error={errors.legalFee} />
          {isRent && (
            <Field label="Caution deposit (₦)" optional type="number" inputMode="numeric" min={0} step={1} value={v.caution} onChange={set("caution")} hint="Refundable" />
          )}
          {!isLand && (
            <Field label="Service charge (₦/year)" optional type="number" inputMode="numeric" min={0} step={1} value={v.serviceCharge} onChange={set("serviceCharge")} />
          )}
        </div>
        {warning && <Alert>{warning}</Alert>}

        {Number(v.price) > 0 && cost.hasExtras && (
          <div className="rounded-[var(--radius-control)] bg-cream p-4">
            <p className="text-sm font-semibold text-ink">{isRent ? "Total to move in" : "Estimated total"}</p>
            <dl className="mt-2 space-y-1 text-sm">
              {cost.rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-3 text-ink-muted">
                  <dt>{r.label}</dt>
                  <dd className="tabular-nums">{formatNaira(r.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-line-strong pt-1.5 font-bold text-ink">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatNaira(cost.total)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Section>

      <Section title="Describe it" description="Help people decide before they book a viewing.">
        <Field
          label="Title"
          placeholder={isHomes ? "e.g. 3 bedroom flat with BQ" : isLand ? "e.g. Dry 600sqm plot in a gated estate" : "e.g. Ground-floor shop on a busy road"}
          maxLength={120}
          value={v.title}
          onChange={set("title")}
          error={errors.title}
          required
        />
        <Field
          as="textarea"
          label="Description"
          optional
          rows={6}
          placeholder="What makes this worth seeing? Mention power, water, security, road access and the neighbourhood."
          maxLength={5000}
          value={v.description}
          onChange={set("description")}
        />
        <Field
          label="Features"
          optional
          placeholder={isLand ? "e.g. Dry land, Tarred road, Fenced estate" : "e.g. 24/7 power, Fenced compound, Parking for 2 cars"}
          hint="Separate each feature with a comma."
          value={v.features}
          onChange={set("features")}
        />
      </Section>

      <Section
        title="Photos and video"
        description={`Add up to ${MAX_PHOTOS} photos. The first photo is the cover. Bright, recent photos get more viewings.`}
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {keptImages.map((url, i) => (
            <Thumb key={url} src={url} cover={i === 0} onRemove={() => setKeptImages((prev) => prev.filter((u) => u !== url))} />
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
              <input type="file" accept={IMAGE_ACCEPT} multiple onChange={pickImages} className="sr-only" />
            </label>
          )}
        </div>
        {errors.photos && <p className="text-sm font-medium text-clay">{errors.photos}</p>}

        <div>
          {[
            ...keptVideos.map((url) => ({ key: url, label: "Current video", remove: () => setKeptVideos((p) => p.filter((u) => u !== url)) })),
            ...newVideos.map((f, i) => ({ key: `${f.name}-${i}`, label: f.name, remove: () => setNewVideos((p) => p.filter((_, j) => j !== i)) })),
          ].map((vid) => (
            <div key={vid.key} className="mb-2 flex items-center gap-3 rounded-[var(--radius-control)] border border-line px-3.5 py-2.5">
              <VideoIcon size={18} className="shrink-0 text-palm" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{vid.label}</span>
              <button type="button" onClick={vid.remove} aria-label={`Remove ${vid.label}`} className="rounded-full p-1.5 text-ink-muted hover:bg-clay-soft hover:text-clay">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <label className={button({ variant: "neutral", className: "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm" })}>
            <VideoIcon size={17} aria-hidden="true" /> Add a video tour
            <input type="file" accept={VIDEO_ACCEPT} multiple onChange={pickVideos} className="sr-only" />
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
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-palm px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
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
