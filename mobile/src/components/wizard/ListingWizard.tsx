import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { draftFromListing, draftToRow, EMPTY_DRAFT, mediaChanges, saveListing } from "@shared/lister.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { createDraftStore, type Draft, type PhotoItem } from "@/lib/draftStore";
import { forgetLocal, removeUploaded, uploadOne, type LocalMedia } from "@/lib/media";
import { uploadAll } from "@/lib/uploadQueue";
import { STEPS, STEP_TITLES, stepErrors } from "@/lib/wizardSteps";
import { keyboardBehavior } from "@/components/keyboardBehavior";
import { useOnline } from "@/components/OfflineBanner";
import Button from "@/components/Button";
import What from "./steps/What";
import Where from "./steps/Where";
import Details from "./steps/Details";
import Price from "./steps/Price";
import Photos from "./steps/Photos";
import Review from "./steps/Review";
import { colors, fonts } from "@/theme";

const drafts = createDraftStore(AsyncStorage);

type Listing = Record<string, any>;

function startingDraft(listing: Listing | null): Draft {
  if (!listing) return { values: { ...EMPTY_DRAFT }, photos: [], videos: [], uploaded: {}, step: 0 };
  const images: string[] = listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [];
  return {
    values: draftFromListing(listing),
    photos: images.map((url) => ({ kind: "saved" as const, url })),
    videos: (listing.video_urls || []).map((url: string) => ({ kind: "saved" as const, url })),
    uploaded: {},
    step: 0,
  };
}

const localOf = (items: PhotoItem[]) => items.flatMap((p) => (p.kind === "local" ? [p.media] : []));

// The step-by-step listing form, for a new listing (no `listing`) or an edit.
export default function ListingWizard({ listing }: { listing: Listing | null }) {
  const { user } = useSession();
  const online = useOnline();
  const queryClient = useQueryClient();
  const key = listing ? `edit:${listing.id}` : "new";
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [formError, setFormError] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  // Pick up where the lister left off, if a draft was saved.
  useEffect(() => {
    let cancelled = false;
    drafts.load(key).then((saved) => {
      if (!cancelled) setDraft(saved ?? startingDraft(listing));
    });
    return () => {
      cancelled = true;
    };
  }, [key, listing]);

  // Save the draft half a second after each change.
  useEffect(() => {
    if (!draft) return;
    const t = setTimeout(() => drafts.save(key, draft), 500);
    return () => clearTimeout(t);
  }, [draft, key]);

  if (!draft) return <ActivityIndicator color={colors.palm} style={styles.loading} />;

  const step = STEPS[draft.step];
  const update = (changes: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...changes } : d));
  const set = (changes: Record<string, any>) => setDraft((d) => (d ? { ...d, values: { ...d.values, ...changes } } : d));

  function goTo(index: number) {
    setErrors({});
    setFormError("");
    update({ step: index });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function next() {
    const found = stepErrors(step, draft!.values, draft!.photos.length);
    setErrors(found);
    if (Object.keys(found).length) return;
    goTo(draft!.step + 1);
  }

  async function publish() {
    const d = draft!;
    const found = stepErrors("review", d.values, d.photos.length);
    setErrors(found);
    if (Object.keys(found).length || !user) return;
    setFormError("");

    // Upload new photos and videos one at a time; ones already uploaded are skipped.
    const local = [...localOf(d.photos), ...localOf(d.videos)];
    const total = local.length;
    setStatus(total ? `Uploading (0 of ${total})…` : "Saving…");
    const { urls: uploaded, failed } = await uploadAll<LocalMedia>(
      local.map((media) => ({ key: media.id, media })),
      (media) => uploadOne(media, user.id),
      { done: d.uploaded, onProgress: (n, t) => setStatus(`Uploading (${n} of ${t})…`) }
    );
    update({ uploaded });
    if (failed.length) {
      setStatus("");
      setFormError(`${failed.length} file${failed.length === 1 ? "" : "s"} didn't upload. Check your connection and tap Publish again.`);
      return;
    }

    // Photos in the order on screen; the first is the cover.
    const urlOf = (p: PhotoItem) => (p.kind === "saved" ? p.url : uploaded[p.media.id]);
    const imageUrls = d.photos.map(urlOf);
    const videoUrls = d.videos.map(urlOf);
    const keptImages = d.photos.flatMap((p) => (p.kind === "saved" ? [p.url] : []));
    const keptVideos = d.videos.flatMap((p) => (p.kind === "saved" ? [p.url] : []));
    const original = startingDraft(listing);
    const removedImages = mediaChanges(original.photos.map(urlOf), keptImages, []).removed;
    const removedVideos = mediaChanges(original.videos.map(urlOf), keptVideos, []).removed;

    setStatus(listing ? "Saving changes…" : "Publishing…");
    try {
      const id = await saveListing(
        supabase,
        {
          ...draftToRow(d.values),
          image_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
          video_urls: videoUrls,
          // Saving counts as confirming the listing is current.
          last_confirmed_at: new Date().toISOString(),
        },
        { id: listing?.id, userId: user.id }
      );
      removeUploaded("listing-images", removedImages);
      removeUploaded("listing-videos", removedVideos);
      forgetLocal(local);
      await drafts.clear(key);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["listing", String(id)] });
      router.replace({ pathname: "/listing/[id]", params: { id: String(id) } });
    } catch (e) {
      setFormError(friendlyError(e));
    } finally {
      setStatus("");
    }
  }

  async function discard() {
    forgetLocal([...localOf(draft!.photos), ...localOf(draft!.videos)]);
    await drafts.clear(key);
    setDraft(startingDraft(listing));
    setErrors({});
  }

  const stepProps = { values: draft.values, set, errors };
  const last = draft.step === STEPS.length - 1;
  const busy = status !== "";

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior(Platform.OS)}>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${((draft.step + 1) / STEPS.length) * 100}%` }]} />
      </View>
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepCount}>
          Step {draft.step + 1} of {STEPS.length}
        </Text>
        <Text style={styles.title}>{STEP_TITLES[step]}</Text>
        {step === "what" && <What {...stepProps} />}
        {step === "where" && <Where {...stepProps} />}
        {step === "details" && <Details {...stepProps} />}
        {step === "price" && <Price {...stepProps} />}
        {step === "photos" && (
          <Photos photos={draft.photos} videos={draft.videos} setPhotos={(photos) => update({ photos })} setVideos={(videos) => update({ videos })} error={errors.photos} />
        )}
        {step === "review" && <Review values={draft.values} photoCount={draft.photos.length} videoCount={draft.videos.length} errors={errors} goTo={goTo} />}
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        {!listing && draft.step === 0 && (draft.values.title || draft.photos.length > 0) ? (
          <Button label="Start over" variant="ghost" onPress={discard} />
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {draft.step > 0 && (
          <View style={styles.flex}>
            <Button label="Back" variant="secondary" disabled={busy} onPress={() => goTo(draft.step - 1)} />
          </View>
        )}
        <View style={styles.grow}>
          {last ? (
            <Button
              label={busy ? status : !online ? "This needs a connection" : listing ? "Save changes" : "Publish"}
              loading={false}
              disabled={busy || !online}
              onPress={publish}
            />
          ) : (
            <Button label="Next" onPress={next} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 2 },
  loading: { marginTop: 40 },
  progress: { height: 4, backgroundColor: colors.line },
  progressFill: { height: 4, backgroundColor: colors.palm },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  stepCount: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.inkMuted },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, marginTop: -8 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  footer: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
