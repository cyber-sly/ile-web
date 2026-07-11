"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tag, MapPin, Wallet, BedDouble, ImagePlus, AlertCircle } from "lucide-react";

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTitle(data.title);
        setLocation(data.location);
        setPrice(data.price);
        setBedrooms(data.bedrooms);
        setCurrentImageUrl(data.image_url);
      }
      setLoading(false);
    }

    fetchListing();
  }, [id]);

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

    let imageUrl = currentImageUrl;

    if (newImageFile) {
      const fileExt = newImageFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filePath, newImageFile);

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        title,
        location,
        price: Number(price),
        bedrooms: Number(bedrooms),
        image_url: imageUrl,
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

  return (
    <div className="max-w-sm mx-auto mt-12 p-6 bg-white border border-mist rounded-xl shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">Edit Listing</h1>
      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <Tag size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
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
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>

        <div>
          <p className="text-sm text-ink/60 mb-2">Current image</p>
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Current listing"
              className="w-full h-40 object-cover rounded-lg mb-2"
            />
          ) : (
            <p className="text-sm text-ink/40 mb-2">No image set</p>
          )}
          <label className="flex items-center gap-2 text-sm text-ink/60">
            <ImagePlus size={16} className="text-ink/40 shrink-0" />
            <span>Replace image (optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewImageFile(e.target.files[0])}
            className="text-sm text-ink/70 block mt-1"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-palm text-white rounded-lg py-2 font-semibold hover:bg-palm-dark disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
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