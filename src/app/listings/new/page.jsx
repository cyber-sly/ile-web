"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { uploadFiles } from "@/lib/uploadMedia";
import {
  Tag, MapPin, Wallet, BedDouble, ImagePlus, VideoIcon, AlertCircle, LogIn,
  Home as HomeIcon, FileText, Sparkles,
} from "lucide-react";

export default function NewListingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [listingType, setListingType] = useState("rent");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAccessError("You must log in as a landlord to post a listing.");
        setCheckingAccess(false);
        return;
      }

      if (user.user_metadata?.role !== "landlord") {
        setAccessError("Only landlord accounts can post listings. Log in with a landlord account to continue.");
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(false);
    }

    checkAccess();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.user_metadata?.role !== "landlord") {
      setError("You must be logged in as a landlord to post a listing.");
      setLoading(false);
      return;
    }

    let imageUrls = [];
    let videoUrls = [];

    try {
      if (imageFiles.length > 0) {
        imageUrls = await uploadFiles("listing-images", user.id, imageFiles);
      }
      if (videoFiles.length > 0) {
        videoUrls = await uploadFiles("listing-videos", user.id, videoFiles);
      }
    } catch (uploadErr) {
      setError(uploadErr.message);
      setLoading(false);
      return;
    }

    const featureList = features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const { error: insertError } = await supabase.from("listings").insert({
      landlord_id: user.id,
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
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/listings");
  }

  if (checkingAccess) {
    return <p className="p-6 text-ink/60">Checking access...</p>;
  }

  if (accessError) {
    return (
      <div className="max-w-sm mx-auto mt-12 p-6 bg-white border border-mist rounded-xl shadow-sm text-center">
        <AlertCircle className="text-clay mx-auto mb-3" size={28} />
        <p className="text-ink/70 mb-4">{accessError}</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 bg-palm text-white px-4 py-2 rounded-lg font-medium hover:bg-palm-dark transition-colors"
        >
          <LogIn size={16} /> Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12 mb-12 p-6 bg-white border border-mist rounded-xl shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">Post a Listing</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <Tag size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
            placeholder="Title (e.g. 2 Bedroom Flat)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-ink outline-none w-full"
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

        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <MapPin size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
            placeholder="Location (e.g. Yaba, Lagos)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <HomeIcon size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
            placeholder="Full address (e.g. 12 Herbert Macaulay St)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="text-ink outline-none w-full"
          />
        </label>
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <Wallet size={16} className="text-ink/40 shrink-0" />
          <input
            type="number"
            placeholder={listingType === "rent" ? "Price per year (₦)" : "Sale price (₦)"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <BedDouble size={16} className="text-ink/40 shrink-0" />
          <input
            type="number"
            placeholder="Bedrooms"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>

        <label className="flex flex-col gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <span className="flex items-center gap-2 text-sm text-ink/60">
            <FileText size={16} className="text-ink/40 shrink-0" /> Story / description
          </span>
          <textarea
            placeholder="Tell renters what makes this place worth seeing..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="text-ink outline-none w-full resize-none"
          />
        </label>

        <label className="flex flex-col gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <span className="flex items-center gap-2 text-sm text-ink/60">
            <Sparkles size={16} className="text-ink/40 shrink-0" /> Features (comma-separated)
          </span>
          <input
            type="text"
            placeholder="e.g. Fenced compound, 24/7 power, Swimming pool"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            className="text-ink outline-none w-full"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink/60">
          <ImagePlus size={16} className="text-ink/40 shrink-0" />
          <span>Photos ({imageFiles.length} selected)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files))}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="ml-auto cursor-pointer text-palm text-sm font-medium hover:underline"
          >
            Choose
          </label>
        </label>

        <label className="flex items-center gap-2 text-sm text-ink/60">
          <VideoIcon size={16} className="text-ink/40 shrink-0" />
          <span>Videos ({videoFiles.length} selected)</span>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => setVideoFiles(Array.from(e.target.files))}
            className="hidden"
            id="video-upload"
          />
          <label
            htmlFor="video-upload"
            className="ml-auto cursor-pointer text-palm text-sm font-medium hover:underline"
          >
            Choose
          </label>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-palm text-white rounded-lg py-2 font-semibold hover:bg-palm-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Posting..." : "Post Listing"}
        </button>
        {error && (
          <p className="flex items-center gap-1.5 text-clay text-sm">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </form>
    </div>
  );
}
