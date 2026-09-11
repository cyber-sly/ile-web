"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { uploadFiles } from "@/lib/uploadMedia";
import {
  Tag, MapPin, Wallet, BedDouble, ImagePlus, VideoIcon, AlertCircle, X,
  Home as HomeIcon, FileText, Sparkles,
} from "lucide-react";

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [listingType, setListingType] = useState("rent");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newVideoFiles, setNewVideoFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!user || user.id !== data.landlord_id) {
        setAccessError("You can only edit listings you posted.");
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setLocation(data.location);
      setAddress(data.address || "");
      setPrice(data.price);
      setBedrooms(data.bedrooms);
      setListingType(data.listing_type || "rent");
      setDescription(data.description || "");
      setFeatures((data.features || []).join(", "));
      setExistingImageUrls(data.image_urls?.length ? data.image_urls : data.image_url ? [data.image_url] : []);
      setExistingVideoUrls(data.video_urls || []);
      setLoading(false);
    }

    fetchListing();
  }, [id]);

  function removeExistingImage(url) {
    setExistingImageUrls((prev) => prev.filter((u) => u !== url));
  }

  function removeExistingVideo(url) {
    setExistingVideoUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in to edit a listing.");
      setSaving(false);
      return;
    }

    let uploadedImageUrls = [];
    let uploadedVideoUrls = [];

    try {
      if (newImageFiles.length > 0) {
        uploadedImageUrls = await uploadFiles("listing-images", user.id, newImageFiles);
      }
      if (newVideoFiles.length > 0) {
        uploadedVideoUrls = await uploadFiles("listing-videos", user.id, newVideoFiles);
      }
    } catch (uploadErr) {
      setError(uploadErr.message);
      setSaving(false);
      return;
    }

    const imageUrls = [...existingImageUrls, ...uploadedImageUrls];
    const videoUrls = [...existingVideoUrls, ...uploadedVideoUrls];
    const featureList = features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        title,
        location,
        address,
        price: Number(price),
        bedrooms: Number(bedrooms),
        listing_type: listingType,
        description,
        features: featureList,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
        video_urls: videoUrls,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/dashboard");
  }

  if (loading) return <p className="p-6 text-ink/60">Loading...</p>;

  if (accessError) {
    return (
      <div className="max-w-sm mx-auto mt-12 p-6 bg-white border border-mist rounded-xl shadow-sm text-center">
        <AlertCircle className="text-clay mx-auto mb-3" size={28} />
        <p className="text-ink/70 mb-4">{accessError}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 bg-palm text-white px-4 py-2 rounded-lg font-medium hover:bg-palm-dark transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=70"
        alt="A Nigerian home exterior"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-ink/60" />

      <div className="hidden md:block absolute top-16 right-16 w-20 h-20 rounded-full bg-sun/30 blur-xl animate-float" />
      <div
        className="hidden md:block absolute bottom-16 left-16 w-24 h-24 rounded-full bg-palm/30 blur-xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-white mb-1 flex items-center justify-center gap-2">
            <HomeIcon size={24} /> Edit Listing
          </h1>
          <p className="text-white/80 text-sm">Keep your listing accurate and up to date.</p>
        </div>

        <form
          onSubmit={handleUpdate}
          className="flex flex-col gap-4 bg-white/95 backdrop-blur p-6 rounded-2xl border border-white/40 shadow-2xl"
        >
          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <Tag size={16} className="text-ink/40 shrink-0" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setListingType("rent")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors ${
                listingType === "rent"
                  ? "bg-palm text-white border-palm"
                  : "border-mist text-ink/60 hover:bg-mist/40"
              }`}
            >
              For Rent
            </button>
            <button
              type="button"
              onClick={() => setListingType("sale")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors ${
                listingType === "sale"
                  ? "bg-clay text-white border-clay"
                  : "border-mist text-ink/60 hover:bg-mist/40"
              }`}
            >
              For Sale
            </button>
          </div>

          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <MapPin size={16} className="text-ink/40 shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>
          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <HomeIcon size={16} className="text-ink/40 shrink-0" />
            <input
              type="text"
              placeholder="Full address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>
          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <Wallet size={16} className="text-ink/40 shrink-0" />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>
          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <BedDouble size={16} className="text-ink/40 shrink-0" />
            <input
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              required
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>

          <label className="flex flex-col gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <span className="flex items-center gap-2 text-sm text-ink/60">
              <FileText size={16} className="text-ink/40 shrink-0" /> Story / description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="text-ink outline-none w-full bg-transparent resize-none"
            />
          </label>

          <label className="flex flex-col gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <span className="flex items-center gap-2 text-sm text-ink/60">
              <Sparkles size={16} className="text-ink/40 shrink-0" /> Features (comma-separated)
            </span>
            <input
              type="text"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>

          <div className="border border-mist rounded-lg px-3 py-2">
            <p className="text-sm text-ink/60 mb-2">Current photos</p>
            {existingImageUrls.length === 0 ? (
              <p className="text-sm text-ink/40 mb-2">No photos set</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {existingImageUrls.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="Listing" className="w-full aspect-square object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute top-1 right-1 bg-ink/70 text-white rounded-full p-0.5 hover:bg-clay"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-ink/60">
              <ImagePlus size={16} className="text-ink/40 shrink-0" />
              <span>Add photos ({newImageFiles.length} selected)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewImageFiles(Array.from(e.target.files))}
              className="text-sm text-ink/70 block mt-1"
            />
          </div>

          <div className="border border-mist rounded-lg px-3 py-2">
            <p className="text-sm text-ink/60 mb-2">Current videos</p>
            {existingVideoUrls.length === 0 ? (
              <p className="text-sm text-ink/40 mb-2">No videos set</p>
            ) : (
              <div className="flex flex-col gap-2 mb-2">
                {existingVideoUrls.map((url) => (
                  <div key={url} className="relative">
                    <video src={url} controls className="w-full rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeExistingVideo(url)}
                      className="absolute top-1 right-1 bg-ink/70 text-white rounded-full p-0.5 hover:bg-clay"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-ink/60">
              <VideoIcon size={16} className="text-ink/40 shrink-0" />
              <span>Add videos ({newVideoFiles.length} selected)</span>
            </label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => setNewVideoFiles(Array.from(e.target.files))}
              className="text-sm text-ink/70 block mt-1"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-palm text-white rounded-lg py-2 font-semibold hover:bg-palm-dark disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {error && (
            <p className="flex items-center gap-1.5 text-clay text-sm">
              <AlertCircle size={16} /> {error}
            </p>
          )}
        </form>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 text-white/70 text-sm mt-4 hover:text-white transition-colors"
        >
          <HomeIcon size={14} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
