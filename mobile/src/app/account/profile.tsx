import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, MapPin, Trash2, UserRound, X } from "lucide-react-native";
import { fetchMyProfile, formToProfileChanges, profileToForm, saveProfile, validateProfileForm } from "@shared/account.js";
import { LANGUAGES, MOVE_IN, OCCUPATIONS, REGISTRATION_BODIES } from "@shared/profileDisplay.js";
import { LISTER_TYPES } from "@shared/property.js";
import { STATES, stateLabel } from "@shared/nigeria.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import { isLister, useSession } from "@/lib/useSession";
import { changeAvatar, pickAvatar, removeAvatar } from "@/lib/avatar";
import { keyboardBehavior } from "@/components/keyboardBehavior";
import Field from "@/components/Field";
import Chip from "@/components/Chip";
import SelectField from "@/components/SelectField";
import Button from "@/components/Button";
import Screen from "@/components/Screen";
import { colors, fonts, radius } from "@/theme";

type Form = Record<string, any>;
type Option = { value: string; label: string };

// Edit profile: photo, about you, and (for listers) business details.
export default function EditProfileScreen() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const profile = useQuery({ queryKey: ["my-profile", userId], queryFn: () => fetchMyProfile(supabase), enabled: Boolean(userId), staleTime: 0 });

  if (!user) return <Screen title="Log in to edit your profile" />;
  if (profile.isPending) return <ActivityIndicator color={colors.palm} style={{ marginTop: 40 }} />;
  if (profile.isError) {
    return (
      <Screen title="Couldn't load your profile" subtitle="Check your connection and try again.">
        <Button label="Try again" onPress={() => profile.refetch()} />
      </Screen>
    );
  }
  return <ProfileForm userId={userId} profile={profile.data || {}} showLister={isLister(user) || Boolean(profile.data?.lister_type)} />;
}

