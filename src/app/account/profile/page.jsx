"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser, isLandlord } from "@/lib/useUser";
import {
  LANGUAGES, REGISTRATION_BODIES, OCCUPATIONS, MOVE_IN,
  fetchMyProfile, saveProfile, uploadAvatar, profileCompleteness,
} from "@/lib/profile";
import { LISTER_TYPES } from "@/lib/property";
import { NIGERIA, STATES, stateLabel } from "@/lib/nigeria";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import Avatar from "@/components/Avatar";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { ArrowLeft, Camera, X, Plus } from "lucide-react";

const EMPTY = {
  full_name: "", bio: "", languages: [], home_state: "", lister_type: "", business_name: "",
  office_address: "", areas_covered: [], listing_since: "", registration_body: "", registration_number: "",
  occupation: "", move_in_timeline: "",
};

function Section({ title, description, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

export default function EditProfilePage() {
  const user = useUser();
  const [profile, setProfile] = useState(undefined);
  const [v, setV] = useState(EMPTY);
  const [avatar, setAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showLister, setShowLister] = useState(false);
  const [areaState, setAreaState] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchMyProfile()
      .then((p) => {
        setProfile(p || {});
        setAvatar(p?.avatar_url || null);
        setV(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p?.[k] ?? EMPTY[k] ?? ""])));
        setShowLister(isLandlord(user) || Boolean(p?.lister_type));
      })
      .catch((e) => {
        setProfile({});
        setMessage({ tone: "error", text: e.message });
      });
  }, [user]);

  const set = (key) => (e) => setV((prev) => ({ ...prev, [key]: e.target.value }));
  const toggleIn = (key, item) =>
    setV((prev) => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter((x) => x !== item) : [...prev[key], item],
    }));

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadAvatar(user.id, file, avatar);
      await saveProfile(user.id, { avatar_url: url });
      setAvatar(url);
      setMessage({ tone: "success", text: "Profile photo updated." });
    } catch (err) {
      setMessage({ tone: "error", text: err.message });
    }
    setUploading(false);
  }

  async function removePhoto() {
    setUploading(true);
    try {
      await saveProfile(user.id, { avatar_url: null });
      setAvatar(null);
    } catch (err) {
      setMessage({ tone: "error", text: err.message });
    }
    setUploading(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!v.full_name.trim()) {
      setMessage({ tone: "error", text: "Add your name." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const year = Number(v.listing_since);
    const changes = {
      full_name: v.full_name.trim(),
      bio: v.bio.trim() || null,
      languages: v.languages,
      home_state: v.home_state || null,
      occupation: v.occupation || null,
      move_in_timeline: v.move_in_timeline || null,
      ...(showLister
        ? {
            lister_type: v.lister_type || null,
            business_name: v.business_name.trim() || null,
            office_address: v.office_address.trim() || null,
            areas_covered: v.areas_covered,
            listing_since: year >= 1950 && year <= new Date().getFullYear() ? year : null,
            registration_body: v.registration_body || null,
            registration_number: v.registration_number.trim() || null,
          }
        : {}),
    };
    try {
      await saveProfile(user.id, changes);
      setProfile((p) => ({ ...p, ...changes, avatar_url: avatar }));
      setMessage({ tone: "success", text: "Profile saved." });
    } catch (err) {
      setMessage({ tone: "error", text: err.message });
    }
    setSaving(false);
  }

  if (user === undefined || (user && profile === undefined)) return <PageSkeleton />;
  if (!user) {
    return (
      <AccessWall title="Log in to edit your profile" primary={{ href: "/login?next=/account/profile", label: "Log in" }}>
        Your profile helps people know who they&apos;re dealing with.
      </AccessWall>
    );
  }

  const business = v.lister_type === "agent" || v.lister_type === "developer";
  const { percent, missing } = profileCompleteness({ ...v, avatar_url: avatar }, showLister);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Account
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">Edit profile</h1>

      <div className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Profile {percent}% complete</span>
          {showLister && percent < 100 && <span className="text-ink-muted">Complete profiles get more viewing requests</span>}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-palm transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
        {missing.length > 0 && <p className="mt-2 text-xs text-ink-muted">Still to add: {missing.join(", ")}.</p>}
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
        <Section title="About you">
          <div className="flex items-center gap-4">
            <Avatar src={avatar} name={v.full_name} size="lg" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={button({ variant: "neutral", size: "sm" })}>
                <Camera size={15} aria-hidden="true" /> {uploading ? "Uploading…" : avatar ? "Change photo" : "Add photo"}
              </button>
              {avatar && (
                <button type="button" onClick={removePhoto} disabled={uploading} className={button({ variant: "ghost", size: "sm" })}>
                  Remove
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={onPhoto} className="sr-only" />
            </div>
          </div>
          <p className="-mt-2 text-xs text-ink-muted">A clear photo of your face (or your agency logo) builds trust.</p>
          <Field label="Name" maxLength={80} value={v.full_name} onChange={set("full_name")} required />
          <Field
            as="textarea"
            label="Short bio"
            optional
            rows={3}
            maxLength={300}
            placeholder={showLister ? "e.g. Family-run agency helping people find homes in Lekki and Ajah since 2015." : "e.g. Software engineer relocating to Lagos."}
            hint={`${300 - v.bio.length} characters left`}
            value={v.bio}
            onChange={set("bio")}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">
              Languages you speak <span className="font-normal text-ink-muted">· optional</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const on = v.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleIn("languages", lang)}
                    disabled={!on && v.languages.length >= 8}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                      on ? "bg-palm text-white" : "border border-line-strong text-ink-muted hover:text-ink"
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Field as="select" label="State you live in" optional hint="Private. Used to show you nearby property first." value={v.home_state} onChange={set("home_state")}>
            <option value="">Prefer not to say</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{stateLabel(s)}</option>
            ))}
          </Field>
        </Section>

        <Section
          title="When you book viewings"
          description="Optional. Only shown to listers you book a viewing with. It can help them say yes faster."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field as="select" label="Occupation" optional value={v.occupation} onChange={set("occupation")}>
              <option value="">Prefer not to say</option>
              {OCCUPATIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Field>
            <Field as="select" label="Planning to move" optional value={v.move_in_timeline} onChange={set("move_in_timeline")}>
              <option value="">Prefer not to say</option>
              {MOVE_IN.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Field>
          </div>
        </Section>

        {showLister ? (
          <Section title="Listing property" description="Shown on your public profile and your listings.">
            <Field as="select" label="I usually list as" value={v.lister_type} onChange={set("lister_type")} hint="Pre-fills new listings. You can still change it per listing.">
              <option value="">Choose one</option>
              {LISTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Field>
            {business && (
              <>
                <Field label="Business or agency name" optional maxLength={100} placeholder="e.g. Adeyemi Homes" value={v.business_name} onChange={set("business_name")} />
                <Field label="Office address" optional maxLength={200} hint="Public. Only add a business address, never your home." value={v.office_address} onChange={set("office_address")} />
              </>
            )}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">
                Areas you cover <span className="font-normal text-ink-muted">· up to 15</span>
              </p>
              {v.areas_covered.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {v.areas_covered.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-palm-soft py-1 pl-3 pr-1.5 text-sm font-semibold text-palm">
                      {a}
                      <button type="button" onClick={() => toggleIn("areas_covered", a)} aria-label={`Remove ${a}`} className="rounded-full p-0.5 hover:bg-palm/15">
                        <X size={14} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {v.areas_covered.length < 15 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label>
                    <span className="sr-only">State</span>
                    <select value={areaState} onChange={(e) => setAreaState(e.target.value)} className="h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-ink">
                      <option value="">Choose a state</option>
                      {STATES.map((s) => (
                        <option key={s} value={s}>{stateLabel(s)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">LGA</span>
                    <select
                      value=""
                      disabled={!areaState}
                      onChange={(e) => {
                        const area = e.target.value === "*" ? `All of ${stateLabel(areaState)}` : `${e.target.value}, ${stateLabel(areaState)}`;
                        if (!v.areas_covered.includes(area)) setV((p) => ({ ...p, areas_covered: [...p.areas_covered, area] }));
                      }}
                      className="h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-ink disabled:opacity-50"
                    >
                      <option value="">{areaState ? "Add an LGA" : "—"}</option>
                      {areaState && <option value="*">All of {stateLabel(areaState)}</option>}
                      {(NIGERIA[areaState] || []).map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <Field
              label="Listing property since"
              optional
              type="number"
              inputMode="numeric"
              min={1950}
              max={new Date().getFullYear()}
              placeholder="e.g. 2015"
              value={v.listing_since}
              onChange={set("listing_since")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field as="select" label="Professional registration" optional value={v.registration_body} onChange={set("registration_body")}>
                <option value="">None</option>
                {REGISTRATION_BODIES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Field>
              <Field
                label="Registration number"
                optional
                maxLength={50}
                disabled={!v.registration_body}
                hint="Private. Your profile shows only which body you're registered with."
                value={v.registration_number}
                onChange={set("registration_number")}
              />
            </div>
          </Section>
        ) : (
          <button type="button" onClick={() => setShowLister(true)} className={button({ variant: "neutral", className: "self-start" })}>
            <Plus size={16} aria-hidden="true" /> I also list property
          </button>
        )}

        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className={button({ size: "lg" })}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          {showLister && (
            <Link href={`/u/${user.id}`} className={button({ variant: "ghost", size: "lg" })}>
              View public profile
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
