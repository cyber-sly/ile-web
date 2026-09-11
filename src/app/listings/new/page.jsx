"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tag, MapPin, Wallet, BedDouble, ImagePlus, AlertCircle, LogIn } from "lucide-react";

export default function NewListingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [imageFile, setImageFile] = useState(null);
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

    let imageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("listings").insert({
      landlord_id: user.id,
      title,
      location,
      price: Number(price),
      bedrooms: Number(bedrooms),
      image_url: imageUrl,
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
    <div className="max-w-sm mx-auto mt-12 p-6 bg-white border border-mist rounded-xl shadow-sm">
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
          <Wallet size={16} className="text-ink/40 shrink-0" />
          <input
            type="number"
            placeholder="Price per year (₦)"
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
        <label className="flex items-center gap-2 text-sm text-ink/60">
          <ImagePlus size={16} className="text-ink/40 shrink-0" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="text-sm text-ink/70"
          />
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