function ProfileForm({ userId, profile, showLister }: { userId: string; profile: Record<string, any>; showLister: boolean }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState<Form>(() => profileToForm(profile));
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url || null);
  const [area, setArea] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const errors = validateProfileForm(v) as unknown as Record<string, string>;

  const set = (changes: Form) => setV((prev) => ({ ...prev, ...changes }));
  const toggleIn = (key: string, item: string) => set({ [key]: v[key].includes(item) ? v[key].filter((x: string) => x !== item) : [...v[key], item] });

  async function photo(source: "camera" | "library") {
    setMessage(null);
    try {
      const uri = await pickAvatar(source);
      if (uri === "denied") return setMessage({ tone: "error", text: "Allow camera access in Settings to take a photo." });
      if (!uri) return;
      setPhotoBusy(true);
      setAvatar(await changeAvatar(userId, uri, avatar));
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
      setMessage({ tone: "success", text: "Profile photo updated." });
    } catch (e) {
      setMessage({ tone: "error", text: friendlyError(e) });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function dropPhoto() {
    setPhotoBusy(true);
    setMessage(null);
    try {
      await removeAvatar(userId, avatar);
      setAvatar(null);
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    } catch (e) {
      setMessage({ tone: "error", text: friendlyError(e) });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    const problems = Object.values(errors);
    if (problems.length) return setMessage({ tone: "error", text: problems[0] });
    setSaving(true);
    setMessage(null);
    try {
      await saveProfile(supabase, userId, formToProfileChanges(v, showLister));
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
      setMessage({ tone: "success", text: "Profile saved." });
      router.back();
    } catch (e) {
      setMessage({ tone: "error", text: friendlyError(e) });
    } finally {
      setSaving(false);
    }
  }

  const states = STATES.map((s: string) => ({ value: s, label: stateLabel(s) }));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior(Platform.OS)}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.photoRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} cachePolicy="disk" alt="Your profile photo" />
          ) : (
            <View style={[styles.avatar, styles.initial]}>
              <Text style={styles.initialText}>{(v.full_name || "?").charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.photoButtons}>
            {photoBusy ? <ActivityIndicator color={colors.palm} /> : null}
            <PhotoButton Icon={Camera} label="Take photo" onPress={() => photo("camera")} disabled={photoBusy} />
            <PhotoButton Icon={ImagePlus} label="Choose photo" onPress={() => photo("library")} disabled={photoBusy} />
            {avatar ? <PhotoButton Icon={Trash2} label="Remove" onPress={dropPhoto} disabled={photoBusy} /> : null}
          </View>
        </View>

        <Text style={styles.section}>About you</Text>
        <Field label="Name" icon={UserRound} value={v.full_name} onChangeText={(full_name) => set({ full_name })} maxLength={80} error={errors.full_name} />
        <Field label="Short bio" optional value={v.bio} onChangeText={(bio) => set({ bio })} multiline maxLength={300} hint={`${v.bio.length}/300`} />
        <Text style={styles.label}>Languages you speak</Text>
        <View style={styles.chips}>
          {(LANGUAGES as string[]).map((l) => (
            <Chip key={l} label={l} selected={v.languages.includes(l)} onPress={() => toggleIn("languages", l)} />
          ))}
        </View>
        {errors.languages ? <Text style={styles.error}>{errors.languages}</Text> : null}
        <SelectField label="State you live in (private)" value={v.home_state} options={states} onChange={(home_state) => set({ home_state })} placeholder="Not stated" />

        {!showLister && (
          <>
            <Text style={styles.label}>Occupation (shown only to listers you book with)</Text>
            <View style={styles.chips}>
              {(OCCUPATIONS as Option[]).map((o) => (
                <Chip key={o.value} label={o.label} selected={v.occupation === o.value} onPress={() => set({ occupation: v.occupation === o.value ? "" : o.value })} />
              ))}
            </View>
            <Text style={styles.label}>Planning to move</Text>
            <View style={styles.chips}>
              {(MOVE_IN as Option[]).map((o) => (
                <Chip key={o.value} label={o.label} selected={v.move_in_timeline === o.value} onPress={() => set({ move_in_timeline: v.move_in_timeline === o.value ? "" : o.value })} />
              ))}
            </View>
          </>
        )}

        {showLister && (
          <>
            <Text style={styles.section}>As a lister</Text>
            <Text style={styles.label}>I usually list as</Text>
            <View style={styles.chips}>
              {(LISTER_TYPES as Option[]).map((o) => (
                <Chip key={o.value} label={o.label} selected={v.lister_type === o.value} onPress={() => set({ lister_type: o.value })} />
              ))}
            </View>
            <Field label="Business or agency name" optional value={v.business_name} onChangeText={(business_name) => set({ business_name })} maxLength={100} />
            <Field
              label="Office address (optional)"
              value={v.office_address}
              onChangeText={(office_address) => set({ office_address })}
              maxLength={200}
              hint="Public. Only add a business address, never your home."
            />
            <Text style={styles.label}>Areas you cover</Text>
            <View style={styles.chips}>
              {v.areas_covered.map((a: string) => (
                <Pressable key={a} accessibilityRole="button" accessibilityLabel={`Remove ${a}`} onPress={() => toggleIn("areas_covered", a)} style={styles.areaChip}>
                  <Text style={styles.areaText}>{a}</Text>
                  <X color={colors.palm} size={14} />
                </Pressable>
              ))}
            </View>
            <View style={styles.addRow}>
              <View style={styles.flex}>
                <Field label="Add an area" icon={MapPin} value={area} onChangeText={setArea} maxLength={60} placeholder="e.g. Lekki" />
              </View>
              <View style={styles.addButton}>
                <Button
                  label="Add"
                  variant="secondary"
                  disabled={!area.trim() || v.areas_covered.length >= 15}
                  onPress={() => {
                    if (!v.areas_covered.includes(area.trim())) set({ areas_covered: [...v.areas_covered, area.trim()] });
                    setArea("");
                  }}
                />
              </View>
            </View>
            <Field
              label="Listing property since (year)"
              value={v.listing_since}
              onChangeText={(listing_since) => set({ listing_since: listing_since.replace(/[^0-9]/g, "").slice(0, 4) })}
              keyboardType="number-pad"
            />
            <Text style={styles.label}>Professional registration (optional)</Text>
            <View style={styles.chips}>
              {(REGISTRATION_BODIES as Option[]).map((o) => (
                <Chip key={o.value} label={o.label} selected={v.registration_body === o.value} onPress={() => set({ registration_body: v.registration_body === o.value ? "" : o.value })} />
              ))}
            </View>
            {v.registration_body ? (
              <Field
                label="Registration number (private)"
                value={v.registration_number}
                onChangeText={(registration_number) => set({ registration_number })}
                maxLength={50}
              />
            ) : null}
          </>
        )}

        {message ? <Text style={message.tone === "error" ? styles.error : styles.success}>{message.text}</Text> : null}
        <Button label="Save profile" loading={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PhotoButton({ Icon, label, onPress, disabled }: { Icon: typeof Camera; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.photoButton, disabled && styles.dim]}>
      <Icon color={colors.palm} size={16} />
      <Text style={styles.photoButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 32, color: colors.palm },
  photoButtons: { flex: 1, gap: 8 },
  photoButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  photoButtonText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  dim: { opacity: 0.5 },
  section: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 8 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  areaChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.palmSoft },
  areaText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.palm },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  addButton: { width: 90 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  success: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.palm },
});
